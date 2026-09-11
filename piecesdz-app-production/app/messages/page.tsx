"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Chat from "@/components/Chat";
import { MessageSquare, User, ArrowRight } from "lucide-react";

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_type: "text" | "image" | "audio";
  created_at: string;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
}

interface Diagnostic {
  code: string;
  message: string;
  status: "ok" | "error" | "info";
}

export default function MessagesPage() {
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  const addDiagnostic = (
    code: string,
    message: string,
    status: "ok" | "error" | "info"
  ) => {
    setDiagnostics((prev) => [
      ...prev,
      {
        code,
        message,
        status,
      },
    ]);
  };

  const loadUserAndConversations = useCallback(async () => {
    setLoading(true);
    setDiagnostics([]);

    /*
     * A — التأكد من المستخدم الحالي
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      addDiagnostic("A", `فشل جلب المستخدم: ${userError.message}`, "error");
      setLoading(false);
      return;
    }

    if (!user) {
      addDiagnostic("A", "ما كاش مستخدم مسجل الدخول.", "error");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    addDiagnostic(
      "A",
      `المستخدم الحالي: ${user.id}`,
      "ok"
    );

    /*
     * B — جلب الرسائل المرسلة
     */
    const { data: sentData, error: sentError } = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (sentError) {
      addDiagnostic(
        "B",
        `فشل جلب الرسائل المرسلة: ${sentError.message}`,
        "error"
      );
    } else {
      addDiagnostic(
        "B",
        `الرسائل المرسلة: ${sentData?.length ?? 0}`,
        "ok"
      );
    }

    /*
     * C — جلب الرسائل المستقبلة
     */
    const { data: receivedData, error: receivedError } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });

    if (receivedError) {
      addDiagnostic(
        "C",
        `فشل جلب الرسائل المستقبلة: ${receivedError.message}`,
        "error"
      );
    } else {
      addDiagnostic(
        "C",
        `الرسائل المستقبلة: ${receivedData?.length ?? 0}`,
        "ok"
      );
    }

    if (sentError || receivedError) {
      setLoading(false);
      return;
    }

    const sentMessages = (sentData || []) as MessageRow[];
    const receivedMessages = (receivedData || []) as MessageRow[];

    /*
     * D — دمج كل الرسائل
     */
    const allMessages = [...sentMessages, ...receivedMessages];

    addDiagnostic(
      "D",
      `إجمالي الرسائل التي تم جلبها: ${allMessages.length}`,
      "ok"
    );

    /*
     * E — استخراج الأشخاص الآخرين
     */
    const partnerMap = new Map<string, MessageRow>();

    for (const msg of allMessages) {
      const partnerId =
        msg.sender_id === user.id
          ? msg.receiver_id
          : msg.sender_id;

      if (!partnerId || partnerId === user.id) continue;

      const existing = partnerMap.get(partnerId);

      /*
       * نخلي أحدث رسالة لكل شخص فقط
       */
      if (
        !existing ||
        new Date(msg.created_at).getTime() >
          new Date(existing.created_at).getTime()
      ) {
        partnerMap.set(partnerId, msg);
      }
    }

    const partnersList: Conversation[] = Array.from(
      partnerMap.entries()
    ).map(([partnerId, lastMsg]) => ({
      id: partnerId,
      name: `مستخدم (${partnerId.substring(0, 6)}...)`,
      lastMessage:
        lastMsg.media_type === "text"
          ? lastMsg.content
          : lastMsg.media_type === "image"
          ? "📷 صورة"
          : "🎤 تسجيل صوتي",
      lastTime: lastMsg.created_at,
    }));

    /*
     * ترتيب المحادثات من الأحدث للأقدم
     */
    partnersList.sort(
      (a, b) =>
        new Date(b.lastTime).getTime() -
        new Date(a.lastTime).getTime()
    );

    addDiagnostic(
      "E",
      `عدد المحادثات المستخرجة: ${partnersList.length}`,
      partnersList.length > 0 ? "ok" : "info"
    );

    setConversations(partnersList);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadUserAndConversations();
  }, [loadUserAndConversations]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        جاري تحميل الرسائل...
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">
        الرجاء تسجيل الدخول لعرض الرسائل.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* العنوان */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare
          className="text-orange-500"
          size={24}
        />

        <h1 className="text-2xl font-bold text-white">
          رسائلي ومحادثاتي
        </h1>
      </div>

      {/* لوحة التشخيص */}
      <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden">

        <div className="bg-slate-800 px-4 py-3">
          <h2 className="text-orange-400 font-bold">
            🛠️ تشخيص الرسائل
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            هذه اللوحة مؤقتة لمعرفة أين تتوقف عملية جلب المحادثات.
          </p>
        </div>

        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">

          {diagnostics.map((item, index) => (
            <div
              key={`${item.code}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex gap-2 items-start">

                <span
                  className={`font-black ${
                    item.status === "ok"
                      ? "text-green-400"
                      : item.status === "error"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  [{item.code}]
                </span>

                <span className="text-sm text-slate-200 break-words">
                  {item.message}
                </span>

              </div>
            </div>
          ))}

        </div>

        <button
          onClick={loadUserAndConversations}
          className="m-4 px-4 py-2 rounded-lg bg-orange-500 text-slate-950 font-bold"
        >
          🔄 إعادة التشخيص
        </button>
      </div>

      {/* المحادثات والشات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[60vh]">

        {/* قائمة المحادثات */}
        <div className="border-l border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto max-h-[70vh]">

          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            الأشخاص
          </h2>

          {conversations.length === 0 ? (
            <div className="text-center py-8">

              <p className="text-sm text-slate-500">
                لا توجد محادثات سابقة.
              </p>

              <p className="text-xs text-yellow-500 mt-3">
                شوف لوحة التشخيص فوق باش نعرفو السبب.
              </p>

            </div>
          ) : (
            conversations.map((partner) => (

              <button
                key={partner.id}
                onClick={() => {
                  setActivePartnerId(partner.id);
                  setActivePartnerName(partner.name);
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

        {/* الشات */}
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
