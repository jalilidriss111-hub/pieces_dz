"use client";

import { useState } from "react";
import { Check, X, Star, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";

interface PricingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function PricingModal({ isOpen = true, onClose }: PricingModalProps) {
  const [visible, setVisible] = useState(isOpen);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8">
        {/* زر الإغلاق X */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white bg-slate-900/80 p-2 rounded-full border border-slate-700/50 transition-colors"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>

        {/* العنوان */}
        <div className="text-center max-w-xl mx-auto mb-8 mt-2">
          <h2 className="text-2xl font-bold text-white mb-2">اختر الخطة المناسبة لمتجرك</h2>
          <p className="text-slate-400 text-xs">
            قم بترقية حسابك للوصول لجميع الطلبات اليومية وزيادة مبيعات قطع الغيار.
          </p>
        </div>

        {/* كروت الاشتراكات الثلاثة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          
          {/* 1. الخطة المجانية */}
          <Card className="p-5 flex flex-col justify-between border-slate-800 bg-slate-900/50">
            <div>
              <h3 className="text-base font-bold text-white mb-1">مجاني</h3>
              <p className="text-[11px] text-slate-400 mb-3">لتجربة المنصة</p>
              <div className="text-xl font-bold text-white mb-4">
                0 <span className="text-xs text-slate-400 font-normal">دج</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> الرد على عرض واحد كل 3 أيام</li>
                <li className="flex items-center gap-2 text-slate-500"><X size={14} className="text-red-400 shrink-0" /> لا يمكنك النشر في الأخبار</li>
                <li className="flex items-center gap-2 text-slate-500"><X size={14} className="text-red-400 shrink-0" /> بدون إشعارات للطلبات</li>
              </ul>
            </div>
            <GhostButton onClick={handleClose} className="w-full text-xs py-2">
              متابعة بالمجاني
            </GhostButton>
          </Card>

          {/* 2. الخطة الفضية */}
          <Card className="p-5 flex flex-col justify-between border-orange-500/50 bg-slate-900/90 relative">
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
                الفضي <ShieldCheck size={16} className="text-orange-400" />
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">للمحلات والورشات النشطة</p>
              <div className="text-xl font-bold text-orange-400 mb-4">
                1,000 <span className="text-xs text-slate-400 font-normal">دج / شهرياً</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400 shrink-0" /> ردود غير محدودة على الطلبات</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400 shrink-0" /> النشر في Nouveautés</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400 shrink-0" /> إشعارات فورية لطلبات ولايتك</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-orange-400 shrink-0" /> شارة تاجر موثوق</li>
              </ul>
            </div>
            <Link href="/checkout?plan=silver" onClick={handleClose}>
              <PrimaryButton className="w-full text-xs py-2">اشترك في الفضي</PrimaryButton>
            </Link>
          </Card>

          {/* 3. الخطة الذهبية */}
          <Card className="p-5 flex flex-col justify-between border-amber-500 bg-amber-950/20 relative">
            <div className="absolute -top-3 right-4 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={10} fill="currentColor" /> الأكثر طلباً
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400 mb-1">الذهبي</h3>
              <p className="text-[11px] text-slate-400 mb-3">للمحلات الكبرى (سنوي)</p>
              <div className="text-xl font-bold text-white mb-4">
                15,000 <span className="text-xs text-slate-400 font-normal">دج / سنوياً</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> كل ميزات الخطة الفضية</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> أولوية الظهور في نتائج البحث</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-amber-400 shrink-0" /> إضافة موقعك على Google Maps</li>
              </ul>
            </div>
            <Link href="/checkout?plan=gold" onClick={handleClose}>
              <PrimaryButton className="w-full text-xs py-2 bg-amber-500 hover:bg-amber-600 text-slate-950">
                اشترك في الذهبي
              </PrimaryButton>
            </Link>
          </Card>

        </div>

        {/* خانة إعلان الإطلاق المجاني */}
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center text-orange-400 text-xs font-medium">
          🎉 بمناسبة إطلاق المنصة، يتاح لكم استعمال مجاني تام لمدة 3 أشهر كاملة دون أي رسوم!
        </div>
      </div>
    </div>
  );
}
