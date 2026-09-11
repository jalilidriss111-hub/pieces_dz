import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Search, Store, MapPin, Zap, Clock, Bell, CheckCircle2 } from "lucide-react";
import PricingModal from "@/components/PricingModal";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="pb-12 relative text-right dir-rtl">
      {/* نافذة الاشتراكات المنبثقة */}
      <PricingModal />

      {/* قسم الواجهة الرئيسية (Hero Section) */}
      <section className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-orange-500/10 text-orange-400 border-orange-500/30">
                <Zap size={13} /> سوق قطع الغيار الإلكتروني الأول في الجزائر
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
              ابحث عن قطعة غيار سيارتك،<br />
              <span className="text-orange-500">من تجار وورشات الجزائر مباشرة.</span>
            </h1>
            
            <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-xl leading-relaxed">
              انشر طلبك خلال ثوانٍ ليصل فوراً إلى محلات قطع الغيار والورشات، واستقبل أفضل العروض والأسعار بدون عناء التنقل.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                href={user ? "/search" : "/login"} 
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-orange-500 text-slate-950 font-bold hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/10"
              >
                <Search size={19} /> طلب قطعة غيار الآن
              </Link>
              <Link 
                href={user ? "/shop/onboarding" : "/login"} 
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-slate-700 text-slate-200 font-medium hover:border-slate-500 hover:bg-slate-900/50 transition-all"
              >
                <Store size={19} /> تسجيل حساب تاجر
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* قسم كيف تعمل المنصة (بديل الأرقام والإحصائيات) */}
        <section className="py-14 border-b border-slate-800">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">كيف تعمل منصة PiecesDZ؟</h2>
            <p className="text-slate-400 text-sm">خطوات بسيطة لتصل إلى القطعة التي تبحث عنها بأفضل سعر</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-right">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                <Search size={22} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">1. اكتب تفاصيل القطعة</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                حدد نوع المركبة، سنة التصنيع، واذكر اسم القطعة المطلوبة مع إمكانية إضافة صورة للقطعة.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-right">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                <Bell size={22} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">2. يصل طلبك للتجار</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                يتم تنبيه شبكة التجار والمحلات المتخصصة في نوع سيارتك لاستقبال طلبك فوراً.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-right">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">3. قارن العروض واختر الأنسب</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                استقبل الردود والأسعار مباشرة من التجار، وتواصل مع صاحب أفضل عرض لإتمام الشراء.
              </p>
            </div>
          </div>
        </section>

        {/* قسم ميزات المنصة (بديل الأقسام والأخبار) */}
        <section className="py-14">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                حل متكامل لأصحاب السيارات وتجار قطع الغيار
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                نربط بين الزبون والتاجر بشكل مباشر وبدون وسطاء، مما يسهل عملية البحث ويوفر الوقت والمجهود على الطرفين.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-orange-500/10 text-orange-400 mt-1">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">توفير الوقت والجهد</h4>
                    <p className="text-xs text-slate-400">لا داعي للتنقل بين المحلات، انشر طلبك واستقبل العروض وأنت في مكانك.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-orange-500/10 text-orange-400 mt-1">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">تغطية واسعة</h4>
                    <p className="text-xs text-slate-400">تواصل مع تجار محليين في ولايتك أو من مختلف الولايات للقطع النادرة.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* كارت توجيهي للتجار */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-4">
                <Store size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">هل تملك محل قطع غيار أو ورشة؟</h3>
              <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto leading-relaxed">
                سجل حسابك التجاري الآن واستقبل طلبات قطع الغيار اليومية من الزبائن في منطقتك وزد مبيعاتك.
              </p>
              <Link 
                href={user ? "/shop/onboarding" : "/login"}
                className="inline-block w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors border border-slate-700"
              >
                إنشاء حساب تجاري جديد
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
