import React from 'react';
import { BellRing, Clock3, Trash2 } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { EmptyStateCard } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';

function formatNotificationDate(value) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function NotificationsModal({
  closeModal,
  notifications,
  unreadCount,
  markAllRead,
  clearNotifications,
  requestBrowserPermission,
  showToast,
}) {
  return (
    <ModalShell
      onClose={closeModal}
      title="تنبيهات الرحلات"
      subtitle="هنا هتلاقي التذكير قبل التحرك، والتنبيه وقت بداية الرحلة، وإشعارات الجهاز لو فعلتها."
      icon={<BellRing className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <MetaChip label={`${unreadCount} غير مقروء`} tone={unreadCount ? 'warning' : 'neutral'} />
            <MetaChip label={`${notifications.length} إجمالي`} tone="brand" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SecondaryButton
              onClick={async () => {
                const result = await requestBrowserPermission();
                showToast(result.message, result.ok ? 'success' : 'error');
              }}
            >
              تفعيل إشعارات الجهاز
            </SecondaryButton>
            <SecondaryButton onClick={markAllRead}>تعليم الكل كمقروء</SecondaryButton>
            <PrimaryButton
              onClick={() => {
                clearNotifications();
                showToast('تم مسح سجل التنبيهات.', 'success');
              }}
              icon={<Trash2 className="h-4 w-4" />}
              className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
            >
              مسح السجل
            </PrimaryButton>
          </div>
        </div>
      }
    >
      {notifications.length === 0 ? (
        <EmptyStateCard
          title="لسه مفيش تنبيهات"
          text="أول ما الرحلة تقرب أو تبدأ، هتلاقي الإشعارات هنا وكمان في أعلى التطبيق."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-[24px] border px-4 py-4 ${
                item.readAt
                  ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  : 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{item.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.tripCode ? <MetaChip label={item.tripCode} tone="brand" /> : null}
                  {item.readAt ? <MetaChip label="مقروءة" tone="neutral" /> : <MetaChip label="جديدة" tone="warning" />}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-4 w-4" />
                  {formatNotificationDate(item.createdAt)}
                </span>
                {item.routeLabel ? <span>{item.routeLabel}</span> : null}
                {item.timeLabel ? <span>{item.timeLabel}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
