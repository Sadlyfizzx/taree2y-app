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
    title: 'الخصومات والكوبونات',
    text: 'الكود بيتراجع من السيرفر قبل التأكيد النهائي حسب تاريخ الحملة، شروط الاستخدام، وهل اتستخدم قبل كده ولا لأ.',
  },
  {
    icon: Wallet,
    title: 'المحفظة والاسترداد',
    text: 'أي خصم أو شحن أو استرداد لازم يظهر في رصيد المحفظة وفي حركة الحساب، ولو في تأخير التطبيق بيعمل مزامنة تلقائية.',
  },
  {
    icon: BookOpen,
    title: 'أول مرة تستخدم طريقي؟',
    text: 'افتح دليل الاستخدام من الرئيسية أو حسابي عشان تشوف خطوات الحجز والتتبع والإلغاء بشكل مرتب وسريع.',
  },
];

export default function ChatbotModal({ closeModal, user }) {
  return (
    <ModalShell
      onClose={closeModal}
      title="مركز المساعدة"
      subtitle={`أهلاً يا ${user?.name?.split(' ')[0] || 'صديق طريقي'}، هنا هتلاقي الإجابات الأساسية بشكل واضح بدل واجهة محادثة وهمية.`}
      icon={<BookOpen className="h-6 w-6" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <MetaChip label="شرح واضح" tone="brand" />
          <MetaChip label="بدون خطوات وهمية" tone="success" />
          <MetaChip label="مناسب لأول استخدام" tone="neutral" />
        </div>

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

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            ملحوظة
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            لو الخدمة نفسها لسه مش متوصلة بالباك إند، التطبيق مش هيعرضها كأنها شغالة.
          </p>
        </div>

        <div className="flex justify-end">
          <SecondaryButton onClick={closeModal}>تمام</SecondaryButton>
        </div>
      </div>
    </ModalShell>
  );
}
