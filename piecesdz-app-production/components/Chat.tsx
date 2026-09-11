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

interface Diagnostic {
  code: string;
  text: string;
  details?: string;
  time: string;
}

export default function Chat({
  currentUserId,
  receiverId,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const [diagnostics, setDiagnostics] = useState<
    Diagnostic[]
  >([]);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  // =====================================================
  // DIAGNOSTIC
  // =====================================================

  const addDiagnostic = useCallback(
    (
      code: string,
      text: string,
      details?: string
    ) => {
      const now = new Date().toLocaleTimeString();

      const item: Diagnostic = {
        code,
        text,
        details,
        time: now,
      };

      console.log(
        `[CHAT ${code}] ${text}`,
        details || ''
      );

      setDiagnostics((prev) => [
        ...prev.slice(-11),
        item,
      ]);
    },
    []
  );

  // =====================================================
  // CHECK IDS
  // =====================================================

  const checkIds = useCallback(() => {
    if (!currentUserId) {
      addDiagnostic(
        'A',
        'currentUserId فارغ',
        'ما قدرناش نحدد المستخدم الحالي.'
      );

      return false;
    }

    if (!receiverId) {
      addDiagnostic(
        'A',
        'receiverId فارغ',
        'ما قدرناش نحدد المستقبل.'
      );

      return false;
    }

    if (currentUserId === receiverId) {
      addDiagnostic(
        'A',
        'معرف المرسل والمستقبل متساوي',
        currentUserId
      );

      return false;
    }

    return true;
  }, [
    currentUserId,
    receiverId,
    addDiagnostic,
  ]);

  // =====================================================
  // FETCH MESSAGES
  // =====================================================

  const fetchMessages = useCallback(
    async (showDiagnostic = true) => {
      if (!checkIds()) return;

      try {
        const {
          data,
          error,
        } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
          )
          .order('created_at', {
            ascending: true,
          });

        if (error) {
          addDiagnostic(
            'B',
            'فشل جلب رسائل المحادثة',
            `${error.code || ''} ${error.message || ''}`
          );

          return;
        }

        const result =
          (data || []) as Message[];

        setMessages(result);

        // المستقبل/المرسل دار Query ولقى والو
        if (result.length === 0) {
          if (showDiagnostic) {
            addDiagnostic(
              'G',
              'استعلام المحادثة رجع 0 رسائل',
              `currentUser=${currentUserId} | receiver=${receiverId}`
            );
          }

          return;
        }

        // لقا رسائل
        if (showDiagnostic) {
          addDiagnostic(
            'H',
            `استعلام المحادثة رجع ${result.length} رسالة`,
            `currentUser=${currentUserId} | receiver=${receiverId}`
          );
        }
      } catch (error: any) {
        addDiagnostic(
          'B',
          'خطأ أثناء الاتصال بقاعدة البيانات',
          error?.message ||
            String(error)
        );
      }
    },
    [
      currentUserId,
      receiverId,
      checkIds,
      addDiagnostic,
    ]
  );

  // =====================================================
  // INITIAL FETCH + POLLING
  //
  // لا يوجد Realtime هنا.
  // =====================================================

  useEffect(() => {
    if (!checkIds()) return;

    addDiagnostic(
      'START',
      'بدأ نظام تشخيص الشات',
      `من: ${currentUserId} | إلى: ${receiverId}`
    );

    fetchMessages(true);

    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [
    currentUserId,
    receiverId,
    fetchMessages,
    checkIds,
    addDiagnostic,
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
    if (e) e.preventDefault();

    const contentToSend =
      newMessage.trim();

    if (!contentToSend) return;

    // نخلي التشخيص تاع كل إرسال واضح
    setDiagnostics([]);

    // ---------------------------------------------
    // A - CHECK IDS
    // ---------------------------------------------

    if (!checkIds()) {
      return;
    }

    addDiagnostic(
      'START',
      'بدأ إرسال رسالة جديدة',
      `من: ${currentUserId} | إلى: ${receiverId}`
    );

    // نخليها تختفي من الخانة
    setNewMessage('');

    try {
      // ---------------------------------------------
      // INSERT
      // ---------------------------------------------

      const {
        data: insertedData,
        error: insertError,
      } = await supabase
        .from('messages')
        .insert([
          {
            sender_id:
              currentUserId,

            receiver_id:
              receiverId,

            content:
              contentToSend,

            media_type:
              'text',
          },
        ])
        .select()
        .single();

      // ---------------------------------------------
      // E - INSERT FAILED
      // ---------------------------------------------

      if (insertError) {
        addDiagnostic(
          'E',
          'الإرسال فشل — INSERT ما نجحش',
          `${insertError.code || ''} ${insertError.message || ''}`
        );

        // نرجع الرسالة للخانة
        setNewMessage(
          contentToSend
        );

        return;
      }

      // ---------------------------------------------
      // F - INSERT SUCCESS BUT NO DATA
      // ---------------------------------------------

      if (!insertedData) {
        addDiagnostic(
          'F',
          'INSERT قال نجح ولكن ما رجعتش بيانات الرسالة'
        );

        setNewMessage(
          contentToSend
        );

        return;
      }

      const insertedMessage =
        insertedData as Message;

      addDiagnostic(
        'D',
        'INSERT نجح والرسالة دخلت قاعدة البيانات',
        `message_id=${insertedMessage.id}`
      );

      // ---------------------------------------------
      // VERIFY EXACT MESSAGE
      // ---------------------------------------------

      const {
        data: verifiedMessage,
        error: verifyError,
      } = await supabase
        .from('messages')
        .select('*')
        .eq(
          'id',
          insertedMessage.id
        )
        .maybeSingle();

      if (verifyError) {
        addDiagnostic(
          'F',
          'الرسالة دخلت لكن فشل التحقق منها',
          `${verifyError.code || ''} ${verifyError.message || ''}`
        );

        return;
      }

      if (!verifiedMessage) {
        addDiagnostic(
          'F',
          'INSERT نجح لكن الرسالة غير موجودة عند التحقق',
          `message_id=${insertedMessage.id}`
        );

        return;
      }

      addDiagnostic(
        'D',
        'تم التحقق: الرسالة موجودة فعلاً في DB',
        `message_id=${insertedMessage.id}`
      );

      // ---------------------------------------------
      // TEST CONVERSATION QUERY
      // ---------------------------------------------

      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', {
          ascending: true,
        });

      if (conversationError) {
        addDiagnostic(
          'B',
          'استعلام المحادثة فشل بعد الإرسال',
          `${conversationError.code || ''} ${conversationError.message || ''}`
        );

        return;
      }

      const conversation =
        (conversationData ||
          []) as Message[];

      const messageFound =
        conversation.some(
          (msg) =>
            msg.id ===
            insertedMessage.id
        );

      // ---------------------------------------------
      // C - MESSAGE IN DB BUT FILTER DOESN'T FIND IT
      // ---------------------------------------------

      if (!messageFound) {
        addDiagnostic(
          'C',
          'الرسالة موجودة في DB لكن فلتر المحادثة ما رجعهاش',
          `message_id=${insertedMessage.id} | messages=${conversation.length}`
        );

        console.log(
          '[CHAT C DEBUG]',
          {
            currentUserId,
            receiverId,
            insertedMessage,
            conversation,
          }
        );

        return;
      }

      // ---------------------------------------------
      // D - EVERYTHING OK
      // ---------------------------------------------

      addDiagnostic(
        'D',
        'الرسالة موجودة وتظهر في استعلام المحادثة',
        `عدد رسائل المحادثة: ${conversation.length}`
      );

      // نحدث الواجهة مباشرة
      setMessages(
        conversation
      );
    } catch (error: any) {
      addDiagnostic(
        'B',
        'خطأ غير متوقع أثناء الإرسال',
        error?.message ||
          String(error)
      );

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

    if (!checkIds()) {
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

      // ---------------------------------------------
      // STORAGE UPLOAD
      // ---------------------------------------------

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
        addDiagnostic(
          'I',
          'فشل رفع الملف إلى Storage',
          uploadError.message
        );

        alert(
          'فشل رفع الملف: ' +
            uploadError.message
        );

        setUploading(false);
        return;
      }

      addDiagnostic(
        'D',
        'تم رفع الملف إلى Storage',
        filePath
      );

      // ---------------------------------------------
      // PUBLIC URL
      // ---------------------------------------------

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
        addDiagnostic(
          'I',
          'تم رفع الملف لكن Public URL فارغ'
        );

        setUploading(false);
        return;
      }

      // ---------------------------------------------
      // INSERT MEDIA MESSAGE
      // ---------------------------------------------

      const {
        data: insertedData,
        error: insertError,
      } = await supabase
        .from('messages')
        .insert([
          {
            sender_id:
              currentUserId,

            receiver_id:
              receiverId,

            content:
              publicUrl,

            media_type:
              type,
          },
        ])
        .select()
        .single();

      if (insertError) {
        addDiagnostic(
          'E',
          'الملف ترفع لكن حفظ الرسالة فشل',
          `${insertError.code || ''} ${insertError.message || ''}`
        );

        setUploading(false);
        return;
      }

      addDiagnostic(
        'D',
        'رسالة الملف دخلت قاعدة البيانات',
        `message_id=${insertedData?.id || 'unknown'}`
      );

      await fetchMessages(true);
    } catch (error: any) {
      addDiagnostic(
        'I',
        'خطأ أثناء رفع/إرسال الملف',
        error?.message ||
          String(error)
      );
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

      {/* =========================================
          DIAGNOSTIC PANEL
      ========================================== */}

      <div
        style={{
          background:
            '#020617',
          border:
            '1px solid #334155',
          borderRadius:
            '8px',
          marginBottom:
            '10px',
          overflow:
            'hidden',
        }}
      >
        <div
          style={{
            padding:
              '8px 10px',
            background:
              '#1e293b',
            color:
              '#f97316',
            fontWeight:
              'bold',
            fontSize:
              '12px',
          }}
        >
          🛠️ تشخيص الرسائل
        </div>

        <div
          style={{
            maxHeight:
              '150px',
            overflowY:
              'auto',
            padding:
              '8px',
          }}
        >
          {diagnostics.length === 0 ? (
            <div
              style={{
                color:
                  '#64748b',
                fontSize:
                  '11px',
              }}
            >
              مازال ما كاين حتى تشخيص...
            </div>
          ) : (
            diagnostics.map(
              (item, index) => (
                <div
                  key={index}
                  style={{
                    padding:
                      '5px 0',
                    borderBottom:
                      '1px solid #1e293b',
                    fontSize:
                      '11px',
                  }}
                >
                  <span
                    style={{
                      fontWeight:
                        'bold',
                      color:
                        item.code ===
                          'D' ||
                        item.code ===
                          'H'
                          ? '#22c55e'
                          : item.code ===
                              'START'
                            ? '#f97316'
                            : '#ef4444',
                    }}
                  >
                    [{item.code}]
                  </span>

                  {' '}

                  <span
                    style={{
                      color:
                        '#e2e8f0',
                    }}
                  >
                    {item.text}
                  </span>

                  <div
                    style={{
                      color:
                        '#64748b',
                      marginTop:
                        '2px',
                      wordBreak:
                        'break-word',
                    }}
                  >
                    {item.details &&
                      item.details}

                    {' • '}

                    {item.time}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* =========================================
          MESSAGES
      ========================================== */}

      <div
        style={{
          flex: 1,
          overflowY:
            'auto',
          padding:
            '10px',
          display:
            'flex',
          flexDirection:
            'column',
          gap:
            '10px',
        }}
      >
        {messages.map(
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
                      margin:
                        0,
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
        )}

        <div
          ref={
            messagesEndRef
          }
        />
      </div>

      {/* =========================================
          UPLOADING
      ========================================== */}

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

      {/* =========================================
          INPUT
      ========================================== */}

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
          onChange={(e) =>
            setNewMessage(
              e.target.value
            )
          }
          placeholder="اكتب رسالتك..."
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
              'pointer',
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
          }}
          title="إرسال صورة"
        >
          📷

          <input
            type="file"
            accept="image/*"
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
              'pointer',
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
          }}
          title="إرسال صوت"
        >
          🎤

          <input
            type="file"
            accept="audio/*"
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
              'pointer',
          }}
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
