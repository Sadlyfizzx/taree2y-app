import { useMemo, useState } from 'react';
import {
  Armchair,
  ArrowLeft,
  Clock,
  Map,
  Search,
  ShieldCheck,
  Ticket,
  Wallet as WalletIcon,
} from 'lucide-react';
import ModalShell from './ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <Search className="h-6 w-6" />,
    title: 'ابدأ من البحث الصح',
    text: 'اختار المحافظة، يوم السفر، وعدد الركاب، وبعدها راجع اسم المحطة نفسها قبل ما تختار الرحلة.',
    hint: 'اسم المدينة وحده لا يكفي. المحطة هي المرجع الأوضح وقت التحرك.',
  },
  {
    key: 'seats',
    icon: <Armchair className="h-6 w-6" />,
    title: 'اختيار المقاعد ببساطة',
    text: 'المقاعد الفاضية والمحجوزة والمتثبتة لراكب آخر تظهر بوضوح. اختار العدد المطلوب فقط وكمل.',
    hint: 'لو كرسي اختفى أثناء الاختيار، التطبيق يطلب منك إعادة التحديد فورًا.',
  },
  {
    key: 'checkout',
    icon: <WalletIcon className="h-6 w-6" />,
    title: 'الدفع والمراجعة',
    text: 'قبل التأكيد ستشوف الرحلة، المقاعد، أي خصم، ورصيد المحفظة في نفس الشاشة.',
    hint: 'لو الرصيد غير كافٍ، زر الشحن موجود في نفس المسار بدون خروج.',
  },
  {
    key: 'ticket',
    icon: <Ticket className="h-6 w-6" />,
    title: 'التذكرة جاهزة فورًا',
    text: 'بعد الحجز ستجد الـ QR، المقاعد، والمحطة داخل التذكرة مباشرة في قسم التذاكر.',
    hint: 'افتح التذكرة قبل السفر وخذ نظرة سريعة على المحطة والوقت.',
  },
  {
    key: 'tracking',
    icon: <Map className="h-6 w-6" />,
    title: 'متابعة الرحلة أوضح',
    text: 'يمكنك فتح تتبع الرحلة لمعرفة هل هي في الانتظار، اتحركت، في استراحة، أو قربت توصل.',
    hint: 'المتابعة هنا مرحلة تشغيلية مفيدة وليست GPS مباشر.',
  },
  {
    key: 'refund',
    icon: <Clock className="h-6 w-6" />,
    title: 'الاسترداد والمحفظة',
    text: 'لو الإلغاء متاح، ستعرف قيمة الاسترداد قبل التأكيد، وبعدها ستظهر الحركة مباشرة في المحفظة.',
    hint: 'وقت الإلغاء المسموح يظهر بوضوح قبل التنفيذ.',
  },
];

export default function OnboardingGuide({ isOpen, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;
  const progress = useMemo(() => Math.round(((stepIndex + 1) / GUIDE_STEPS.length) * 100), [stepIndex]);
  const progressText = useMemo(() => `خطوة ${stepIndex + 1} من ${GUIDE_STEPS.length}`, [stepIndex]);

  if (!isOpen) return null;

  return (
    <ModalShell
      onClose={() => {
        setStepIndex(0);
        onClose?.({ persist: true });
      }}
      title="ابدأ طريقي بسرعة"
      subtitle="جولة قصيرة جدًا تشرح لك المسار الأساسي من أول البحث لحد التذكرة والمحفظة. بعد المرة دي تقدر تفتحها وقت ما تحب من التطبيق."
      icon={<ShieldCheck className="h-6 w-6" />}
      maxWidth="max-w-3xl"
      className="w-full"
      bodyClassName="px-4 py-4 sm:px-6 sm:py-6"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <MetaChip label={progressText} tone="neutral" className="min-h-9 px-3 py-1.5 text-[11px]" />
            <MetaChip label="أول مرة فقط" tone="brand" className="min-h-9 px-3 py-1.5 text-[11px]" />
          </div>
          <div className="grid gap-2 sm:flex sm:gap-3">
            <SecondaryButton
              className="w-full sm:w-auto"
              onClick={() => {
                setStepIndex(0);
                onClose?.({ persist: true });
              }}
            >
              {isLastStep ? 'إغلاق' : 'تخطي الآن'}
            </SecondaryButton>
            <PrimaryButton
              className="w-full sm:w-auto"
              onClick={() => {
                if (isLastStep) {
                  onComplete?.();
                  setStepIndex(0);
                  return;
                }
                setStepIndex((currentStep) => Math.min(currentStep + 1, GUIDE_STEPS.length - 1));
              }}
              icon={!isLastStep ? <ArrowLeft className="h-4 w-4" /> : undefined}
            >
              {isLastStep ? 'ابدأ الاستخدام' : 'التالي'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <section className="app-brand-panel overflow-hidden rounded-[28px] p-4 text-white sm:p-5">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-[0.18em] text-white/70">تهيئة سريعة</p>
              <h4 className="mt-2 text-2xl font-black leading-tight">خلال أقل من دقيقة هتفهم مسار الحجز كامل</h4>
              <p className="mt-2 text-sm font-bold leading-6 text-white/82">
                البحث، اختيار الرحلة، المقاعد، الدفع، التذكرة، والاسترداد — بشكل مختصر وواضح للموبايل.
              </p>
            </div>
            <div className="w-full max-w-[220px] rounded-[22px] border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 text-xs font-black text-white/88">
                <span>التقدم</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {GUIDE_STEPS.map((guideStep, index) => {
            const active = index === stepIndex;
            return (
              <button
                key={guideStep.key}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`interactive-press inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition-all ${
                  active
                    ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_16px_30px_-20px_rgba(33,86,217,0.5)]'
                    : 'border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)]'
                }`}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full ${active ? 'bg-white/16' : 'bg-[var(--surface-strong)]'}`}>
                  {index + 1}
                </span>
                <span className="whitespace-nowrap">{guideStep.title}</span>
              </button>
            );
          })}
        </div>

        <section className="app-surface-soft overflow-hidden rounded-[30px] p-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:h-16 sm:w-16 sm:rounded-[24px]">
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-[0.18em] text-[var(--brand-strong)] dark:text-[var(--brand)]">{progressText}</p>
              <h4 className="mt-1 text-xl font-black leading-tight text-[var(--ink)] sm:text-2xl">{step.title}</h4>
              <p className="mt-3 text-sm font-bold leading-7 text-[var(--ink-muted)] sm:text-[15px]">{step.text}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-4">
            <p className="text-sm font-black text-[var(--ink)]">مهم قبل ما تكمل</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">{step.hint}</p>
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
