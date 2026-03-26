import { useMemo, useState } from 'react';
import { Armchair, Clock, Map, Search, Ticket, Wallet as WalletIcon } from 'lucide-react';
import ModalShell from './ModalShell';
import { PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <Search className="h-6 w-6" />,
    title: 'ابدأ بالرحلة',
    text: 'اختار محافظة التحرك والوصول، وحدد اليوم وعدد الركاب. بعد كده هتشوف الرحلات المناسبة بشكل واضح.',
    hint: 'اسم المدينة والمحطة بيتعرضوا من البداية عشان القرار يبقى أسهل.',
  },
  {
    key: 'seats',
    icon: <Armchair className="h-6 w-6" />,
    title: 'اختار الكرسي',
    text: 'المقاعد الفاضية، المحجوزة، والمثبتة لراكب تاني شكلهم مختلف. اختار براحتك وبعدها كمّل للدفع.',
    hint: 'الزر اللي تحت بيقول لك إذا كنت جاهز تكمل أو لسه محتاج تختار مقاعد.',
  },
  {
    key: 'checkout',
    icon: <WalletIcon className="h-6 w-6" />,
    title: 'راجع وادفع',
    text: 'في خطوة الدفع هتراجع الرحلة والمقاعد وأي إضافات، ولو معاك كود خصم ده مكانه.',
    hint: 'المبلغ النهائي بيظهر قدامك بوضوح قبل التأكيد.',
  },
  {
    key: 'ticket',
    icon: <Ticket className="h-6 w-6" />,
    title: 'افتح التذكرة',
    text: 'بعد تأكيد الحجز هتلاقي التذكرة فورًا، ومعاها رقم الحجز والـ QR وكل بيانات الصعود في مكان واحد.',
    hint: 'هتقدر ترجع للتذكرة وقت السفر بسهولة من القسم المخصص لها.',
  },
  {
    key: 'tracking',
    icon: <Map className="h-6 w-6" />,
    title: 'تابع الرحلة',
    text: 'من شاشة التذكرة تقدر تفتح المتابعة وتشوف حالة الرحلة ومرحلتها الحالية بشكل بسيط.',
    hint: 'لو الرحلة قربت توصل أو دخلت استراحة، هتشوف الحالة بشكل واضح.',
  },
  {
    key: 'refund',
    icon: <Clock className="h-6 w-6" />,
    title: 'الإلغاء والاسترداد',
    text: 'لو الرحلة ما زالت داخل وقت الإلغاء، هتعرف المبلغ المتوقع يرجع للمحفظة قبل ما تؤكد.',
    hint: 'بعد الاسترداد، الحركة هتظهر في المحفظة تلقائيًا.',
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
      title="دليل طريقي التفاعلي"
      subtitle="خمسين ثانية تقريبًا وتكون عرفت الرحلة، الكرسي، الدفع، والتذكرة من غير لف."
      icon={<Ticket className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">{progressText}</p>
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
              {isLastStep ? 'إغلاق' : 'لاحقًا'}
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GUIDE_STEPS.map((guideStep, index) => (
            <button
              key={guideStep.key}
              type="button"
              onClick={() => setStepIndex(index)}
              className={`rounded-full px-3 py-2 text-xs font-black transition-all ${
                index === stepIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              {step.icon}
            </span>
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                {progressText}
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{step.title}</h4>
            </div>
          </div>

          <p className="text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{step.text}</p>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-900 dark:text-white">ملحوظة سريعة</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{step.hint}</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
