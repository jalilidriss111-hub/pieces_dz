import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// استبدل هذه المتغيرات بمعلومات مشروعك في Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Chat({ currentUserId, receiverId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();

    // الاستماع للرسائل الجديدة لحظياً
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (
            (payload.new.sender_id === currentUserId && payload.new.receiver_id === receiverId) ||
            (payload.new.sender_id === receiverId && payload.new.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, payload.new]);
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
  const sendMessage = async (e) => {
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
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

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
        media_type: type, // 'image' أو 'audio'
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
              {msg.media_type === 'text' && <p style={{ margin: 0 }}>{msg.content}</p>}
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
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
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
