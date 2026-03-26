import React, { useMemo, useState } from 'react';
import { BookOpen, CreditCard, MapPinned, Ticket, Wallet } from 'lucide-react';
import ModalShell from './ModalShell';
import { PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <MapPinned className="h-6 w-6" />,
    title: 'ابدأ بالبحث',
    text: 'اختار محافظة التحرك والوصول، يوم السفر، وعدد الركاب. بعدها هتشوف الرحلات المتاحة بشكل مرتب وواضح.',
    hint: 'لو حبيت، تقدر تبدّل الاتجاه بسرعة بدل ما تعيد اختيار المدن من الأول.',
  },
  {
    key: 'seat',
    icon: <Ticket className="h-6 w-6" />,
    title: 'اختار المقاعد',
    text: 'بعد اختيار الرحلة، حدّد المقاعد المتاحة. التطبيق بيوضح لك المقاعد الجاهزة والمشغولة قبل ما تكمل.',
    hint: 'راجع عدد المقاعد المختارة قبل ما تنتقل للدفع.',
  },
  {
    key: 'payment',
    icon: <CreditCard className="h-6 w-6" />,
    title: 'راجع الدفع',
    text: 'في شاشة الدفع هتراجع السعر النهائي، أي خصم أو كود، وطريقة الدفع قبل الحجز النهائي.',
    hint: 'لو في مشكلة في الكود أو الخصم، هيظهر سبب واضح قبل التأكيد.',
  },
  {
    key: 'wallet',
    icon: <Wallet className="h-6 w-6" />,
    title: 'التذكرة والمحفظة',
    text: 'بعد التأكيد هتلاقي التذكرة جاهزة، ولو حصل استرداد أو حركة مالية هتظهر فورًا في المحفظة.',
    hint: 'تقدر ترجع للدليل في أي وقت من الرئيسية أو من الحساب.',
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
      onClose={onClose}
      title="دليل طريقي السريع"
      subtitle="شرح بسيط للحجز من أول البحث لحد التذكرة."
      icon={<BookOpen className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">{progressText}</p>
          <div className="flex gap-3">
            <SecondaryButton onClick={isLastStep ? onComplete : onClose}>تخطي</SecondaryButton>
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
              {isLastStep ? 'تمام، نبدأ' : 'التالي'}
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
              className={`rounded-full px-3 py-2 text-xs font-black transition-all ${index === stepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}
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
              <p className="text-xs font-black tracking-[0.16em] text-indigo-600 dark:text-indigo-300">{progressText}</p>
              <h4 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{step.title}</h4>
            </div>
          </div>

          <p className="text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{step.text}</p>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-900 dark:text-white">ملحوظة مهمة</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{step.hint}</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
