'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// استخدام متغيرات البيئة للعميل
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// تعريف نوع الخصائص (Props) لتفادي أخطاء TypeScript
interface ChatProps {
  currentUserId: string;
  receiverId: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type: 'text' | 'image' | 'audio';
  created_at: string;
}

export default function Chat({ currentUserId, receiverId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // الاستماع للرسائل الجديدة لحظياً
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
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
  }, [currentUserId, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // جلب الرسائل السابقة بين الطرفين
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true });

    if (!error) setMessages(data || []);
  };

  // إرسال رسالة نصية
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: newMessage,
        media_type: 'text',
      },
    ]);

    if (!error) setNewMessage('');
  };

  // رفع وإرسال صورة أو ملف صوتي
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${currentUserId}/${fileName}`;

    // رفع الملف إلى الـ Bucket
    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file);

    if (uploadError) {
      alert('فشل رفع الملف');
      setUploading(false);
      return;
    }

    // جلب الرابط العام للملف
    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

    // إرسال رابط الملف كرسالة في جدول messages
    await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: data.publicUrl,
        media_type: type,
      },
    ]);

    setUploading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', maxWidth: '600px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}>
      {/* صندوق الرسائل */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? '#DCF8C6' : '#FFF', padding: '8px 12px', borderRadius: '8px', maxWidth: '70%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              {msg.media_type === 'text' && <p style={{ margin: 0, color: '#000' }}>{msg.content}</p>}
              {msg.media_type === 'image' && <img src={msg.content} alt="media" style={{ maxWidth: '200px', borderRadius: '6px' }} />}
              {msg.media_type === 'audio' && <audio controls src={msg.content} style={{ width: '200px' }} />}
              <span style={{ fontSize: '10px', color: '#888', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {uploading && <p style={{ textAlign: 'center', color: 'blue' }}>جاري رفع الملف...</p>}

      {/* حقل الإدخال والأزرار */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالتك..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', color: '#000' }}
        />
        
        {/* زر إرسال صورة */}
        <label style={{ cursor: 'pointer', background: '#f0f0f0', padding: '8px 12px', borderRadius: '4px' }}>
          📷
          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} style={{ display: 'none' }} />
        </label>

        {/* زر إرسال صوت */}
        <label style={{ cursor: 'pointer', background: '#f0f0f0', padding: '8px 12px', borderRadius: '4px' }}>
          🎤
          <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} style={{ display: 'none' }} />
        </label>

        <button type="submit" style={{ padding: '10px 15px', background: '#007BFF', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          إرسال
        </button>
      </form>
    </div>
  );
}
