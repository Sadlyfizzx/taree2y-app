import React from 'react';
import { BookOpen, CreditCard, Ticket, Wallet } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { AppSurface, MetaChip, SecondaryButton } from '../components/ui/AppPrimitives';

const HELP_TOPICS = [
  {
    icon: Ticket,
    title: 'الحجز والتذكرة',
    text: 'اختار الرحلة، ثبّت المقاعد، راجع الدفع، وبعد التأكيد هتلاقي التذكرة والـ QR جاهزين فورًا.',
  },
  {
    icon: CreditCard,
    title: 'الدفع والخصومات',
    text: 'لو معاك كود خصم وبيشتغل على الرحلة، هيتطبق قبل التأكيد النهائي مباشرة.',
  },
  {
    icon: Wallet,
    title: 'المحفظة والاسترداد',
    text: 'أي شحن أو استرداد أو خصم هتلاقيه ظاهر في المحفظة وحركة الحساب.',
  },
  {
    icon: BookOpen,
    title: 'الدليل السريع',
    text: 'تقدر تفتح الدليل في أي وقت لو حابب تراجع الخطوات بسرعة.',
  },
];

export default function ChatbotModal({ closeModal, user }) {
  return (
    <ModalShell
      onClose={closeModal}
      title="مركز المساعدة"
      subtitle={`أهلاً يا ${user?.name?.split(' ')[0] || 'صديق طريقي'}، هنا هتلاقي أهم الإجابات بشكل مباشر وسريع.`}
      icon={<BookOpen className="h-6 w-6" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <MetaChip label="شرح واضح" tone="brand" />
          <MetaChip label="خطوات سريعة" tone="success" />
          <MetaChip label="مناسب لأول استخدام" tone="neutral" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {HELP_TOPICS.map((topic) => (
            <AppSurface key={topic.title} className="p-5">
              <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <topic.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{topic.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{topic.text}</p>
            </AppSurface>
          ))}
        </div>

        <div className="flex justify-end">
          <SecondaryButton onClick={closeModal}>تمام</SecondaryButton>
        </div>
      </div>
    </ModalShell>
  );
}
