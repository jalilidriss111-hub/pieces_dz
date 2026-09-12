'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Image as ImageIcon, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type: 'text' | 'image' | 'audio';
  created_at: string;
}

interface Profile {
  full_name?: string;
  avatar_url?: string;
}

interface ChatProps {
  currentUserId: string;
  receiverId: string;
}

export default function Chat({ currentUserId, receiverId }: ChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverProfile, setReceiverProfile] = useState<Profile null |>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchReceiverProfile = useCallback(async () => {
    if (!receiverId) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', receiverId)
      .single();

    if (data) {
      setReceiverProfile(data);
    }
  }, [receiverId, supabase]);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !receiverId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
    setLoading(false);
  }, [currentUserId, receiverId, supabase]);

  useEffect(() => {
    fetchReceiverProfile();
    fetchMessages();

    const channel = supabase
      .channel(`chat_${currentUserId}_${receiverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
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
  }, [currentUserId, receiverId, fetchMessages, fetchReceiverProfile, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const contentToSend = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      content: contentToSend,
      media_type: 'text',
    });

    if (error) {
      console.error('Error sending message:', error);
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `chat/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: publicUrlData.publicUrl,
        media_type: 'image',
      });
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[550px] bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
            {receiverProfile?.avatar_url ? (
              <img
                src={receiverProfile.avatar_url}
                alt={receiverProfile.full_name || 'مستخدم'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-orange-400" size="{20}"/>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {receiverProfile?.full_name?.trim() || `مستخدم (${receiverId.substring(0, 6)}...)`}
            </h3>
            <span className="text-[11px] text-emerald-400 font-medium">نشط الآن</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Loader2 className="animate-spin text-orange-500" size="{24}"/>
            <span className="text-xs">جاري تحميل الرسائل...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            لا توجد رسائل بعد. ابدأ المحادثة الآن!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'bg-orange-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {msg.media_type === 'image' ? (
                    <img
                      src={msg.content}
                      alt="مرفق"
                      className="max-w-xs max-h-60 rounded-lg object-cover"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-orange-400 hover:bg-slate-700 transition-colors disabled:opacity-50 shrink-0"
          title="إرسال صورة"
        >
          {uploadingImage ? <Loader2 className="animate-spin" size="{20}"/> : <ImageIcon size="{20}"/>}
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
        />

        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-2.5 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition-colors disabled:opacity-50 font-bold shrink-0"
        >
          {sending ? <Loader2 className="animate-spin" size="{20}"/> : <Send className="rotate-180" size="{20}"/>}
        </button>
      </form>
    </div>
  );
}
