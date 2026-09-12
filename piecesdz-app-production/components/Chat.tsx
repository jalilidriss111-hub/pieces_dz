"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Image as ImageIcon, Mic, Loader2, Trash2 } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type: "text" | "image" | "audio";
  created_at: string;
}

interface ChatProps {
  currentUserId: string;
  receiverId: string;
}

export default function Chat({ currentUserId, receiverId }: ChatProps) {
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // رفع الملفات لـ Supabase مع تحديد نوع Content-Type بدقة
  const uploadFile = async (file: Blob | File, folder: string): Promise<string | null> => {
    try {
      const fileType = file.type || (folder === "voice" ? "audio/webm" : "image/jpeg");
      const ext = fileType.split("/")[1]?.split(";")[0] || (folder === "voice" ? "webm" : "jpg");
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: fileType,
        });

      if (error) {
        console.error("خطأ Supabase Storage:", error);
        alert(`خطأ في الرفع: ${error.message}. تأكد أن الباكت chat-media موجود ومفعل كـ Public.`);
        return null;
      }

      const { data: publicData } = supabase.storage.from("chat-media").getPublicUrl(data.path);
      return publicData.publicUrl;
    } catch (err: any) {
      console.error("فشل الرفع:", err);
      alert(`تعذر الرفع: ${err?.message || "خطأ غير معروف"}`);
      return null;
    }
  };

  const loadMessages = useCallback(async () => {
    setLoading(true);

    const { data, error } = await (supabase.from("messages") as any)
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }

    setLoading(false);
  }, [supabase, currentUserId, receiverId]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat_${currentUserId}_${receiverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, receiverId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // إرسال نص
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentToSend = newMessage.trim();
    if (!contentToSend || sending) return;

    setSending(true);
    setNewMessage("");

    await (supabase.from("messages") as any).insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      content: contentToSend,
      media_type: "text",
    });

    setSending(false);
  };

  // إرسال صورة
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSending(true);
    const imageUrl = await uploadFile(file, "images");

    if (imageUrl) {
      await (supabase.from("messages") as any).insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: imageUrl,
        media_type: "image",
      });
    }

    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // بدء التسجيل الصوتي متوافق مع كافة المتصفحات
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
        else mimeType = "";
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("يرجى إعطاء إذن المايكروفون في المتصفح للإرسال الصوتي.");
    }
  };

  // إيقاف وإرسال التسجيل الصوتي
  const stopAndSendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.onstop = async () => {
      setSending(true);
      const recordedMimeType = recorder.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });

      if (audioBlob.size > 0) {
        const audioUrl = await uploadFile(audioBlob, "voice");
        if (audioUrl) {
          await (supabase.from("messages") as any).insert({
            sender_id: currentUserId,
            receiver_id: receiverId,
            content: audioUrl,
            media_type: "audio",
          });
        }
      }

      setSending(false);
      audioChunksRef.current = [];
    };

    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    audioChunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 gap-2">
        <Loader2 className="animate-spin text-orange-500" size={28} />
        <p className="text-xs">جاري تحميل المحادثة...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            لا توجد رسائل بينكما بعد. ابدأ المحادثة الآن!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm ${
                    isMe
                      ? "bg-orange-500 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                  }`}
                >
                  {msg.media_type === "text" && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {msg.media_type === "image" && (
                    <div className="rounded-lg overflow-hidden my-1">
                      <img
                        src={msg.content}
                        alt="صورة مرفقة"
                        className="max-h-60 w-full object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {msg.media_type === "audio" && (
                    <div className="py-1">
                      <audio controls src={msg.content} className="max-w-xs w-full h-10" />
                    </div>
                  )}

                  <span
                    className={`block text-[10px] mt-1 text-left ${
                      isMe ? "text-orange-200" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800">
        {isRecording ? (
          <div className="flex items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>جاري التسجيل: {recordingTime} ثانية</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                title="إلغاء"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={stopAndSendRecording}
                disabled={sending}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold flex items-center gap-1 hover:bg-orange-600 transition-colors"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>إرسال الصوت</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-orange-400 transition-colors shrink-0"
              title="إرسال صورة من الهاتف"
            >
              <ImageIcon size={18} />
            </button>

            <button
              type="button"
              onClick={startRecording}
              disabled={sending}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-orange-400 transition-colors shrink-0"
              title="تسجيل صوتي"
            >
              <Mic size={18} />
            </button>

            <input
              type="text"
              placeholder="اكتب رسالتك..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
