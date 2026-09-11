"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Chat from "@/components/Chat";
import { MessageSquare, User, ArrowRight } from "lucide-react";

export default function MessagesPage() {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadUserAndConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    // جلب كل الرسائل التي أرسلها أو استلمها المستخدم
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !messages) {
      setLoading(false);
      return;
    }

    // استخراج معرفات الأشخاص الآخرين الذين تم التحدث معهم
    const partnerIdsSet = new Set<string>();
    messages.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (partnerId) partnerIdsSet.add(partnerId);
    });

    const partnerIds = Array.from(partnerIdsSet);

    // جلب معلومات هؤلاء الأشخاص (من جدول الـ users أو auth أو shops إن أمكن)
    // هنا نقوم بتخزينهم كقائمة أساسية للمحادثات
    const partnersList = partnerIds.map((id) => {
      const lastMsg = messages.find(
        (m) => m.sender_id === id || m.receiver_id === id
      );
      return {
        id,
        name: `مستخدم (${id.substring(0, 6)}...)`, // يمكن تحسينها لاحقاً لجلب اسم التاجر أو الزبون الحقيقي
        lastMessage: lastMsg ? lastMsg.content : "",
        lastTime: lastMsg ? lastMsg.created_at : "",
      };
    });

    setConversations(partnersList);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadUserAndConversations();
  }, [loadUserAndConversations]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400">جاري تحميل الرسائل...</div>;
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
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="text-orange-500" size={24} />
        <h1 className="text-2xl font-bold text-white">رسائلي ومحادثاتي</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[60vh]">
        {/* قائمة المحادثات (الجانبية) */}
        <div className="border-l border-slate-800 p-4 flex flex-col gap-2 overflow-y-auto max-h-[70vh]">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">الأشخاص</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">لا توجد محادثات سابقة.</p>
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
                    <p className="text-sm font-bold text-white truncate">{partner.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{partner.lastMessage}</p>
                  </div>
                </div>
                <ArrowRight size={15} className="text-slate-600 shrink-0" />
              </button>
            ))
          )}
        </div>

        {/* نافذة الشات النشط */}
        <div className="md:col-span-2 p-4 flex flex-col justify-center">
          {activePartnerId ? (
            <div>
              <div className="mb-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  محادثة مع: {activePartnerName}
                </span>
              </div>
              <Chat currentUserId={currentUserId} receiverId={activePartnerId} />
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">اختر محادثة من القائمة الجانبية لبدء الدردشة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
