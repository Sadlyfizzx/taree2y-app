import { useMemo, useState } from 'react';
import { Armchair, Clock, Map, Search, Ticket, Wallet as WalletIcon } from 'lucide-react';
import ModalShell from './ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from './AppPrimitives';

const GUIDE_STEPS = [
  {
    key: 'search',
    icon: <Search className="h-6 w-6" />,
    title: 'إزاي أدور على رحلة؟',
    text: 'اختار المحافظة اللي هتتحرك منها، والمحافظة اللي رايح لها، واليوم، وعدد الركاب. أول ما تدوس "دور على الرحلات" هتشوف الأنسب ليك بوضوح.',
    hint: 'هتلاقي اسم المدينة واسم المحطة واضحين من البداية.',
    chips: ['بحث واضح', 'محطات مفهومة'],
  },
  {
    key: 'seats',
    icon: <Armchair className="h-6 w-6" />,
    title: 'إزاي أختار الكرسي؟',
    text: 'بعد ما تختار الرحلة، هتدخل على خريطة المقاعد. الكراسي الفاضية واضحة، والمحجوزة والمتثبتة لراكب تاني ليها شكل مختلف عشان القرار يبقى سهل.',
    hint: 'الزر اللي تحت هيقولك كام كرسي فاضل تختاره قبل ما تكمل.',
    chips: ['خريطة بسيطة', 'اختيار آمن'],
  },
  {
    key: 'checkout',
    icon: <WalletIcon className="h-6 w-6" />,
    title: 'إزاي أدفع؟',
    text: 'في خطوة الدفع هتراجع الرحلة، المقاعد، والإضافات زي الوزن أو المساعدة وقت الصعود. لو معاك كود خصم تفعّله هنا قبل التأكيد.',
    hint: 'المحفظة بتوضح الرصيد والمبلغ المطلوب قبل أي خصم فعلي.',
    chips: ['خصومات', 'محفظة'],
  },
  {
    key: 'ticket',
    icon: <Ticket className="h-6 w-6" />,
    title: 'فين هلاقي التذكرة؟',
    text: 'أول ما الحجز يتأكد، هتلاقي التذكرة فورًا ومعاها رقم الحجز والـ QR وكل تفاصيل الرحلة في مكان واحد. وكمان هتفضل موجودة تحت "رحلاتي".',
    hint: 'ممكن ترجع لها وقت السفر من غير لف كتير.',
    chips: ['QR جاهز', 'تفاصيل كاملة'],
  },
  {
    key: 'tracking',
    icon: <Map className="h-6 w-6" />,
    title: 'إزاي أتابع الرحلة؟',
    text: 'من شاشة التذكرة تقدر تدخل على التتبع، وتشوف الرحلة وصلت لفين، وحالتها دلوقتي، ولو فيها استراحة هتظهر لك بوضوح.',
    hint: 'وقت التحرك والوصول والحالة بيتعرضوا بشكل مفهوم حتى لو دي أول مرة تستخدم التطبيق.',
    chips: ['تتبع الرحلة', 'حالة مباشرة'],
  },
  {
    key: 'refund',
    icon: <Clock className="h-6 w-6" />,
    title: 'الإلغاء والاسترداد بيشتغلوا إزاي؟',
    text: 'من "رحلاتي" تقدر تلغي لو الرحلة لسه جوه وقت الإلغاء، وهتشوف قبل التأكيد قيمة الرسوم والمبلغ المتوقع يرجع للمحفظة. لما الاسترداد يتم هينزل في المحفظة ويتسجل في الحركات.',
    hint: 'كل خطوة بتوضح لك حصل إيه وإيه اللي لسه هيحصل.',
    chips: ['إلغاء واضح', 'استرداد للمحفظة'],
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
      onClose={onClose}
      title="دليل طريقي السريع"
      subtitle="في أقل من دقيقة هتعرف الحجز، التذكرة، التتبع، والمحفظة بيشتغلوا إزاي من غير لف كتير."
      icon={<Ticket className="h-6 w-6" />}
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

          <div className="mt-5 flex flex-wrap gap-2">
            {step.chips.map((chip) => (
              <MetaChip key={chip} label={chip} tone="brand" />
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-black text-slate-900 dark:text-white">ملحوظة مهمة</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{step.hint}</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
