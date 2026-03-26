import React from 'react';
import { BookOpen, CreditCard, HelpCircle, MapPinned, Ticket, Wallet } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { AppSurface, MetaChip, SecondaryButton } from '../components/ui/AppPrimitives';

const GUIDE_BLOCKS = [
  {
    icon: Ticket,
    title: 'الحجز والتذكرة',
    text: 'ابدأ من الرئيسية، اختار خط السير، راجع النتائج، وبعد الدفع هتلاقي التذكرة جاهزة فورًا.',
  },
  {
    icon: MapPinned,
    title: 'المقاعد والمتابعة',
    text: 'اختيار الكرسي بيتم قبل الدفع، وبعد الحجز تقدر تفتح التذكرة أو متابعة الرحلة من غير لف.',
  },
  {
    icon: Wallet,
    title: 'المحفظة والاسترداد',
    text: 'أي دفع أو استرداد هتلاقيه واضح في المحفظة، مع سجل مرتب للحركات.',
  },
  {
    icon: CreditCard,
    title: 'العروض والخصومات',
    text: 'لو فيه عرض صالح أو كود خصم، هيتراجع قبل التأكيد النهائي ويظهر لك بوضوح.',
  },
];

export default function ChatbotModal({ closeModal, user }) {
  return (
    <ModalShell
      onClose={closeModal}
      title="المساعدة والدليل"
      subtitle={`أهلاً يا ${user?.name?.split(' ')[0] || 'صديق طريقي'}، هنا هتلاقي الخطوات الأساسية والإجابات المهمة في مكان واحد.`}
      icon={<HelpCircle className="h-6 w-6" />}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <MetaChip label="شرح واضح" tone="brand" />
          <MetaChip label="مناسب لأول استخدام" tone="success" />
          <MetaChip label="بدون تكرار" tone="neutral" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {GUIDE_BLOCKS.map((topic) => (
            <AppSurface key={topic.title} className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <span className="grid h-12 w-12 place-items-center rounded-[20px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                <topic.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{topic.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{topic.text}</p>
            </AppSurface>
          ))}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            <p className="text-sm font-black text-slate-900 dark:text-white">أسرع طريقة تتعامل مع التطبيق</p>
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            الرئيسية للحجز السريع، رحلاتي لإدارة الحجوزات، التذاكر للوصول السريع للـ QR وقت السفر، والمحفظة لأي حركة مالية.
          </p>
        </div>

        <div className="flex justify-end">
          <SecondaryButton onClick={closeModal}>تمام</SecondaryButton>
        </div>
      </div>
    </ModalShell>
  );
}
