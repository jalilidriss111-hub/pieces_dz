'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

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

export default function Chat({
  currentUserId,
  receiverId,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  // ID الحقيقي لصاحب المحل
  const [targetUserId, setTargetUserId] =
    useState<string | null>(null);

  const [resolvingId, setResolvingId] =
    useState(true);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  // =====================================================
  // تحويل shop.id إلى shops.owner_id
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    async function resolveReceiver() {
      if (!receiverId) {
        if (isMounted) {
          setTargetUserId(null);
          setResolvingId(false);
        }
        return;
      }

      setResolvingId(true);
      setTargetUserId(null);

      try {
        const {
          data: shop,
          error,
        } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', receiverId)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !shop?.owner_id) {
          setTargetUserId(null);
          setResolvingId(false);
          return;
        }

        setTargetUserId(shop.owner_id);
      } catch {
        if (isMounted) {
          setTargetUserId(null);
        }
      } finally {
        if (isMounted) {
          setResolvingId(false);
        }
      }
    }

    resolveReceiver();

    return () => {
      isMounted = false;
    };
  }, [receiverId]);

  // =====================================================
  // CHECK IDS
  // =====================================================

  const checkIds = useCallback(() => {
    if (!currentUserId) {
      return false;
    }

    if (!targetUserId) {
      return false;
    }

    if (currentUserId === targetUserId) {
      return false;
    }

    return true;
  }, [
    currentUserId,
    targetUserId,
  ]);

  // =====================================================
  // FETCH MESSAGES
  // =====================================================

  const fetchMessages = useCallback(
    async () => {
      if (
        !checkIds() ||
        !targetUserId
      ) {
        return;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

        if (error) {
          return;
        }

        setMessages(
          (data || []) as Message[]
        );
      } catch {
        return;
      }
    },
    [
      currentUserId,
      targetUserId,
      checkIds,
    ]
  );

  // =====================================================
  // INITIAL FETCH + POLLING
  // =====================================================

  useEffect(() => {
    if (
      resolvingId ||
      !checkIds()
    ) {
      return;
    }

    fetchMessages();

    const interval =
      setInterval(() => {
        fetchMessages();
      }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [
    resolvingId,
    currentUserId,
    targetUserId,
    fetchMessages,
    checkIds,
  ]);

  // =====================================================
  // SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async (
    e?: React.FormEvent
  ) => {
    if (e) {
      e.preventDefault();
    }

    const contentToSend =
      newMessage.trim();

    if (
      !contentToSend ||
      !checkIds() ||
      !targetUserId
    ) {
      return;
    }

    setNewMessage('');

    try {
      const {
        error: insertError,
      } = await supabase
        .from('messages')
        .insert([
          {
            sender_id:
              currentUserId,

            receiver_id:
              targetUserId,

            content:
              contentToSend,

            media_type:
              'text',
          },
        ]);

      if (insertError) {
        setNewMessage(
          contentToSend
        );

        alert(
          'فشل إرسال الرسالة: ' +
            insertError.message
        );

        return;
      }

      await fetchMessages();
    } catch {
      setNewMessage(
        contentToSend
      );
    }
  };

  // =====================================================
  // FILE UPLOAD
  // =====================================================

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'audio'
  ) => {
    const files =
      e.target.files;

    if (
      !files ||
      files.length === 0
    ) {
      return;
    }

    const file = files[0];

    if (
      !checkIds() ||
      !targetUserId
    ) {
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const fileExt =
        file.name
          .split('.')
          .pop() || 'bin';

      const randomString =
        Math.random()
          .toString(36)
          .substring(2);

      const fileName =
        `${Date.now()}_${randomString}.${fileExt}`;

      const filePath =
        `${currentUserId}/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('chat_media')
        .upload(
          filePath,
          file,
          {
            upsert: true,
          }
        );

      if (uploadError) {
        alert(
          'فشل رفع الملف: ' +
            uploadError.message
        );

        setUploading(false);
        return;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('chat_media')
        .getPublicUrl(
          filePath
        );

      const publicUrl =
        publicUrlData?.publicUrl;

      if (!publicUrl) {
        setUploading(false);
        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from('messages')
        .insert([
          {
            sender_id:
              currentUserId,

            receiver_id:
              targetUserId,

            content:
              publicUrl,

            media_type:
              type,
          },
        ]);

      if (insertError) {
        alert(
          'فشل حفظ رسالة الملف: ' +
            insertError.message
        );

        setUploading(false);
        return;
      }

      await fetchMessages();
    } catch {
      // تجاهل الخطأ
    }

    setUploading(false);
    e.target.value = '';
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '70vh',
        maxWidth: '600px',
        margin: 'auto',
        backgroundColor: '#0f172a',
        border:
          '1px solid #334155',
        borderRadius: '12px',
        padding: '12px',
      }}
    >
      {/* MESSAGES */}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {resolvingId ? (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              padding: '20px',
            }}
          >
            جاري تحضير المحادثة...
          </div>
        ) : !targetUserId ? (
          <div
            style={{
              textAlign: 'center',
              color: '#ef4444',
              padding: '20px',
            }}
          >
            تعذر تحديد صاحب المحل.
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#64748b',
              padding: '20px',
            }}
          >
            لا توجد رسائل بعد. اكتب رسالتك وابدأ المحادثة!
          </div>
        ) : (
          messages.map(
            (msg) => {
              const isMe =
                msg.sender_id ===
                currentUserId;

              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf:
                      isMe
                        ? 'flex-end'
                        : 'flex-start',

                    background:
                      isMe
                        ? '#f97316'
                        : '#1e293b',

                    color:
                      isMe
                        ? '#0f172a'
                        : '#f8fafc',

                    padding:
                      '8px 12px',

                    borderRadius:
                      '8px',

                    maxWidth:
                      '75%',

                    boxShadow:
                      '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  {msg.media_type ===
                    'text' && (
                    <p
                      style={{
                        margin: 0,
                        wordBreak:
                          'break-word',
                      }}
                    >
                      {msg.content}
                    </p>
                  )}

                  {msg.media_type ===
                    'image' && (
                    <img
                      src={
                        msg.content
                      }
                      alt="media"
                      style={{
                        maxWidth:
                          '200px',
                        borderRadius:
                          '6px',
                        display:
                          'block',
                      }}
                    />
                  )}

                  {msg.media_type ===
                    'audio' && (
                    <audio
                      controls
                      src={
                        msg.content
                      }
                      style={{
                        width:
                          '200px',
                      }}
                    />
                  )}

                  <span
                    style={{
                      fontSize:
                        '10px',
                      opacity:
                        0.7,
                      display:
                        'block',
                      textAlign:
                        'right',
                      marginTop:
                        '4px',
                    }}
                  >
                    {new Date(
                      msg.created_at
                    ).toLocaleTimeString(
                      [],
                      {
                        hour:
                          '2-digit',
                        minute:
                          '2-digit',
                      }
                    )}
                  </span>
                </div>
              );
            }
          )
        )}

        <div
          ref={
            messagesEndRef
          }
        />
      </div>

      {/* UPLOADING */}

      {uploading && (
        <p
          style={{
            textAlign:
              'center',
            color:
              '#f97316',
            fontSize:
              '12px',
            margin:
              '4px 0',
          }}
        >
          جاري رفع الملف...
        </p>
      )}

      {/* INPUT */}

      <form
        onSubmit={
          sendMessage
        }
        style={{
          display:
            'flex',
          gap:
            '8px',
          marginTop:
            '10px',
          alignItems:
            'center',
        }}
      >
        <input
          type="text"
          value={
            newMessage
          }
          disabled={
            resolvingId ||
            !targetUserId
          }
          onChange={(e) =>
            setNewMessage(
              e.target.value
            )
          }
          placeholder={
            resolvingId
              ? 'جاري الاتصال...'
              : !targetUserId
              ? 'تعذر تحديد صاحب المحل'
              : 'اكتب رسالتك...'
          }
          style={{
            flex: 1,
            padding:
              '10px',
            borderRadius:
              '8px',
            border:
              '1px solid #334155',
            background:
              '#1e293b',
            color:
              '#fff',
            outline:
              'none',
          }}
        />

        <label
          style={{
            cursor:
              resolvingId ||
              !targetUserId
                ? 'not-allowed'
                : 'pointer',

            background:
              '#1e293b',

            border:
              '1px solid #334155',

            padding:
              '8px 10px',

            borderRadius:
              '8px',

            display:
              'flex',

            alignItems:
              'center',

            opacity:
              resolvingId ||
              !targetUserId
                ? 0.5
                : 1,
          }}
          title="إرسال صورة"
        >
          📷

          <input
            type="file"
            accept="image/*"
            disabled={
              resolvingId ||
              !targetUserId
            }
            onChange={(e) =>
              handleFileUpload(
                e,
                'image'
              )
            }
            style={{
              display:
                'none',
            }}
          />
        </label>

        <label
          style={{
            cursor:
              resolvingId ||
              !targetUserId
                ? 'not-allowed'
                : 'pointer',

            background:
              '#1e293b',

            border:
              '1px solid #334155',

            padding:
              '8px 10px',

            borderRadius:
              '8px',

            display:
              'flex',

            alignItems:
              'center',

            opacity:
              resolvingId ||
              !targetUserId
                ? 0.5
                : 1,
          }}
          title="إرسال صوت"
        >
          🎤

          <input
            type="file"
            accept="audio/*"
            disabled={
              resolvingId ||
              !targetUserId
            }
            onChange={(e) =>
              handleFileUpload(
                e,
                'audio'
              )
            }
            style={{
              display:
                'none',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={
            resolvingId ||
            !targetUserId
          }
          style={{
            padding:
              '10px 16px',
            background:
              '#f97316',
            color:
              '#0f172a',
            fontWeight:
              'bold',
            border:
              'none',
            borderRadius:
              '8px',
            cursor:
              resolvingId ||
              !targetUserId
                ? 'not-allowed'
                : 'pointer',
            opacity:
              resolvingId ||
              !targetUserId
                ? 0.6
                : 1,
          }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
