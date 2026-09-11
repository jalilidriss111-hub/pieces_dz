"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Chat from "@/components/Chat";
import { MessageSquare, User, ArrowRight } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_type: string | null;
  created_at: string;
}

export default function MessagesPage() {
  // إنشاء Client واحد فقط وعدم إعادة إنشائه مع كل Render
  const supabase = useMemo(() => createClient(), []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [loading, setLoading] = useState(true);

  // =========================================================
  // تحميل المستخدم + المحادثات القديمة
  // =========================================================
  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        console.error("Auth error:", userError?.message);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `sender_id.eq.${user.id},receiver_id.eq.${user.id}`
        )
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      if (error) {
        console.error(
          "Error loading messages:",
          error.message
        );
        setLoading(false);
        return;
      }

      const messages = (data || []) as MessageRow[];

      const conversationsMap =
        new Map<string, Conversation>();

      for (const message of messages) {
        const partnerId =
          message.sender_id === user.id
            ? message.receiver_id
            : message.sender_id;

        if (!partnerId) continue;

        // بما أن الرسائل مرتبة من الأحدث إلى الأقدم،
        // أول رسالة للشخص هي آخر رسالة في المحادثة.
        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            id: partnerId,
            name: `مستخدم (${partnerId.substring(0, 6)}...)`,
            lastMessage: message.content || "",
            lastTime: message.created_at,
          });
        }
      }

      setConversations(
        Array.from(conversationsMap.values())
      );

      setLoading(false);
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // =========================================================
  // REALTIME
  //
  // هذا الجزء مهم جداً:
  // إذا وصلت رسالة جديدة للمستخدم الحالي، نضيف صاحبها
  // إلى قائمة المحادثات حتى لو ما كانش عندو محادثة من قبل.
  // =========================================================
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`messages_page_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage =
            payload.new as MessageRow;

          // نهتم فقط بالرسائل التي تخص المستخدم الحالي
          const isForCurrentUser =
            newMessage.receiver_id === currentUserId;

          const isFromCurrentUser =
            newMessage.sender_id === currentUserId;

          if (
            !isForCurrentUser &&
            !isFromCurrentUser
          ) {
            return;
          }

          const partnerId =
            isFromCurrentUser
              ? newMessage.receiver_id
              : newMessage.sender_id;

          if (!partnerId) return;

          const partnerName =
            `مستخدم (${partnerId.substring(0, 6)}...)`;

          setConversations((previous) => {
            const existingIndex =
              previous.findIndex(
                (conversation) =>
                  conversation.id === partnerId
              );

            // المحادثة موجودة
            if (existingIndex !== -1) {
              const updated = [...previous];

              updated[existingIndex] = {
                ...updated[existingIndex],
                lastMessage:
                  newMessage.content || "",
                lastTime: newMessage.created_at,
              };

              // نحط المحادثة اللي فيها رسالة جديدة في الأعلى
              const [conversation] =
                updated.splice(existingIndex, 1);

              return [
                {
                  ...conversation,
                  lastMessage:
                    newMessage.content || "",
                  lastTime:
                    newMessage.created_at,
                },
                ...updated,
              ];
            }

            // أول رسالة بين الشخصين
            return [
              {
                id: partnerId,
                name: partnerName,
                lastMessage:
                  newMessage.content || "",
                lastTime:
                  newMessage.created_at,
              },
              ...previous,
            ];
          });

          // إذا كانت رسالة واردة جديدة وما كناش داخلين
          // مع هذا الشخص، نفتح المحادثة تلقائياً.
          if (
            newMessage.receiver_id === currentUserId &&
            activePartnerId !== partnerId
          ) {
            setActivePartnerId(partnerId);
            setActivePartnerName(partnerName);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, activePartnerId]);

  // =========================================================
  // Loading
  // =========================================================
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        جاري تحميل الرسائل...
      </div>
    );
  }

  // =========================================================
  // المستخدم غير مسجل
  // =========================================================
  if (!currentUserId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        الرجاء تسجيل الدخول لعرض الرسائل.
      </div>
    );
  }

  // =========================================================
  // الصفحة
  // =========================================================
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare
          className="text-orange-500"
          size={24}
        />

        <h1 className="text-2xl font-bold text-white">
          رسائلي ومحادثاتي
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[60vh]">

        {/* =================================================
            قائمة المحادثات
        ================================================= */}
        <div className="border-l border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto max-h-[70vh]">

          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            الأشخاص
          </h2>

          {conversations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              لا توجد محادثات سابقة.
            </p>
          ) : (
            conversations.map((partner) => (
              <button
                key={partner.id}
                onClick={() => {
                  setActivePartnerId(
                    partner.id
                  );

                  setActivePartnerName(
                    partner.name
                  );
                }}
                className={`w-full text-right p-3 rounded-xl transition-all flex items-center justify-between ${
                  activePartnerId === partner.id
                    ? "bg-orange-500/10 border border-orange-500/30 text-white"
                    : "bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">

                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 shrink-0">
                    <User size={18} />
                  </div>

                  <div className="overflow-hidden text-right">

                    <p className="text-sm font-bold text-white truncate">
                      {partner.name}
                    </p>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {partner.lastMessage}
                    </p>

                  </div>
                </div>

                <ArrowRight
                  size={15}
                  className="text-slate-600 shrink-0"
                />
              </button>
            ))
          )}
        </div>

        {/* =================================================
            الشات النشط
        ================================================= */}
        <div className="md:col-span-2 p-4 flex flex-col justify-center">

          {activePartnerId ? (
            <div>

              <div className="mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">

                <span className="text-sm font-bold text-white flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>

                  محادثة مع: {activePartnerName}

                </span>

              </div>

              <Chat
                currentUserId={currentUserId}
                receiverId={activePartnerId}
              />

            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">

              <MessageSquare
                size={40}
                className="mx-auto mb-3 opacity-30"
              />

              <p className="text-sm font-medium">
                اختر محادثة من القائمة الجانبية لبدء الدردشة
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
