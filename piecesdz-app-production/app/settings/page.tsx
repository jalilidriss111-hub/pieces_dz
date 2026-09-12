"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  ShieldCheck,
  Info,
  LogOut,
  ExternalLink,
  Upload,
} from "lucide-react";

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "account" | "language" | "about">("profile");

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");

  const [language, setLanguage] = useState<"ar" | "fr" | "en">("ar");
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    setUserEmail(user.email || "");

    const { data: profileData } = await (supabase.from("profiles") as any)
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

  // رفع الصورة الشخصية مباشرة من الهاتف
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const ext = file.type.split("/")[1] || "jpg";
      const filePath = `avatars/${userId}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(data.path);
      setAvatarUrl(publicData.publicUrl);
      setMessage({ type: "success", text: "تم رفع الصورة من الهاتف بنجاح! اضغط حفظ التغييرات." });
    } catch (err) {
      setMessage({ type: "error", text: "تعذر رفع الصورة. تأكد من إعدادات الحجم والمساحة." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // حفظ الملف الشخصي
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMessage(null);

    const { error } = await (supabase.from("profiles") as any).upsert({
      id: userId,
      full_name: fullName,
      avatar_url: avatarUrl,
      phone,
      wilaya,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء حفظ التغييرات." });
    } else {
      setMessage({ type: "success", text: "تم حفظ البيانات بنجاح!" });
    }

    setSaving(false);
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: "حدث خطأ أثناء الاتصال بحساب قوقل." });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">إعدادات الحساب والموقع</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">إدارة الملف الشخصي، الأمان، واللغة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* الشريط الجانبي */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-right ${
              activeTab === "profile"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <User size={18} />
            <span>الملف الشخصي</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-right ${
              activeTab === "account"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <ShieldCheck size={18} />
            <span>الأمان وتسجيل قوقل</span>
          </button>

          <button
            onClick={() => setActiveTab("language")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-right ${
              activeTab === "language"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Globe size={18} />
            <span>تغيير اللغة</span>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-right ${
              activeTab === "about"
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Info size={18} />
            <span>حول الموقع</span>
          </button>
        </div>

        {/* محتوى الصفحة */}
        <div className="md:col-span-8 lg:col-span-9 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h2 className="text-base font-bold text-white mb-4 border-b border-slate-800 pb-3">بيانات الملف الشخصي</h2>

              {/* رفع الصورة من الهاتف */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-slate-800/80">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-orange-400" />
                  )}
                </div>

                <div className="flex-1 w-full space-y-2 text-center sm:text-right">
                  <span className="block text-xs font-semibold text-slate-300">الصورة الشخصية</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white font-medium flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={14} className="animate-spin text-orange-500" />
                    ) : (
                      <Upload size={14} className="text-orange-400" />
                    )}
                    <span>اختر صورة من الهاتف</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">رقم الهاتف</label>
                  <input
                    type="tel"
                    placeholder="06XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">الولاية</label>
                  <input
                    type="text"
                    placeholder="مثال: قسنطينة..."
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>حفظ التغييرات</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === "account" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">الأمان والحساب</h2>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">البريد الإلكتروني:</span>
                <p className="text-sm font-semibold text-white bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {userEmail}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-white">التسجيل والربط عبر Google</h3>
                <p className="text-xs text-slate-400">سجل الدخول السريع أو اربط حسابك بـ Google بضغطة زر واحدة.</p>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>متابعة باستخدام Google</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-semibold flex items-center gap-2"
                >
                  <LogOut size={16} />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "language" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">إعدادات اللغة</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("ar")}
                  className={`p-4 rounded-xl border text-center ${
                    language === "ar" ? "bg-orange-500/10 border-orange-500 text-orange-400 font-bold" : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <p className="text-sm">العربية (Ar)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("fr")}
                  className={`p-4 rounded-xl border text-center ${
                    language === "fr" ? "bg-orange-500/10 border-orange-500 text-orange-400 font-bold" : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <p className="text-sm">Français (Fr)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`p-4 rounded-xl border text-center ${
                    language === "en" ? "bg-orange-500/10 border-orange-500 text-orange-400 font-bold" : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <p className="text-sm">English (En)</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">عن منصة PiecesDZ</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                منصة جزايرية متخصصة في ربط أصحاب السيارات بقطع الغيار والموردين مباشرة.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>إصدار التطبيق:</span>
                  <span className="font-mono text-white">v1.0.0</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
