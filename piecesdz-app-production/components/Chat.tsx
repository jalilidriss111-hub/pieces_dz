'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

    const channel = supabase
      .channel(`chat_${currentUserId}_${receiverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
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

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const contentToSend = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: contentToSend,
        media_type: 'text',
      },
    ]);

    if (error) {
      console.error("Error sending message:", error.message);
      alert("فشل إرسال الرسالة: " + error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    // التصحيح هنا في الأقواس
    const randomString = Math.random().toString(36).substring(2);
    const fileName = `${Date.now()}_${randomString}.${fileExt}`;
    const filePath = `${currentUserId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error details:", uploadError);
      alert('فشل رفع الملف: تأكد من أن الـ Bucket باسم chat_media موجود وأنه Public.');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: data.publicUrl,
        media_type: type,
      },
    ]);

    if (insertError) {
      alert('فشل حفظ رابط الملف في قاعدة البيانات');
    }

    setUploading(false);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', maxWidth: '600px', margin: 'auto', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? '#f97316' : '#1e293b', color: isMe ? '#0f172a' : '#f8fafc', padding: '8px 12px', borderRadius: '8px', maxWidth: '75%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              {msg.media_type === 'text' && <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.content}</p>}
              {msg.media_type === 'image' && <img src={msg.content} alt="media" style={{ maxWidth: '200px', borderRadius: '6px', display: 'block' }} />}
              {msg.media_type === 'audio' && <audio controls src={msg.content} style={{ width: '200px' }} />}
              <span style={{ fontSize: '10px', opacity: 0.7, display: 'block', textAlign: 'right', marginTop: '4px' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {uploading && <p style={{ textAlign: 'center', color: '#f97316', fontSize: '12px', margin: '4px 0' }}>جاري رفع الملف...</p>}

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالتك..."
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#fff', outline: 'none' }}
        />
        
        <label style={{ cursor: 'pointer', background: '#1e293b', border: '1px solid #334155', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center' }} title="إرسال صورة">
          📷
          <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} style={{ display: 'none' }} />
        </label>

        <label style={{ cursor: 'pointer', background: '#1e293b', border: '1px solid #334155', padding: '8px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center' }} title="إرسال صوت">
          🎤
          <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio')} style={{ display: 'none' }} />
        </label>

        <button type="submit" style={{ padding: '10px 16px', background: '#f97316', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          إرسال
        </button>
      </form>
    </div>
  );
}
