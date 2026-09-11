import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية وإخلاء المسؤولية | PiecesDZ",
  description: "سياسة الخصوصية، حماية البيانات، وشروط الاستخدام الخاصة بـ PiecesDZ.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 text-slate-200 dir-rtl text-right" dir="rtl">
      <h1 className="text-3xl font-bold mb-3 text-white">سياسة الخصوصية وإخلاء المسؤولية</h1>
      <p className="text-sm text-slate-400 mb-8">آخر تحديث: {new Date().toLocaleDateString('ar-DZ')}</p>

      <section className="space-y-6 text-slate-300 leading-relaxed">
        <p>
          مرحباً بك في منصة <strong>PiecesDZ</strong>. تم وضع هذه السياسة لحماية حقوق كافة الأطراف ولتوضيح الحدود القانونية والتقنية لتشغيل المنصة. استخدامك للموقع يعني موافقتك التامة على هذه الشروط.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. طبيعة المنصة وإخلاء المسؤولية القانونية</h2>
        <p>
          تُعتبر منصة <strong>PiecesDZ</strong> مجرد وسيط تقني يهدف لإتاحة مساحة تواصل بين المشترين والتجار (محلات قطع الغيار، الكاس، والورشات). بناءً على ذلك:
        </p>
        <ul className="list-disc pr-6 space-y-2">
          <li><strong>إخلاء المسؤولية عن المعاملات:</strong> المنصة <strong>غير مسؤولة إطلاقاً</strong> عن أي عملية بيع، شراء، أو اتفاق مالي يتم بين الأطراف.</li>
          <li><strong>الحماية من الاحتيال:</strong> المنصة لا تتحمل أي مسؤولية قانونية أو مالية في حالة حدوث حالات احتيال، تزوير، أو عدم مطابقة للقطع المبيعة. المعاملة تتم على مسؤولية الطرفين الخاصة بالكامل.</li>
          <li><strong>حدود التدخل:</strong> عمليات التواصل والتفاوض تتم في سرية تامة بين المشتري والبائع، ولا تملك إدارة المنصة أي صلاحية للتدخل في المعاملات المالية، فحص القطع، أو الفصل في النزاعات التجاريّة.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. المعلومات التي نجمعها</h2>
        <p>نجمع البيانات الأساسية والضرورية فقط لضمان تشغيل الخدمة بشكل صحيح:</p>
        <ul className="list-disc pr-6 space-y-2">
          <li><strong>بيانات الحساب:</strong> الاسم الكامل، رقم الهاتف، البريد الإلكتروني، ونوع الحساب (مشتري، بائع، كاس، ورشة صيانة).</li>
          <li><strong>بيانات الطلبات:</strong> صور القطع المطلوب البحث عنها، وصف الحالة، ونوع المركبة.</li>
          <li><strong>بيانات التصفح:</strong> عنوان IP وبيانات الجلسة لضمان أمان الموقع وتفادي الاستخدام المغرض.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. سرية وأمان البيانات</h2>
        <p>
          تلتزم <strong>PiecesDZ</strong> بالحفاظ على سرية بياناتك الشخصية وعدم بيعها أو مشاركتها مع أي جهات تسويقية خارجية. يتم تشفير البيانات واستخدام بروتوكولات حماية متطورة (HTTPS) لمنع أي وصول غير مصرح به.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. حقوق المستخدم والتعديل</h2>
        <p>
          يحق لك في أي وقت طلب تعديل أو حذف بياناتك وحسابك نهائياً من قاعدة بياناتنا. كما تحتفظ إدارة المنصة بحظر أي حساب يقدم بلاغات كاذبة أو يمارس أنشطة مشبوهة دون إشعار مسبق.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. الدعم الفني والتواصل الرسمي</h2>
        <p>
          لأي استفسارات تقنية، بلاغات عن حسابات مخالفة، أو طلبات متعلقة بالخصوصية والحسابات، يمكنك التواصل مباشرة مع فريق الدعم الفني عبر البريد الإلكتروني الرسمي:
        </p>
        <p className="mt-3 font-mono text-emerald-400 bg-slate-900 p-3 rounded-lg border border-slate-800 text-left dir-ltr w-fit">
          pieces.dz.support@gmail.com
        </p>
      </section>
    </main>
  );
}
