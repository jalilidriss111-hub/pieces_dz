"use client";

import React, { useState, useEffect, useRef } from "react";
// اضبط مسار استيراد عميل Supabase حسب مشروعك (مثلاً: @/lib/supabase)
import { supabase } from "@/lib/supabaseClient";

export interface Message {
  id: string;
  sender_id?: string;
  content?: string;
  media_url?: string;
  media_type?: "image" | "voice" | "file" | string;
  created_at: string;
}

interface ChatProps {
  currentUserId?: string;
  chatRoomId?: string;
}

export default function Chat({ currentUserId = "user_1", chatRoomId = "default_room" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لأسفل عند وصول رسالة جديدة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // جلب الرسائل الأولية والاستماع للرسائل الجديدة (Realtime)
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

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
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  // دالة رفع الملفات إلى الباكت chat_media
  const uploadFile = async (file: Blob | File, folder: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileType = file.type || (folder === "voice" ? "audio/webm" : "image/jpeg");
      const ext = fileType.split("/")[1]?.split(";")[0] || (folder === "voice" ? "webm" : "jpg");
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
        alert(`خطأ في الرفع: ${error.message}`);
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

  // إرسال الرسالة لقاعدة البيانات
  const sendMessage = async (content?: string, mediaUrl?: string, mediaType?: string) => {
    if (!content?.trim() && !mediaUrl) return;

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: currentUserId,
        content: content || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      },
    ]);

    if (error) {
      console.error("خطأ أثناء إرسال الرسالة:", error);
      alert("تعذر إرسال الرسالة، تأكد من إعدادات الجدول.");
    } else {
      setText("");
    }
  };

  // التعامل مع اختيار الصور والملفات
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

  // بدء تسجيل الملاحظة الصوتية
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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

  // إيقاف التسجيل وإرسال الملاحظة الصوتية
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-2xl bg-slate-900 text-white shadow-xl overflow-hidden" dir="rtl">
      {/* شريط العنوان */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-bold">المحادثة</h2>
        {isUploading && <span className="text-xs text-amber-400 animate-pulse">جاري الرفع إلى chat_media...</span>}
      </div>

      {/* منطقة عرض الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700"
                }`}
              >
                {msg.content && <p className="leading-relaxed">{msg.content}</p>}

                {/* عرض الصور */}
                {msg.media_type === "image" && msg.media_url && (
                  <img
                    src={msg.media_url}
                    alt="مرفق"
                    className="mt-2 max-w-full rounded-xl max-h-60 object-cover"
                  />
                )}

                {/* عرض التسجيل الصوتي */}
                {msg.media_type === "voice" && msg.media_url && (
                  <audio controls src={msg.media_url} className="mt-2 w-full max-w-[240px]" />
                )}

                {/* عرض الملفات العامة */}
                {msg.media_type === "file" && msg.media_url && (
                  <a
                    href={msg.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-blue-300 underline text-xs"
                  >
                    تحميل الملف
                  </a>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* منطقة إدخال النص والأزرار */}
      <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
        {/* زر إرفاق الملفات/الصور */}
        <label className="p-2 cursor-pointer hover:bg-slate-700 rounded-full text-slate-300 transition" title="إرفاق صورة أو ملف">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} />
        </label>

        {/* زر الملاحظة الصوتية */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`p-2 rounded-full transition ${
            isRecording ? "bg-red-600 text-white animate-pulse" : "hover:bg-slate-700 text-slate-300"
          }`}
          title={isRecording ? "إيقاف التسجيل والإرسال" : "تسجيل صوتي"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {/* حقل النص */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(text)}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
        />

        {/* زر الإرسال */}
        <button
          onClick={() => sendMessage(text)}
          disabled={!text.trim() || isUploading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}
