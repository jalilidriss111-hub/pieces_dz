"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Message {
  id: string;
  sender_id?: string;
  receiver_id?: string;
  content?: string;
  media_url?: string;
  media_type?: "image" | "voice" | "file" | string;
  created_at: string;
}

interface ChatProps {
  currentUserId?: string;
  receiverId?: string;
  shopId?: string;
  chatRoomId?: string;
}

interface ShopRecord {
  owner_id?: string;
  user_id?: string;
}

export default function Chat({
  currentUserId,
  receiverId,
  shopId,
  chatRoomId = "default_room",
}: ChatProps) {
  const supabase = createClient();

  const [activeUserId, setActiveUserId] = useState<string | null>(currentUserId || null);
  const [resolvedReceiverId, setResolvedReceiverId] = useState<string | null>(receiverId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
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

  // 1. جلب ID المستخدم الحالي تلقائياً إذا لم يُمرّر
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (currentUserId) {
        setActiveUserId(currentUserId);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setActiveUserId(data.user.id);
      }
    };
    fetchCurrentUser();
  }, [currentUserId]);

  // 2. جلب ID صاحب المحل (Owner ID) عند تمرير shopId
  useEffect(() => {
    if (receiverId) {
      setResolvedReceiverId(receiverId);
      return;
    }

    if (shopId) {
      const fetchShopOwner = async () => {
        const { data, error } = await (supabase.from("shops") as any)
          .select("owner_id, user_id")
          .eq("id", shopId)
          .maybeSingle();

        if (data) {
          const shopData = data as ShopRecord;
          const ownerId = shopData.owner_id || shopData.user_id;
          if (ownerId) {
            setResolvedReceiverId(ownerId);
          }
        } else if (error) {
          console.error("خطأ في جلب صاحب المحل:", error);
        }
      };

      fetchShopOwner();
    }
  }, [shopId, receiverId]);

  // 3. جلب الرسائل والتحديث الفوري (Realtime)
  useEffect(() => {
    if (!activeUserId) return;

    const fetchMessages = async () => {
      let query = (supabase.from("messages") as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (resolvedReceiverId && activeUserId) {
        query = query.or(
          `and(sender_id.eq.${activeUserId},receiver_id.eq.${resolvedReceiverId}),and(sender_id.eq.${resolvedReceiverId},receiver_id.eq.${activeUserId})`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("خطأ في جلب الرسائل:", error);
      } else if (data) {
        setMessages(data as Message[]);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel("chat_room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new as Message;
          if (
            !resolvedReceiverId ||
            newMessage.sender_id === resolvedReceiverId ||
            newMessage.sender_id === activeUserId
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, resolvedReceiverId, activeUserId]);

  // 4. رفع الملفات إلى Supabase Storage مع توافقية الصغ على كل الأجهزة
  const uploadFile = async (file: Blob | File, folder: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileType = file.type || (folder === "voice" ? "audio/mp4" : "image/jpeg");

      let ext = "bin";
      if (folder === "voice") {
        ext = fileType.includes("mp4") ? "m4a" : fileType.includes("aac") ? "aac" : "webm";
      } else {
        ext = fileType.split("/")[1]?.split(";")[0] || "jpg";
      }

      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("chat_media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: fileType,
        });

      if (error) {
        console.error("خطأ Supabase Storage:", error);
        alert(`خطأ في رفع الملف: ${error.message}`);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from("chat_media")
        .getPublicUrl(data.path);

      return publicData.publicUrl;
    } catch (err: any) {
      console.error("فشل الرفع:", err);
      alert(`تعذر الرفع: ${err?.message || "خطأ غير معروف"}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // 5. إرسال الرسائل
  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if (!content?.trim() && !mediaUrl) return;

    if (!activeUserId) {
      alert("تعذر تحديد هوية المستخدم الحالي، يرجى تسجيل الدخول.");
      return;
    }

    const payload: any = {
      sender_id: activeUserId,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };

    if (resolvedReceiverId) {
      payload.receiver_id = resolvedReceiverId;
    }

    const { error } = await (supabase.from("messages") as any).insert([payload]);

    if (error) {
      console.error("خطأ أثناء إرسال الرسالة:", error);
      alert(`خطأ عند الإرسال: ${error.message || "تأكد من إعدادات RLS"}`);
    } else {
      setText("");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const folder = isImage ? "images" : "files";
    const uploadedUrl = await uploadFile(file, folder);

    if (uploadedUrl) {
      await sendMessage("", uploadedUrl, isImage ? "image" : "file");
    }

    e.target.value = "";
  };

  // 6. تسجيل الصوت الذكي متوافق مع Safari (iOS) و Chrome (Android)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        options = { mimeType: "audio/aac" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || "audio/mp4";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const voiceUrl = await uploadFile(audioBlob, "voice");
        if (voiceUrl) {
          await sendMessage("", voiceUrl, "voice");
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("تعذر الوصول للميكروفون:", err);
      alert("يرجى إعطاء الإذن لاستخدام الميكروفون.");
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
      {/* Header */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-base font-semibold text-slate-200">المحادثة المباشرة</h2>
        </div>
        {isUploading && (
          <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 animate-pulse">
            جاري الرفع...
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            لا توجد رسائل بعد، ابدأ المحادثة الآن...
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === activeUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-sm shadow-sm transition-all ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-slate-800/90 text-slate-100 rounded-bl-xs border border-slate-700/60"
                  }`}
                >
                  {msg.content && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}

                  {msg.media_type === "image" && msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt="مرفق"
                      className="mt-2 rounded-xl border border-white/10 max-h-64 w-full object-cover"
                    />
                  )}

                  {msg.media_type === "voice" && msg.media_url && (
                    <div className="mt-2 min-w-[220px]">
                      <audio controls src={msg.media_url} className="w-full h-10 accent-blue-500 rounded-lg" />
                    </div>
                  )}

                  {msg.media_type === "file" && msg.media_url && (
                    <a
                      href={msg.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 underline bg-blue-950/40 p-2 rounded-lg border border-blue-800/40"
                    >
                      📎 تحميل المرفق
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <label className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition cursor-pointer" title="إرفاق ملف أو صورة">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
        </label>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`p-2.5 rounded-xl transition ${
            isRecording
              ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
              : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title={isRecording ? "إيقاف والإرسال" : "تسجيل صوتي"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
        />

        <button
          onClick={() => sendMessage(text)}
          disabled={!text.trim() || isUploading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-blue-600/20"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}
