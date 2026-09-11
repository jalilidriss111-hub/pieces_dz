"use client";

import { useState, useEffect } from "react";
import { Check, X, Star, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";

export default function PricingPage() {
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // قراءة المتغير البيئي فور تحميل المكون في المتصفح
    const isEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS === "true";
    setShowSubscriptions(isEnabled);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500">Chargement...</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-slate-200 dir-rtl text-right" dir="rtl">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">خطط الاشتراكات للتجار والمحلات</h1>
        <p className="text-slate-400 text-sm">
          اختر الخطة المناسبة لنشاطك التجاري وزد من مبيعاتك عبر الوصول لآلاف المشترين يومياً.
        </p>
      </div>

      {!showSubscriptions ? (
        /* العرض المجاني المؤقت لمدة شهرين */
        <Card className="p-8 text-center border-emerald-500/30 bg-emerald-950/20 max-w-xl mx-auto">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">المنصة مجانية بالكامل حالياً!</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            بمناسبة إطلاق منصة <strong>PiecesDZ</strong>، جميع الميزات والخدمات متاحة مجاناً لكل التجار والمحلات والورشات لمدة شهرين. استغل الفرصة وأنشئ حسابك الآن!
          </p>
          <Link href="/shop/onboarding">
            <PrimaryButton className="w-full">إنشاء حساب تجاري مجاناً</PrimaryButton>
          </Link>
        </Card>
      ) : (
        /* جدول خطط الاشتراكات الثلاث بعد انقضاء المهلة المجانية */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. الخطة المجانية */}
          <Card className="p-6 flex flex-col justify-between border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">مجاني</h3>
              <p className="text-xs text-slate-400 mb-4">تجربة محددة جداً لتجربة المنصة</p>
              <div className="text-2xl font-bold text-white mb-6">0 <span className="text-xs text-slate-400 font-normal">دج</span></div>
              <ul className="space-y-3 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> الرد على عرض واحد فقط كل 3 أيام</li>
                <li className="flex items-center gap-2 text-slate-500"><X size={14} className="text-red-400" /> لا يمكنك النشر في قسم الأخبار (Nouveautés)</li>
                <li className="flex items-center gap-2 text-slate-500"><X size={14} className="text-red-400" /> لا توجد إشعارات بالطلبات الجديدة</li>
                <li className="flex items-center gap-2 text-slate-500"><X size={14} className="text-red-400" /> ملف تجاري عادي بدون شارة التوثيق</li>
              </ul>
            </div>
            <Link href="/shop/onboarding">
              <GhostButton className="w-full">البدء بالحساب المجاني</GhostButton>
            </Link>
          </Card>

          {/* 2. الخطة الفضية */}
          <Card className="p-6 flex flex-col justify-between border-orange-500/50 bg-slate-900/80 relative">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                الفضي <ShieldCheck size={16} className="text-slate-300" />
              </h3>
              <p className="text-xs text-slate-400 mb-4">للمحلات والورشات النشطة</p>
              <div className="text-2xl font-bold text-orange-400 mb-6">1,000 <span className="text-xs text-slate-400 font-normal">دج / شهرياً</span></div>
              <ul className="space-y-3 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400" /> ردود غير محدودة على كل الطلبات</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400" /> إمكانية النشر في قسم الأخبار (Nouveautés)</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400" /> إشعارات فورية لطلبات ولايتك</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400" /> شارة تاجر موثوق (Vendeur Vérifié)</li>
              </ul>
            </div>
            <Link href="/checkout?plan=silver">
              <PrimaryButton className="w-full">اشتراك في الفضي</PrimaryButton>
            </Link>
          </Card>

          {/* 3. الخطة الذهبية */}
          <Card className="p-6 flex flex-col justify-between border-amber-500 bg-amber-950/10 relative">
            <div className="absolute -top-3 right-4 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={10} fill="currentColor" /> الأفضل قيمة
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">الذهبي</h3>
              <p className="text-xs text-slate-400 mb-4">للكاس والمحلات الكبرى (اشتراك سنوي)</p>
              <div className="text-2xl font-bold text-white mb-6">15,000 <span className="text-xs text-slate-400 font-normal">دج / سنوياً</span></div>
              <ul className="space-y-3 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> كل ميزات الخطة الفضية بلا حدود</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> نشر لا محدود في قسم الأخبار (Nouveautés)</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> أولوية الظهور في أعلى نتائج البحث</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400" /> إضافة موقع المحل على Google Maps</li>
              </ul>
            </div>
            <Link href="/checkout?plan=gold">
              <PrimaryButton className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950">اشتراك في الذهبي</PrimaryButton>
            </Link>
          </Card>

        </div>
      )}
    </main>
  );
}
