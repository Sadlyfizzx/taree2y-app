import React from 'react';
import { BookOpen, CreditCard, Ticket, Wallet } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { AppSurface, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';

const HELP_TOPICS = [
  {
    icon: Ticket,
    title: 'الحجز والتذكرة',
    text: 'اختار الرحلة، ثبّت المقاعد، وراجع الدفع. بعد التأكيد هتلاقي التذكرة جاهزة فورًا.',
  },
  {
    icon: CreditCard,
    title: 'الخصومات والكوبونات',
    text: 'لو الكود صالح هتشوف الخصم قبل التأكيد النهائي. ولو مش متاح، السبب هيظهر بشكل واضح.',
  },
  {
    icon: Wallet,
    title: 'المحفظة والاسترداد',
    text: 'أي خصم أو استرداد أو شحن هيظهر في الرصيد وفي سجل الحركات بشكل مباشر.',
  },
  {
    icon: BookOpen,
    title: 'الدليل التفاعلي',
    text: 'لو عايز شرح خطوة بخطوة، افتح الدليل التفاعلي من هنا في أي وقت.',
  },
];

export default function ChatbotModal({ closeModal, user, openGuide }) {
  return (
    <ModalShell
      onClose={closeModal}
      title="المساعدة والدليل"
      subtitle={`أهلاً يا ${user?.name?.split(' ')[0] || 'صديق طريقي'}، هنا هتلاقي الإجابات الأساسية والدليل التفاعلي في مكان واحد.`}
      icon={<BookOpen className="h-6 w-6" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إغلاق</SecondaryButton>
          <PrimaryButton
            onClick={() => {
              closeModal();
              openGuide?.();
            }}
          >
            افتح الدليل التفاعلي
          </PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {HELP_TOPICS.map((topic) => (
          <AppSurface key={topic.title} className="p-5">
            <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
              <topic.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              {topic.title}
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              {topic.text}
            </p>
          </AppSurface>
        ))}
      </div>
    </ModalShell>
  );
}
