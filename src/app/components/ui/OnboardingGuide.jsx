import { useMemo, useState } from 'react';
import {
  Armchair,
  ChevronLeft,
  Clock,
  Map,
  Search,
  Sparkles,
  Ticket,
  Wallet as WalletIcon,
} from 'lucide-react';
import ModalShell from './ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <Search className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'دوّر بسرعة على الرحلة المناسبة',
    text: 'اختار محافظة التحرك والوصول، وحدد يوم السفر وعدد الركاب. أهم حاجة راقب اسم المحطة نفسها قبل ما تختار الرحلة.',
    hint: 'بص على المحطة قبل المدينة عشان تبقى عارف هتتحرك منين بالضبط.',
  },
  {
    key: 'seats',
    icon: <Armchair className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'اختيار المقاعد بشكل واضح',
    text: 'المقاعد الفاضية والمحجوزة والمتثبتة لكل واحدة حالة مختلفة. اختار العدد المطلوب فقط وكمل بعدها مباشرة.',
    hint: 'لو كرسي اتاخد أثناء الاختيار التطبيق هيقولك فورًا.',
  },
  {
    key: 'checkout',
    icon: <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'راجع وادفع من غير لخبطة',
    text: 'في خطوة الدفع هتراجع الرحلة والمقاعد والسعر النهائي والرصيد المتاح أو أي خصم قبل التأكيد.',
    hint: 'لو الرصيد مش كفاية هتلاقي الشحن من نفس المكان.',
  },
  {
    key: 'ticket',
    icon: <Ticket className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'التذكرة جاهزة بعد الحجز',
    text: 'بعد الحجز مباشرة التذكرة تبقى جاهزة برقم الحجز، المحطة، المقاعد، والـ QR داخل قسم التذاكر ورحلاتك.',
    hint: 'افتح التذكرة قبل السفر وراجع الوقت والمحطة.',
  },
  {
    key: 'tracking',
    icon: <Map className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'تابع حالة الرحلة بسهولة',
    text: 'من شاشة التذكرة تقدر تفتح المتابعة وتشوف هل الرحلة لسه في الانتظار أو اتحركت أو قربت توصل.',
    hint: 'المتابعة تفهمك الحالة الحالية لكنها مش GPS مباشر.',
  },
  {
    key: 'refund',
    icon: <Clock className="h-5 w-5 sm:h-6 sm:w-6" />,
    title: 'الإلغاء والاسترداد واضحين',
    text: 'لو الإلغاء متاح هتشوف المبلغ المتوقع يرجع للمحفظة قبل التأكيد، وبعدها أي استرداد أو خصم يظهر في سجل الحركات.',
    hint: 'الإلغاء له وقت محدد قبل التحرك والرسوم بتظهر بوضوح.',
  },
];

export default function OnboardingGuide({ isOpen, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;
  const progressText = useMemo(() => `خطوة ${stepIndex + 1} من ${GUIDE_STEPS.length}`, [stepIndex]);

  if (!isOpen) return null;

  return (
    <ModalShell
      onClose={() => {
        setStepIndex(0);
        onClose();
      }}
      title="ابدأ بسرعة مع طريقي"
      subtitle="نسخة أخف وأنظف للموبايل تشرح أهم 6 حاجات فقط، وبعد أول مرة هتقدر تفتح الدليل يدويًا وقت ما تحب."
      icon={<Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />}
      maxWidth="max-w-3xl"
      bodyClassName="px-4 pb-4 pt-3 sm:px-6 sm:pb-5"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <MetaChip label={progressText} tone="neutral" />
            <MetaChip label="مرة واحدة تلقائيًا" tone="brand" />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <SecondaryButton
              onClick={() => {
                setStepIndex(0);
                if (isLastStep) onComplete();
                else onClose();
              }}
            >
              {isLastStep ? 'تم' : 'تخطي'}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                if (isLastStep) {
                  onComplete();
                  setStepIndex(0);
                  return;
                }
                setStepIndex((currentStep) => currentStep + 1);
              }}
            >
              {isLastStep ? 'ابدأ الاستخدام' : 'التالي'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <div className="rounded-[26px] bg-[linear-gradient(135deg,rgba(22,60,152,0.08)_0%,rgba(33,86,217,0.12)_100%)] p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:h-14 sm:w-14 sm:rounded-[24px]">
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-[0.16em] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:text-xs">
                {progressText}
              </p>
              <h4 className="mt-1 text-lg font-black leading-7 text-[var(--ink)] sm:text-xl">{step.title}</h4>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)] sm:leading-7">
                {step.text}
              </p>
            </div>
          </div>
        </div>

        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0">
          {GUIDE_STEPS.map((guideStep, index) => {
            const isActive = index === stepIndex;
            return (
              <button
                key={guideStep.key}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`interactive-press min-w-[94px] rounded-[18px] border px-3 py-2.5 text-right transition-all sm:min-w-[108px] ${
                  isActive
                    ? 'border-transparent bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_34px_-24px_rgba(22,60,152,0.58)]'
                    : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-[14px] ${isActive ? 'bg-white/14 text-white' : 'bg-[var(--surface-strong)] text-[var(--brand-strong)] dark:text-[var(--brand)]'}`}>
                    {guideStep.icon}
                  </span>
                  <ChevronLeft className={`h-4 w-4 shrink-0 ${isActive ? 'text-white/88' : 'text-[var(--ink-soft)]'}`} />
                </div>
                <p className={`mt-2 text-xs font-black leading-5 ${isActive ? 'text-white' : 'text-[var(--ink)]'}`}>
                  {guideStep.title}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-4 sm:rounded-[26px]">
          <p className="text-sm font-black text-[var(--ink)]">مهم قبل ما تكمل</p>
          <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">{step.hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label="موبايل أولاً" tone="brand" />
            <MetaChip label="شرح مختصر" tone="neutral" />
            <MetaChip label="تقدر تفتحه لاحقًا" tone="success" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
