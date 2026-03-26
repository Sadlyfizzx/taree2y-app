import React from 'react';
import { Award, Copy, Crown, ShieldCheck, Sparkles } from 'lucide-react';
import ReferralCard from '../components/ui/ReferralCard';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';

function copyWithFallback(value) {
  const text = String(value || '').trim();
  if (!text) return Promise.resolve(false);

  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve(Boolean(copied));
  } catch {
    return Promise.resolve(false);
  }
}

export default function RewardsView({
  points = 0,
  subscription = 'none',
  referralSummary,
  refreshReferralSummary,
  applyReferralCode,
  showToast,
  openPoints,
  openSubscriptions,
  promoHighlights = [],
  onPromoSearch,
}) {
  const pointsValue = Math.max(0, Number(points) || 0);
  const isGold = pointsValue >= 1000;
  const progress = Math.min(100, (pointsValue / 1000) * 100);
  const subscriptionLabel =
    subscription === 'vip' ? 'VIP' : subscription === 'student' ? 'طالب' : 'بدون باقة';

  const copyPromo = async (offer) => {
    const code = String(offer?.code || '').trim();
    if (!code) return;
    const copied = await copyWithFallback(code);
    showToast(copied ? `تم نسخ الكود ${code}.` : 'تعذر نسخ الكود حالياً.', copied ? 'success' : 'error');
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="المكافآت والمزايا"
        title="كل اللي يكافئ استخدامك في مكان واحد"
        subtitle="النقاط، الدعوات، والعروض الحالية بدون ما تكون مدفونة وسط الحساب أو المحفظة."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 26%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-white/70">رصيد النقاط</p>
                <p className="mt-3 text-5xl font-black">{pointsValue}</p>
                <p className="mt-2 text-sm font-bold text-white/80">
                  {isGold ? 'أنت بالفعل في المستوى الذهبي.' : `فاضلك ${Math.max(0, 1000 - pointsValue)} نقطة للوصول للذهبي.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MetaChip label={isGold ? 'عضو ذهبي' : 'عضو أساسي'} tone="brand" className="border-white/15 bg-white/10 text-white" />
                <MetaChip label={`الباقة: ${subscriptionLabel}`} tone="brand" className="border-white/15 bg-white/10 text-white" />
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={openPoints} icon={<Award className="h-5 w-5" />} className="!bg-white !text-indigo-700 hover:!bg-indigo-50 shadow-none">
                إدارة النقاط
              </PrimaryButton>
              <SecondaryButton onClick={openSubscriptions} icon={<Crown className="h-5 w-5" />} className="border-white/20 bg-white/10 text-white hover:bg-white/15 dark:border-white/20 dark:bg-white/10 dark:text-white">
                الباقات
              </SecondaryButton>
            </div>
          </div>
        </section>

        <AppSurface className="p-6">
          <SectionHeader
            title="إزاي تستفيد أسرع؟"
            subtitle="كل ميزة هنا مرتبطة بخطوة حقيقية داخل التطبيق."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              {
                title: 'استبدال النقاط',
                text: 'كل 500 نقطة تقدر تتحول لرصيد في المحفظة.',
                icon: ShieldCheck,
                tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
              },
              {
                title: 'الدعوات',
                text: 'شارك كودك وخلي أصحابك يبدؤوا من نفس المكان.',
                icon: Gift,
                tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
              },
              {
                title: 'العروض',
                text: 'العروض الحالية تظهر هنا بدل ما تفضل متفرقة.',
                icon: Sparkles,
                tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <span className={`grid h-12 w-12 place-items-center rounded-[20px] ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </AppSurface>
      </div>

      <ReferralCard
        summary={referralSummary}
        onRefresh={refreshReferralSummary}
        onApplyCode={applyReferralCode}
        showToast={showToast}
      />

      <AppSurface className="p-6">
        <SectionHeader
          title="العروض الحالية"
          subtitle="العروض اللي تهمك فعلًا بدل تكديسها في الرئيسية."
        />
        {promoHighlights.length === 0 ? (
          <div className="mt-5">
            <InlineNotice
              tone="neutral"
              title="لا توجد عروض ظاهرة الآن"
              text="لو ظهر عرض مناسب للمسار أو للحساب، هتلاقيه هنا مباشرة."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {promoHighlights.map((offer) => (
              <div
                key={offer.code || offer.title}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      {offer.code ? `كود ${offer.code}` : 'عرض متاح'}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{offer.title}</h3>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-[18px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                  {offer.description || offer.message || 'عرض نشط حاليًا داخل التطبيق.'}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {offer.code ? (
                    <PrimaryButton onClick={() => copyPromo(offer)} icon={<Copy className="h-4 w-4" />} className="flex-1">
                      انسخ الكود
                    </PrimaryButton>
                  ) : null}
                  {offer.routeParams ? (
                    <SecondaryButton
                      onClick={() => onPromoSearch?.(offer.routeParams)}
                      className="flex-1"
                    >
                      افتح المسار
                    </SecondaryButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppSurface>
    </div>
  );
}
