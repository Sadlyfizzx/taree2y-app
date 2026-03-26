import React from 'react';
import { CheckCircle2, Crown, TicketPercent, Wallet } from 'lucide-react';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency } from '../utils/formatting';

const PLANS = [
  {
    key: 'student',
    title: 'باقة الطالب',
    price: 100,
    chips: ['خصم 15%', 'للرحلات المتكررة'],
    points: ['خصم ثابت على كل رحلة', 'مناسبة للتنقل الأسبوعي'],
    tone: 'border-indigo-200 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-900/20',
  },
  {
    key: 'vip',
    title: 'باقة VIP',
    price: 300,
    chips: ['خصم 25%', 'أولوية أعلى'],
    points: ['أفضل قيمة للمستخدم النشط جدًا', 'أنسب لو بتحجز باستمرار'],
    tone: 'border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-900/20',
  },
];

export default function SubscriptionsView({ wallet = 0, subscription = 'none', onManageSubscription }) {
  const currentLabel = subscription === 'vip' ? 'VIP' : subscription === 'student' ? 'طالب' : 'بدون باقة';

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الباقات"
        title="اختَر باقة لو الحجز جزء من روتينك"
        subtitle="بدل ما تفضل الباقات مخفية في الحساب، بقت صفحة مستقلة تشرح القيمة بوضوح."
      />

      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 28%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-white/70">حالة الاشتراك</p>
            <p className="mt-3 text-4xl font-black">{currentLabel}</p>
            <p className="mt-2 text-sm font-bold text-white/80">لو بتحجز باستمرار، الباقة تخلي قرار الحجز أسرع وأوفر.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MetaChip label={`رصيد المحفظة ${formatCurrency(wallet)}`} tone="brand" className="border-white/15 bg-white/10 text-white" />
            <MetaChip label={subscription === 'none' ? 'لم يتم التفعيل' : 'مفعلة حالياً'} tone="brand" className="border-white/15 bg-white/10 text-white" />
          </div>
        </div>
      </section>

      <InlineNotice
        tone="info"
        title="اختيار الباقة بسيط"
        text="راجع مزايا كل باقة، ولو مناسبة ليك كمّل التفعيل من نفس الصفحة."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {PLANS.map((plan) => {
          const isActive = subscription === plan.key;
          return (
            <AppSurface key={plan.key} className={`p-6 ${plan.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{plan.title}</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {plan.points.join(' • ')}
                  </p>
                </div>
                <MetaChip label={formatCurrency(plan.price)} tone="brand" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {plan.chips.map((chip) => (
                  <MetaChip key={chip} label={chip} tone="success" />
                ))}
                {isActive ? <MetaChip label="مفعلة حالياً" tone="warning" /> : null}
              </div>

              <div className="mt-5 space-y-3">
                {plan.points.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <PrimaryButton onClick={onManageSubscription} className="mt-6 w-full" icon={<Crown className="h-5 w-5" />}>
                {isActive ? 'إدارة الباقة' : `فعّل ${plan.title}`}
              </PrimaryButton>
            </AppSurface>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AppSurface className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[20px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
              <TicketPercent className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">الفكرة الأساسية</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                الباقة مفيدة لو هتحجز أكثر من مرة، لأنها تقلل التفكير في كل مرة وتحسن القيمة الإجمالية.
              </p>
            </div>
          </div>
        </AppSurface>
        <AppSurface className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-[20px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">الدفع</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                لو الرصيد الحالي غير كافٍ، اشحن المحفظة أولاً ثم ارجع لتفعيل الباقة من هنا.
              </p>
            </div>
          </div>
        </AppSurface>
      </div>
    </div>
  );
}
