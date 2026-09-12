"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, GhostButton, PrimaryButton } from "@/components/ui";
import { LogOut, Ban, Store, Globe, Info, LogIn, PlayCircle, Camera, Edit3, Check } from "lucide-react";
import Link from "next/link";
import { translations } from "@/lib/i18n";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [hasShop, setHasShop] = useState(false);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<string>("fr");

  // حالات تعديل البروفايل
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("piecesdz_lang") || "fr";
    setLang(savedLang);
  }, []);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem("piecesdz_lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    window.location.reload();
  };

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setChecked(true);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || "");
      setAvatarUrl(profileData.avatar_url || "");
    }

    const { data: shopData } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
    setHasShop(!!shopData);

    const { data: blockedData } = await supabase
      .from("blocked_shops")
      .select("shop_id, shops(name, wilaya)")
      .eq("customer_id", user.id);
    setBlocked(blockedData ?? []);

    setChecked(true);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // رفع الصورة الشخصية
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setAvatarUrl(publicUrlData.publicUrl);
      }
    } catch (err: any) {
      alert("فشل رفع الصورة: " + (err.message || "حدث خطأ ما"));
    } finally {
      setUploading(false);
    }
  };

  // حفظ التعديلات في قاعدة البيانات
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: fullName.trim(), avatar_url: avatarUrl });
      setIsEditing(false);
    } catch (err: any) {
      alert("حدث خطأ أثناء حفظ البيانات: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (shopId: string) => {
    await fetch("/api/blocked-shops", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId }),
    });
    load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const t = translations[lang as keyof typeof translations] || translations.fr;

  if (loading || !checked) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-6">{t.settings}</h1>

      {profile ? (
        <>
          {/* كارت الملف الشخصي القابل للتعديل */}
          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                الملف الشخصي
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/20 font-medium transition"
                >
                  <Edit3 size={14} /> تعديل
                </button>
              ) : (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs text-slate-900 bg-orange-500 hover:bg-orange-400 px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  <Check size={14} /> {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* صورة البروفايل */}
              <div className="relative group">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName || ""}
                    width={72}
                    height={72}
                    className="rounded-full object-cover w-18 h-18 border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-300">
                    {(fullName || profile.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}

                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center cursor-pointer opacity-90 hover:opacity-100 transition">
                    <Camera size={18} className="text-white mb-0.5" />
                    <span className="text-[10px] text-slate-200">
                      {uploading ? "..." : "تغيير"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* بيانات الاسم والايميل */}
              <div className="flex-1 w-full text-center sm:text-right">
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 block">الاسم الكامل:</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-white text-lg">{profile.full_name || "بدون اسم"}</p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5 mb-4">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Store size={16} className="text-orange-400" /> {t.proSpace}</h2>
            {hasShop ? (
              <Link href="/shop"><GhostButton className="w-full">Voir mon tableau de bord vendeur</GhostButton></Link>
            ) : (
              <Link href="/shop/onboarding"><PrimaryButton className="w-full">Créer mon profil professionnel</PrimaryButton></Link>
            )}
          </Card>

          <Card className="p-5 mb-4">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Ban size={16} className="text-slate-400" /> Liste noire</h2>
            {blocked.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun vendeur bloqué</p>
            ) : (
              <div className="flex flex-col gap-2">
                {blocked.map((b: any) => (
                  <div key={b.shop_id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <div>
                      <p className="font-medium text-white text-sm">{b.shops?.name}</p>
                      <p className="text-xs text-slate-500">{b.shops?.wilaya}</p>
                    </div>
                    <GhostButton onClick={() => unblock(b.shop_id)} className="py-1.5 px-3 text-xs">Débloquer</GhostButton>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-6 mb-4 text-center">
          <p className="text-slate-300 mb-4">Connectez-vous pour accéder à votre compte, vos demandes et votre espace vendeur.</p>
          <Link href="/login">
            <PrimaryButton className="w-full"><LogIn size={16} /> {t.login}</PrimaryButton>
          </Link>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Globe size={16} className="text-orange-400" /> Changer la langue</h2>
        <select
          value={lang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 appearance-none"
        >
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Info size={16} className="text-orange-400" /> {t.about}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">
          {t.aboutText}
        </p>

        <div className="mt-2 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-orange-400 uppercase tracking-wider">
            <PlayCircle size={14} />
            <span>Vidéo de présentation</span>
          </div>
          <div className="relative w-full overflow-hidden rounded-xl bg-slate-950 aspect-video border border-slate-800">
            <video
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            >
              <source src="/videos/promo.mp4" type="video/mp4" />
              Votre navigateur ne prend pas en charge la lecture de cette vidéo.
            </video>
          </div>
        </div>
      </Card>

      {profile && (
        <>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10">
            <LogOut size={16} /> {t.logout}
          </button>
          <p className="text-xs text-slate-600 text-center mt-3">
            Pour changer de compte Google, déconnectez-vous puis reconnectez-vous avec un autre compte.
          </p>
        </>
      )}
    </div>
  );
}
