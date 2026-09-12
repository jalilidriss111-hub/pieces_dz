"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Message {
  id: string;
  sender_id?: string;
  receiver_id?: string;
  content?: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  deleted_for_user_1?: string | null;
  deleted_for_user_2?: string | null;
}

interface ChatProps {
  currentUserId?: string;
  receiverId?: string;
  shopId?: string;
}

export default function Chat({ currentUserId, receiverId, shopId }: ChatProps) {
  const supabase = createClient();
  const [activeUserId, setActiveUserId] = useState<string | null>(currentUserId || null);
  const [resolvedReceiverId, setResolvedReceiverId] = useState<string | null>(receiverId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // جلب المستخدم الحالي
  useEffect(() => {
    const fetchUser = async () => {
      if (currentUserId) {
        setActiveUserId(currentUserId);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) setActiveUserId(data.user.id);
    };
    fetchUser();
  }, [currentUserId]);

  // جلب الطرف الآخر إذا مررنا shopId
  useEffect(() => {
    if (receiverId) {
      setResolvedReceiverId(receiverId);
      return;
    }
    if (shopId) {
      const fetchShopOwner = async () => {
        const { data } = await (supabase.from("shops") as any)
          .select("owner_id, user_id")
          .eq("id", shopId)
          .maybeSingle();
        if (data) {
          setResolvedReceiverId(data.owner_id || data.user_id);
        }
      };
      fetchShopOwner();
    }
  }, [shopId, receiverId]);

  // التحقق من حالة الحظر
  useEffect(() => {
    if (!activeUserId || !resolvedReceiverId) return;

    const checkBlockStatus = async () => {
      const { data: blockOut } = await (supabase.from("user_blocks") as any)
        .select("*")
        .eq("blocker_id", activeUserId)
        .eq("blocked_id", resolvedReceiverId)
        .maybeSingle();
      setIsBlocked(!!blockOut);

      const { data: blockIn } = await (supabase.from("user_blocks") as any)
        .select("*")
        .eq("blocker_id", resolvedReceiverId)
        .eq("blocked_id", activeUserId)
        .maybeSingle();
      setIsBlockedByThem(!!blockIn);
    };

    checkBlockStatus();
  }, [activeUserId, resolvedReceiverId]);

  // تبديل حالة الحظر
  const toggleBlockUser = async () => {
    if (!activeUserId || !resolvedReceiverId) return;

    if (isBlocked) {
      await (supabase.from("user_blocks") as any)
        .delete()
        .eq("blocker_id", activeUserId)
        .eq("blocked_id", resolvedReceiverId);
      setIsBlocked(false);
      alert("تم فك الحظر بنجاح.");
    } else {
      await (supabase.from("user_blocks") as any).insert([
        { blocker_id: activeUserId, blocked_id: resolvedReceiverId }
      ]);
      setIsBlocked(true);
      alert("تم حظر المستخدم بنجاح.");
    }
  };

  // حذف المحادثة بالكامل من جهتك أنت فقط (Delete Chat)
  const deleteChatForMe = async () => {
    if (!activeUserId || !resolvedReceiverId) return;
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة من عندك؟")) return;

    const now = new Date().toISOString();
    const isUser1 = activeUserId < resolvedReceiverId;
    const columnToUpdate = isUser1 ? "deleted_for_user_1" : "deleted_for_user_2";

    const { error } = await (supabase.from("messages") as any)
      .update({ [columnToUpdate]: now })
      .or(
        `and(sender_id.eq.${activeUserId},receiver_id.eq.${resolvedReceiverId}),and(sender_id.eq.${resolvedReceiverId},receiver_id.eq.${activeUserId})`
      );

    if (!error) {
      setMessages([]);
      alert("تم حذف المحادثة من جهتك.");
    } else {
      alert("حدث خطأ أثناء حذف المحادثة.");
    }
  };

  // جلب الرسائل مع مراعاة وقت الحذف
  useEffect(() => {
    if (!activeUserId || !resolvedReceiverId) return;

    const fetchMessages = async () => {
      const isUser1 = activeUserId < resolvedReceiverId;
      const columnToCheck = isUser1 ? "deleted_for_user_1" : "deleted_for_user_2";

      const { data } = await (supabase.from("messages") as any)
        .select("*")
        .or(
          `and(sender_id.eq.${activeUserId},receiver_id.eq.${resolvedReceiverId}),and(sender_id.eq.${resolvedReceiverId},receiver_id.eq.${activeUserId})`
        )
        .order("created_at", { ascending: true });

      if (data) {
        const filtered = data.filter((msg: Message) => {
          const deleteTime = msg[columnToCheck as keyof Message];
          if (!deleteTime) return true;
          return new Date(msg.created_at) > new Date(deleteTime as string);
        });
        setMessages(filtered);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel("chat_room_delete_feature")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === activeUserId && msg.receiver_id === resolvedReceiverId) ||
            (msg.sender_id === resolvedReceiverId && msg.receiver_id === activeUserId)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUserId, resolvedReceiverId]);

  const uploadFile = async (file: Blob | File, folder: string): Promise<string | null> => {
    setIsUploading(true);
    const fileType = file.type || "audio/mp4";
    const ext = folder === "voice" ? "m4a" : "jpg";
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { data } = await supabase.storage.from("chat_media").upload(fileName, file, { contentType: fileType });
    setIsUploading(false);
    if (!data) return null;

    const { data: publicData } = supabase.storage.from("chat_media").getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if ((!content?.trim() && !mediaUrl) || isBlocked || isBlockedByThem) return;

    const payload = {
      sender_id: activeUserId,
      receiver_id: resolvedReceiverId,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };

    const { error } = await (supabase.from("messages") as any).insert([payload]);
    if (!error) setText("");
  };

  const startRecording = async () => {
    if (isBlocked || isBlockedByThem) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported("audio/mp4") ? { mimeType: "audio/mp4" } : { mimeType: "audio/webm" };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const voiceUrl = await uploadFile(audioBlob, "voice");
        if (voiceUrl) sendMessage("", voiceUrl, "voice");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("تعذر الوصول للميكروفون");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] max-w-2xl mx-auto border border-slate-800 rounded-3xl bg-slate-950 text-slate-100 shadow-2xl overflow-hidden font-sans" dir="rtl">
      {/* Header مع أزرار الحظر وحذف المحادثة */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-base font-semibold">محادثة خاصة</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteChatForMe}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Delete Chat
          </button>
          <button
            onClick={toggleBlockUser}
            className={`text-xs px-3 py-1.5 rounded-xl border transition ${
              isBlocked
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {isBlocked ? "Unblock" : "Block"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            لا توجد رسائل حالياً...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === activeUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                  {msg.content && <p>{msg.content}</p>}
                  {msg.media_type === "image" && msg.media_url && (
                    <img src={msg.media_url} alt="مرفق" className="mt-2 rounded-xl max-h-56 w-full object-cover" />
                  )}
                  {msg.media_type === "voice" && msg.media_url && (
                    <audio controls src={msg.media_url} className="w-full h-8 mt-1" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input or Block Warning */}
      {isBlocked || isBlockedByThem ? (
        <div className="p-4 bg-slate-900 text-center text-xs text-red-400 border-t border-slate-800">
          {isBlocked ? "لقد قمت بحظر هذا المستخدم." : "لا يمكنك إرسال رسائل لهذا المستخدم."}
        </div>
      ) : (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <button onClick={isRecording ? stopRecording : startRecording} className="p-2 text-slate-400 hover:text-white">
            🎙️
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
          />
          <button onClick={() => sendMessage(text)} className="px-4 py-2 bg-blue-600 rounded-xl text-sm text-white font-medium">
            إرسال
          </button>
        </div>
      )}
    </div>
  );
}
