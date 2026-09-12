"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2 } from "lucide-react";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    // الاشتراك في الرسائل اللحظية (Realtime)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const contentToSend = newMessage.trim();
    if (!contentToSend || sending) return;

    setSending(true);
    setNewMessage("");

    const { error } = await (supabase.from("messages") as any).insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      content: contentToSend,
      media_type: "text",
    });

    if (error) {
      console.error("Error sending message:", error);
    }

    setSending(false);
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
      {/* منطقة عرض الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            لا توجد رسائل بينكما بعد. ابدأ المحادثة الآن!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? "bg-orange-500 text-white rounded-br-none shadow-md shadow-orange-500/10"
                      : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

      {/* نموذج إرسال الرسالة */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="اكتب رسالتك هنا..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
