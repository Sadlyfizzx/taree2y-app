import { useMemo, useState } from 'react';
import {
  Armchair,
  Clock,
  Map,
  Search,
  Ticket,
  Wallet as WalletIcon,
} from 'lucide-react';
import ModalShell from './ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <Search className="h-6 w-6" />,
    title: 'إزاي تدوّر على رحلة',
    text: 'اختار محافظة التحرك والوصول، وحدد يوم السفر وعدد الركاب. من أول الشاشة هتشوف اسم المدينة والمحطة الأساسية عشان تبقى عارف هتتحرك منين بالضبط.',
    hint: 'ركّز في اسم المحطة قبل ما تختار الرحلة، مش اسم المدينة بس.',
  },
  {
    key: 'seats',
    icon: <Armchair className="h-6 w-6" />,
    title: 'إزاي تختار الكرسي',
    text: 'المقاعد الفاضية، المحجوزة، والمتثبتة لراكب تاني كل واحدة لها شكل مختلف. اختار العدد المطلوب فقط، وبعدها كمل للخطوة اللي بعدها.',
    hint: 'لو الكرسي اتاخد أثناء الاختيار، التطبيق هيقول لك فورًا.',
  },
  {
    key: 'checkout',
    icon: <WalletIcon className="h-6 w-6" />,
    title: 'إزاي تدفع',
    text: 'في خطوة الدفع هتراجع الرحلة والمقاعد والإضافات والسعر النهائي. لو معاك كود خصم أو محتاج تعرف رصيد المحفظة، كل ده ظاهر قبل التأكيد.',
    hint: 'لو الرصيد مش كفاية، هتلاقي زر الشحن في نفس المكان.',
  },
  {
    key: 'ticket',
    icon: <Ticket className="h-6 w-6" />,
    title: 'فين هتلاقي التذكرة',
    text: 'بعد الحجز مباشرة التذكرة بتبقى جاهزة وفيها رقم الحجز، المحطة، المقاعد، والـ QR. هتلاقيها في قسم التذاكر وكمان داخل رحلاتك.',
    hint: 'افتح التذكرة قبل السفر وتأكد من المحطة والوقت.',
  },
  {
    key: 'tracking',
    icon: <Map className="h-6 w-6" />,
    title: 'إزاي تتابع الرحلة',
    text: 'من شاشة التذكرة تقدر تفتح متابعة الرحلة وتشوف حالة الطريق: لسه في الانتظار، اتحركت، في استراحة، أو قربت توصل.',
    hint: 'المتابعة تطمّنك وتفهمك المرحلة الحالية، لكنها مش GPS مباشر.',
  },
  {
    key: 'refund',
    icon: <Clock className="h-6 w-6" />,
    title: 'الرصيد والإلغاء والاسترداد',
    text: 'لو الإلغاء متاح، هتشوف المبلغ المتوقع يرجع للمحفظة قبل ما تأكد. وبعد التنفيذ، أي استرداد أو خصم هتلاقيه في المحفظة وسجل الحركات.',
    hint: 'الإلغاء له وقت محدد قبل التحرك، والرسوم بتظهر بوضوح.',
  },
];

export default function OnboardingGuide({ isOpen, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;
  const progressText = useMemo(
    () => `خطوة ${stepIndex + 1} من ${GUIDE_STEPS.length}`,
    [stepIndex],
  );

  if (!isOpen) return null;

  return (
    <ModalShell
      onClose={() => {
        setStepIndex(0);
        onClose();
      }}
      title="دليل البداية"
      subtitle="شرح خفيف وسريع يعرّفك مسار الحجز من أول البحث لحد التذكرة والاسترداد."
      icon={<Ticket className="h-6 w-6" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <MetaChip label={progressText} tone="neutral" />
            <MetaChip label="اختياري" tone="brand" />
          </div>
          <div className="flex gap-3">
            <SecondaryButton
              onClick={() => {
                setStepIndex(0);
                if (isLastStep) {
                  onComplete();
                } else {
                  onClose();
                }
              }}
            >
              {isLastStep ? 'إغلاق' : 'مش دلوقتي'}
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
      <div className="space-y-5">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {GUIDE_STEPS.map((guideStep, index) => (
            <button
              key={guideStep.key}
              type="button"
              onClick={() => setStepIndex(index)}
              className={`interactive-press rounded-full px-3 py-2 text-xs font-black transition-all ${
                index === stepIndex
                  ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white'
                  : 'border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)]'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="app-surface-soft rounded-[30px] p-5 md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
              {step.icon}
            </span>
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                {progressText}
              </p>
              <h4 className="mt-1 text-xl font-black text-[var(--ink)]">{step.title}</h4>
            </div>
          </div>

          <p className="text-sm font-bold leading-7 text-[var(--ink-muted)]">
            {step.text}
          </p>

          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 py-4">
            <p className="text-sm font-black text-[var(--ink)]">مهم قبل ما تكمل</p>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
              {step.hint}
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
