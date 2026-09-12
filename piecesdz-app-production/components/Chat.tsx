هذان هما التعديلان الكاملان للملفين، منظّمان ومتوافقان مع تصميم منصتك:
### 1. تعديل صفحة الإعدادات (SettingsPage.tsx)
تمت إضافة إمكانية تعديل **الاسم الكامل** و**تغيير الصورة الشخصية** مع رفعها مباشرة إلى Supabase Storage.
```tsx
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

```
### 2. تعديل مكون المحادثة (Chat.tsx)
تم حل جميع المشاكل السابقة:
 * **حذف كلي لوحة التشخيص ورسائل الكونسول.**
 * **عرض اسم وصورة المستلم الحقيقية أعلى المحادثة** مع اختصار الـ UUID بأسلوب محترف (UUID: 8a2f...).
 * **إعادة تصميم شريط الإرسال (Input Area):** تصميم واسع ومريح على جميع الهواتف الذكية (بدون الحاجة لتدوير الشاشة)، مع زر إرسال يظهر بوضوح وأزرار مريحة لإرسال الصور والوسائط.
```tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

interface TargetProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Chat({ currentUserId, receiverId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetProfile, setTargetProfile] = useState<TargetProfile | null>(null);
  const [resolvingId, setResolvingId] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. تحويل المعرف وجلب بروفايل المستلم (الاسم + الصورة)
  useEffect(() => {
    let isMounted = true;

    async function resolveReceiver() {
      if (!receiverId) {
        if (isMounted) setResolvingId(false);
        return;
      }

      setResolvingId(true);

      try {
        let actualUserId = receiverId;

        // التحقق أولاً إن كان shop_id
        const { data: shop } = await supabase
          .from('shops')
          .select('owner_id, user_id')
          .eq('id', receiverId)
          .maybeSingle();

        if (shop) {
          actualUserId = shop.owner_id || shop.user_id || receiverId;
        }

        if (isMounted) {
          setTargetUserId(actualUserId);

          // جلب اسم وصورة المستلم من جدول profiles
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', actualUserId)
            .maybeSingle();

          if (prof) {
            setTargetProfile(prof);
          } else {
            setTargetProfile({
              id: actualUserId,
              full_name: 'مستخدم',
              avatar_url: null,
            });
          }
        }
      } catch (err) {
        if (isMounted) setTargetUserId(receiverId);
      } finally {
        if (isMounted) setResolvingId(false);
      }
    }

    resolveReceiver();

    return () => {
      isMounted = false;
    };
  }, [receiverId]);

  // 2. جلب الرسائل
  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (data) setMessages(data as Message[]);
    } catch (error) {
      // تجاهل الأخطاء بهدوء
    }
  }, [currentUserId, targetUserId]);

  useEffect(() => {
    if (resolvingId || !targetUserId) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [resolvingId, targetUserId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. إرسال نص
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const text = newMessage.trim();
    if (!text || !currentUserId || !targetUserId) return;

    setNewMessage('');

    try {
      await supabase.from('messages').insert([
        {
          sender_id: currentUserId,
          receiver_id: targetUserId,
          content: text,
          media_type: 'text',
        },
      ]);
      fetchMessages();
    } catch (error) {
      setNewMessage(text);
    }
  };

  // 4. إرسال صورة
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !targetUserId) return;

    const file = files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          await supabase.from('messages').insert([
            {
              sender_id: currentUserId,
              receiver_id: targetUserId,
              content: publicUrlData.publicUrl,
              media_type: 'image',
            },
          ]);
          fetchMessages();
        }
      }
    } catch (err) {
      //
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[75vh] max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* هيدر المحادثة: يظهر اسم وصورة المستقبل والـ UUID بشكل مختصر */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800">
        {targetProfile?.avatar_url ? (
          <Image
            src={targetProfile.avatar_url}
            alt={targetProfile.full_name || ''}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover border border-slate-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-orange-400">
            {(targetProfile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white truncate">
            {targetProfile?.full_name || 'مستخدم'}
          </h2>
          <p className="text-[11px] text-slate-500 truncate font-mono">
            UUID: {targetUserId ? `${targetUserId.substring(0, 8)}...` : '...'}
          </p>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
        {resolvingId ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2">
            <Loader2 size={16} className="animate-spin text-orange-500" />
            جاري تحضير المحادثة...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            لا توجد رسائل بعد. ابدأ المحادثة الآن!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                    isMe
                      ? 'bg-orange-500 text-slate-950 font-medium rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {msg.media_type === 'text' && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {msg.media_type === 'image' && (
                    <img
                      src={msg.content}
                      alt="مرفق"
                      className="max-w-full max-h-60 rounded-lg object-cover"
                    />
                  )}

                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      isMe ? 'text-slate-900/70' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* شريط الرفع إن وجد */}
      {uploading && (
        <div className="px-4 py-1 bg-slate-950 text-center text-xs text-orange-400 border-t border-slate-800">
          جاري رفع الصورة...
        </div>
      )}

      {/* شريط كتابة وإرسال الرسائل الجديد - مريح وواسع على الهاتف */}
      <form
        onSubmit={sendMessage}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <label
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition border border-slate-700 shrink-0"
          title="إرسال صورة"
        >
          <ImageIcon size={18} />
          <input
            type="file"
            accept="image/*"
            disabled={resolvingId || uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <input
          type="text"
          value={newMessage}
          disabled={resolvingId}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={resolvingId ? 'جاري الاتصال...' : 'اكتب رسالتك...'}
          className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 transition min-w-0"
        />

        <button
          type="submit"
          disabled={resolvingId || !newMessage.trim()}
          className="p-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:hover:bg-orange-500 text-slate-950 font-bold rounded-xl transition shrink-0 flex items-center justify-center"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

```
