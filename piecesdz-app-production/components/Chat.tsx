"use client";

import React, { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    let mounted = true;

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
        console.error(
          "Error fetching messages:",
          error.message
        );
        return;
      }

      if (mounted) {
        setMessages(
          (data as unknown as Message[]) || []
        );
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(
        `chat_${currentUserId}_${receiverId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg =
            payload.new as Message;

          const belongsToChat =
            (newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === receiverId) ||
            (newMsg.sender_id === receiverId &&
              newMsg.receiver_id === currentUserId);

          if (!belongsToChat) {
            return;
          }

          setMessages((prev) => {
            if (
              prev.some(
                (message) =>
                  message.id === newMsg.id
              )
            ) {
              return prev;
            }

            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "Chat realtime status:",
          status
        );
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (
    e?: React.FormEvent
  ) => {
    e?.preventDefault();

    const contentToSend =
      newMessage.trim();

    if (!contentToSend) {
      return;
    }

    setNewMessage("");

    const messageData = {
      sender_id: currentUserId,
      receiver_id: receiverId,
      content: contentToSend,
      media_type: "text",
    };

    const { error } = await supabase
      .from("messages")
      .insert([messageData as any]);

    if (error) {
      console.error(
        "Error sending message:",
        error.message
      );

      alert(
        "فشل إرسال الرسالة: " +
          error.message
      );

      setNewMessage(contentToSend);
    }
  };

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
        file.name.split(".").pop() ||
        "bin";

      const randomString =
        Math.random()
          .toString(36)
          .substring(2);

      const fileName =
        `${Date.now()}_${randomString}.${fileExt}`;

      const filePath =
        `${currentUserId}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("chat_media")
          .upload(
            filePath,
            file,
            {
              upsert: true,
            }
          );

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

      const { data } =
        supabase.storage
          .from("chat_media")
          .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        alert(
         
