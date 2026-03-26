import React from 'react';
import { BookOpen, CreditCard, Ticket, Wallet } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { AppSurface, SecondaryButton } from '../components/ui/AppPrimitives';

const HELP_TOPICS = [
  {
    icon: Ticket,
    title: 'الحجز والتذكرة',
    text: 'اختار الرحلة، ثبّت المقاعد، راجع الدفع، وبعد التأكيد هتلاقي التذكرة والـ QR جاهزين فورًا.',
  },
  {
    icon: CreditCard,
    title: 'الخصومات والكوبونات',
    text: 'أي كود خصم بيتراجع قبل التأكيد النهائي، ولو فيه شرط مش متحقق هيظهر لك السبب بوضوح.',
  },
  {
    icon: Wallet,
    title: 'المحفظة والاسترداد',
    text: 'أي شحن أو خصم أو استرداد لازم يظهر في المحفظة وفي سجل الحركات بشكل واضح.',
  },
  {
    icon: BookOpen,
    title: 'استخدام التطبيق لأول مرة',
    text: 'لو محتاج شرح مرتب، افتح دليل الاستخدام وهيشرح لك البحث، التتبع، والحجز خطوة بخطوة.',
  },
];

export default function ChatbotModal({ closeModal, user }) {
  return (
    <ModalShell
      onClose={closeModal}
      title="مركز المساعدة"
      subtitle={`أهلاً يا ${user?.name?.split(' ')[0] || 'صديق طريقي'}، هنا هتلاقي الإجابات الأساسية بشكل واضح وسريع.`}
      icon={<BookOpen className="h-6 w-6" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
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
