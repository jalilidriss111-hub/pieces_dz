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
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('REALTIME MESSAGE RECEIVED:', payload);

          const newMsg = payload.new as Message;

          if (
            (newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId &&
              newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev;
              }

              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('REALTIME CHAT STATUS:', status);
      });

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

    if (error) {
      console.error('Error fetching messages:', error.message);
      return;
    }

    setMessages(data || []);
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
      console.error('Error sending message:', error.message);
      alert('فشل إرسال الرسالة: ' + error.message);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'audio'
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const file = files[0];

    setUploading(true);

    const fileExt = file.name.split('.').pop();

    const randomString = Math.random()
      .toString(36)
      .substring(2);

    const fileName = `${Date.now()}_${randomString}.${fileExt}`;

    const filePath = `${currentUserId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);

      alert(
        'فشل رفع الملف: تأكد من أن الـ Bucket باسم chat_media موجود وأنه Public.'
      );

      setUploading(false);
      return;
    }

    const { data } = supabase
