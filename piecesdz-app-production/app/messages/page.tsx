"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Chat from "@/components/Chat";
import { MessageSquare, User, ArrowLeft, Search, Loader2 } from "lucide-react";

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
  avatarUrl?: string;
  lastMessage: string;
  lastTime: string;
}

export default function MessagesPage() {
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState<string>("");
  const [activePartnerAvatar, setActivePartnerAvatar] = useState<string | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);

  const loadUserAndConversations = useCallback(async () => {
    setLoading(true);

    // 1. جلب المستخدم الحالي
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    // 2. جلب الرسائل (المرسلة والمستقبلة)
    const [sentRes, receivedRes] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const sentMessages = (sentRes.data || []) as MessageRow[];
    const receivedMessages = (receivedRes.data || []) as MessageRow[];
    const allMessages = [...sentMessages, ...receivedMessages];

    // 3. استخراج الأشخاص وآخر رسالة لكل شخص
    const partnerMap = new Map<string, MessageRow>();

    for (const msg of allMessages) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerId || partnerId === user.id) continue;

      const existing = partnerMap.get(partnerId);
      if (!existing || new Date(msg.created_at).getTime() > new Date(existing.created_at).getTime()) {
        partnerMap.set(partnerId, msg);
      }
    }

    const partnerIds = Array.from(partnerMap.keys());

    if (partnerIds.length === 0) {
      setConversations([]);
      setFilteredConversations([]);
      setLoading(false);
      return;
    }

    // 4. جلب البروفايلات (الأسماء والصور) الخاصة بكل الأشخاص
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);

    const profilesMap = new Map<string, { full_name?: string; avatar_url?: string }>();
    if (profiles) {
      profiles.forEach((p) => profilesMap.set(p.id, p));
    }

    // 5. بناء قائمة المحادثات النهائية
    const partnersList: Conversation[] = partnerIds.map((partnerId) => {
      const lastMsg = partnerMap.get(partnerId)!;
      const profile = profilesMap.get(partnerId);

      const formattedName =
        profile?.full_name?.trim() || `مستخدم (${partnerId.substring(0, 6)})`;

      return {
        id: partnerId,
        name: formattedName,
        avatarUrl: profile?.avatar_url || undefined,
        lastMessage:
          lastMsg.media_type === "text"
            ? lastMsg.content
            : lastMsg.media_type === "image"
            ? "📷 صورة"
            : "🎤 تسجيل صوتي",
        lastTime: lastMsg.created_at,
      };
    });

    // ترتيب المحادثات من الأحدث للأقدم
    partnersList.sort(
      (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );

    setConversations(partnersList);
    setFilteredConversations(partnersList);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadUserAndConversations();
  }, [loadUserAndConversations]);

  // تصفية المحادثات عند البحث
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      setFilteredConversations(
        conversations.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, conversations]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm">جاري تحميل المحادثات...</p>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl mt-8">
        <p className="text-base font-medium">الرجاء تسجيل الدخول لعرض رسائلك ومحادثاتك.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* العنوان الرئيسية */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <MessageSquare size={22} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">رسائلي ومحادثاتي</h1>
          <p className="text-xs text-slate-400 mt-0.5">تواصل مباشرة مع المشترين والبائعين</p>
        </div>
      </div>

      {/* حاوية المحادثات والشات */}
      <div className="grid grid-cols-1 md:grid-cols-12 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[650px] shadow-xl">
        
        {/* قائمة المحادثات (الجانب الأيمن) */}
        <div
          className={`md:col-span-4 lg:col-span-4 border-l border-slate-800 flex flex-col bg-slate-950/40 ${
            activePartnerId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* شريط البحث */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="بحث في المحادثات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* قائمة الأشخاص */}
          <div className="p-3 flex flex-col gap-1.5 overflow-y-auto max-h-[580px] custom-scrollbar flex-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-slate-500 font-medium">لا توجد محادثات.</p>
              </div>
            ) : (
              filteredConversations.map((partner) => {
                const isActive = activePartnerId === partner.id;
                return (
                  <button
                    key={partner.id}
                    onClick={() => {
                      setActivePartnerId(partner.id);
                      setActivePartnerName(partner.name);
                      setActivePartnerAvatar(partner.avatarUrl);
                    }}
                    className={`w-full text-right p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? "bg-orange-500/10 border border-orange-500/30 text-white"
                        : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      {/* الصورة الشخصية */}
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {partner.avatarUrl ? (
                          <img
                            src={partner.avatarUrl}
                            alt={partner.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-orange-400" />
                        )}
                      </div>

                      {/* الاسم وآخر رسالة */}
                      <div className="overflow-hidden text-right min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className="text-sm font-bold text-white truncate">{partner.name}</p>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(partner.lastTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{partner.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* نافذة الشات (الجانب الأيسر) */}
        <div
          className={`md:col-span-8 lg:col-span-8 flex flex-col justify-between bg-slate-900 ${
            !activePartnerId ? "hidden md:flex" : "flex"
          }`}
        >
          {activePartnerId ? (
            <div className="flex flex-col h-full">
              {/* هيدر الشات للموبايل (مع زر عودة) */}
              <div className="md:hidden p-3 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
                <button
                  onClick={() => setActivePartnerId(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <ArrowLeft size={18} className="rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                    {activePartnerAvatar ? (
                      <img src={activePartnerAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-orange-400" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-white">{activePartnerName}</span>
                </div>
              </div>

              {/* مكون المحادثة الأصلي */}
              <div className="flex-1 p-2 sm:p-4">
                <Chat currentUserId={currentUserId} receiverId={activePartnerId} />
              </div>
            </div>
          ) : (
            <div className="text-center py-24 px-4 flex flex-col items-center justify-center my-auto text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-center justify-center mb-4 text-orange-500/50">
                <MessageSquare size={32} />
              </div>
              <p className="text-base font-bold text-slate-300">اختر محادثة لبدء الدردشة</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                انقر على أحد الأشخاص من القائمة الجانبية لعرض الرسائل المتبادلة بينكما.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
