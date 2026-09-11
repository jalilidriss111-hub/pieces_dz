"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface ChatProps {
  currentUserId: string;
  receiverId: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type: "text" | "image" | "audio";
  created_at: string;
}

export default function Chat({
  currentUserId,
  receiverId,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // تحميل الرسائل + تشغيل Realtime
  useEffect(() => {
    fetchMessages();

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

          const belongsToChat =
            (newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId &&
              newMsg.receiver_id === currentUserId);

          if (!belongsToChat) return;

          setMessages((prev) => {
            if (prev.some((message) => message.id === newMsg.id)) {
              return prev;
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, receiverId]);

  // النزول لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // جلب الرسائل القديمة
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Error fetching messages:", error.message);
      return;
    }

    setMessages(data || []);
  };

  // إرسال رسالة نصية
  const sendMessage = async (
    e?: React.FormEvent
  ) => {
    if (e) {
      e.preventDefault();
    }

    const contentToSend = newMessage.trim();

    if (!contentToSend) {
      return;
    }

    setNewMessage("");

    const { error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: contentToSend,
          media_type: "text",
        },
      ]);

    if (error) {
      console.error(
        "Error sending message:",
        error.message
      );

      alert(
        "فشل إرسال الرسالة: " + error.message
      );

      setNewMessage(contentToSend);
    }
  };

  // رفع صورة أو ملف صوتي
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "audio"
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    setUploading(true);

    try {
      const fileExt =
        file.name.split(".").pop() || "bin";

      const randomString = Math.random()
        .toString(36)
        .substring(2);

      const fileName = `${Date.now()}_${randomString}.${fileExt}`;

      const filePath = `${currentUserId}/${fileName}`;

      // رفع الملف إلى Storage
      const { error: uploadError } =
        await supabase.storage
          .from("chat_media")
          .upload(filePath, file, {
            upsert: true,
          });

      if (uploadError) {
        console.error(
          "Upload error:",
          uploadError
        );

        alert(
          "فشل رفع الملف. تأكد أن Bucket chat_media موجود وأن إعداداته صحيحة."
        );

        return;
      }

      // الحصول على الرابط
      const { data } = supabase.storage
        .from("chat_media")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        alert(
          "تعذر الحصول على رابط الملف."
        );

        return;
      }

      // حفظ الرسالة في قاعدة البيانات
      const { error: insertError } =
        await supabase
          .from("messages")
          .insert([
            {
              sender_id: currentUserId,
              receiver_id: receiverId,
              content: data.publicUrl,
              media_type: type,
            },
          ]);

      if (insertError) {
        console.error(
          "Message insert error:",
          insertError.message
        );

        alert(
          "فشل حفظ رابط الملف في قاعدة البيانات."
        );

        return;
      }
    } catch (error) {
      console.error(
        "Unexpected upload error:",
        error
      );

      alert(
        "حدث خطأ أثناء رفع الملف."
      );
    } finally {
      setUploading(false);

      e.target.value = "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "70vh",
        maxWidth: "600px",
        margin: "auto",
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "12px",
      }}
    >
      {/* الرسائل */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {messages.map((msg) => {
          const isMe =
            msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMe
                  ? "flex-end"
                  : "flex-start",
                background: isMe
                  ? "#f97316"
                  : "#1e293b",
                color: isMe
                  ? "#0f172a"
                  : "#f8fafc",
                padding: "8px 12px",
                borderRadius: "8px",
                maxWidth: "75%",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {/* رسالة نصية */}
              {msg.media_type === "text" && (
                <p
                  style={{
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </p>
              )}

              {/* صورة */}
              {msg.media_type === "image" && (
                <img
                  src={msg.content}
                  alt="media"
                  style={{
                    maxWidth: "200px",
                    borderRadius: "6px",
                    display: "block",
                  }}
                />
              )}

              {/* صوت */}
              {msg.media_type === "audio" && (
                <audio
                  controls
                  src={msg.content}
                  style={{
                    width: "200px",
                  }}
                />
              )}

              {/* الوقت */}
              <span
                style={{
                  fontSize: "10px",
                  opacity: 0.7,
                  display: "block",
                  textAlign: "right",
                  marginTop: "4px",
                }}
              >
                {new Date(
                  msg.created_at
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* حالة رفع الملف */}
      {uploading && (
        <p
          style={{
            textAlign: "center",
            color: "#f97316",
            fontSize: "12px",
            margin: "4px 0",
          }}
        >
          جاري رفع الملف...
        </p>
      )}

      {/* خانة الكتابة */}
      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "10px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) =>
            setNewMessage(e.target.value)
          }
          placeholder="اكتب رسالتك..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#fff",
            outline: "none",
          }}
        />

        {/* صورة */}
        <label
          style={{
            cursor: "pointer",
            background: "#1e293b",
            border: "1px solid #334155",
            padding: "8px 10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
          }}
          title="إرسال صورة"
        >
          📷

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              handleFileUpload(e, "image")
            }
            style={{
              display: "none",
            }}
          />
        </label>

        {/* صوت */}
        <label
          style={{
            cursor: "pointer",
            background: "#1e293b",
            border: "1px solid #334155",
            padding: "8px 10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
          }}
          title="إرسال صوت"
        >
          🎤

          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              handleFileUpload(e, "audio")
            }
            style={{
              display: "none",
            }}
          />
        </label>

        {/* إرسال */}
        <button
          type="submit"
          style={{
            padding: "10px 16px",
            background: "#f97316",
            color: "#0f172a",
            fontWeight: "bold",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
