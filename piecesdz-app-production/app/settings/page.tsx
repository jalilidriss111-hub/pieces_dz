"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Settings, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileData {
  id?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  wilaya?: string;
  [key: string]: any;
}

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      const data = profileData as ProfileData;
      setFullName(data.full_name || "");
      setAvatarUrl(data.avatar_url || "");
      setPhone(data.phone || "");
      setWilaya(data.wilaya || "");
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      phone,
      wilaya,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء حفظ التغييرات. يرجى المحاولة لاحقاً." });
    } else {
      setMessage({ type: "success", text: "تم حفظ الإعدادات والملف الشخصي بنجاح!" });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl mt-8">
        <p className="text-base font-medium">الرجاء تسجيل الدخول للوصول إلى الإعدادات.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* العنوان الرئيسي */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">إعدادات الحساب</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">إدارة بياناتك الشخصية وتفاصيل حسابك</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* الصورة الشخصية */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-800">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-orange-400" />
              )}
            </div>
            <div className="flex-1 w-full space-y-1.5 text-center sm:text-right">
              <label className="block text-xs font-semibold text-slate-300">رابط الصورة الشخصية (Avatar URL)</label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* الاسم الكامل */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">الاسم الكامل</label>
            <input
              type="text"
              required
              placeholder="أدخل اسمك الكامل"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* رقم الهاتف والولاية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">رقم الهاتف</label>
              <input
                type="tel"
                placeholder="06XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">الولاية</label>
              <input
                type="text"
                placeholder="مثال: قسنطينة، الجزائر..."
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* زر الحفظ */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
