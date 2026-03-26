import { useEffect, useMemo, useState } from 'react';
import { Armchair, CalendarDays, Clock, CreditCard, Map, Search, Ticket, Wallet as WalletIcon } from 'lucide-react';
import ModalShell from './ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: Search,
    title: 'ابدأ بالبحث',
    text: 'اختار مكان التحرك والوصول واليوم وعدد الركاب. النتيجة هتظهر مرتبة من غير لف أو تشتيت.',
    helper: 'المطلوب منك هنا خطوة واحدة فقط: تحدد الرحلة المناسبة.',
    chips: ['بحث واضح', 'خطوة واحدة'],
  },
  {
    key: 'results',
    icon: CalendarDays,
    title: 'قارن بسرعة',
    text: 'في النتائج هتشوف الميعاد والسعر والإتاحة بوضوح، والرحلات غير المتاحة هتظهر كده بصراحة.',
    helper: 'لو رحلة غير متاحة، مش هتتصرف كأنها شغالة.',
    chips: ['نتائج مرتبة', 'وضوح الإتاحة'],
  },
  {
    key: 'seats',
    icon: Armchair,
    title: 'اختيار المقاعد',
    text: 'اختار المقاعد من خريطة بسيطة. الكرسي المتاح، والمحجوز، والمختار لكل واحد شكل مختلف.',
    helper: 'الزر السفلي هيوضح لك هل أنت جاهز تكمل أم لسه.',
    chips: ['خريطة بسيطة', 'اختيار آمن'],
  },
  {
    key: 'payment',
    icon: CreditCard,
    title: 'راجع ثم ادفع',
    text: 'في الدفع هتراجع الرحلة والمقاعد والسعر النهائي وكود الخصم لو عندك واحد.',
    helper: 'كل حاجة المهمة قبل التأكيد في مكان واحد.',
    chips: ['سعر واضح', 'تأكيد أخير'],
  },
  {
    key: 'ticket',
    icon: Ticket,
    title: 'التذكرة فورًا',
    text: 'بعد التأكيد هتلاقي التذكرة والـ QR فورًا، وتقدر ترجع لها من صفحة التذاكر أو رحلاتي.',
    helper: 'وقت السفر افتح التذكرة مباشرة بدل ما تدور عليها.',
    chips: ['QR جاهز', 'وصول سريع'],
  },
  {
    key: 'tracking',
    icon: Map,
    title: 'متابعة الرحلة',
    text: 'لو فيه رحلة قادمة، تقدر تتابع حالتها من شاشة التذكرة أو من رحلاتي.',
    helper: 'المهم هنا إنك تعرف أنت فين دلوقتي والخطوة اللي بعد كده إيه.',
    chips: ['متابعة مباشرة', 'اطمئنان'],
  },
  {
    key: 'wallet',
    icon: WalletIcon,
    title: 'المحفظة والاسترداد',
    text: 'أي شحن أو استرداد أو خصم هتلاقيه ظاهر في المحفظة وحركة الحساب.',
    helper: 'الفلوس ليها صفحة واضحة لوحدها.',
    chips: ['محفظة واضحة', 'حركات مفهومة'],
  },
  {
    key: 'finish',
    icon: Clock,
    title: 'أنت جاهز',
    text: 'ابدأ من الرئيسية للحجز الجديد، ورحلاتي للرحلة الحالية، والتذاكر وقت السفر.',
    helper: 'بعد إغلاق الدليل تقدر تفتحه تاني من الحساب أو زر الدليل في التطبيق.',
    chips: ['ابدأ الآن', 'ممكن ترجع للدليل'],
  },
];

export default function OnboardingGuide({ isOpen, onClose, onComplete, isSaving = false }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  const step = GUIDE_STEPS[stepIndex];
  const StepIcon = step?.icon || Ticket;
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;
  const progress = ((stepIndex + 1) / GUIDE_STEPS.length) * 100;
  const progressText = useMemo(() => `خطوة ${stepIndex + 1} من ${GUIDE_STEPS.length}`, [stepIndex]);

  if (!isOpen) return null;

  return (
    <ModalShell
      onClose={() => onClose?.()}
      title="دليل طريقي السريع"
      subtitle="دقيقة واحدة تكفي لتفهم مكان كل شيء داخل التطبيق."
      icon={<Ticket className="h-6 w-6" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">{progressText}</p>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => onClose?.()}>لاحقًا</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                if (isLastStep) {
                  onComplete?.();
                  return;
                }
                setStepIndex((currentStep) => currentStep + 1);
              }}
              loading={isSaving}
              loadingText="جاري الحفظ…"
            >
              {isLastStep ? 'ابدأ استخدام التطبيق' : 'التالي'}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#163c98_0%,#2156d9_100%)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1 lg:grid lg:gap-2 lg:overflow-visible">
            {GUIDE_STEPS.map((guideStep, index) => {
              const GuideIcon = guideStep.icon;
              const active = index === stepIndex;

              return (
                <button
                  key={guideStep.key}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`min-w-[120px] rounded-[22px] border px-3 py-3 text-right transition-all lg:min-w-0 ${
                    active
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-[18px] ${active ? 'bg-white text-indigo-600 dark:bg-slate-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                    <GuideIcon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-black">{guideStep.title}</p>
                </button>
              );
            })}
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[24px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <StepIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-indigo-600 dark:text-indigo-300">{progressText}</p>
                <h4 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{step.title}</h4>
              </div>
            </div>

            <p className="mt-5 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{step.text}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {step.chips.map((chip) => (
                <MetaChip key={chip} label={chip} tone="brand" />
              ))}
            </div>

            <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-black text-slate-900 dark:text-white">مهم</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{step.helper}</p>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
