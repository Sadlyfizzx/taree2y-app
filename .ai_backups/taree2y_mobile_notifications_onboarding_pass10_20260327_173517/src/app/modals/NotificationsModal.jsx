import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  Gift,
  Route,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import { EmptyStateCard } from '../components/ui/StateBlocks';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'unread', label: 'غير المقروءة' },
  { key: 'trip', label: 'الرحلات' },
  { key: 'wallet', label: 'المحفظة' },
  { key: 'promo', label: 'العروض' },
  { key: 'referral', label: 'الإحالات' },
];

const CATEGORY_META = {
  trip: { label: 'رحلة', tone: 'brand', icon: Route },
  wallet: { label: 'محفظة', tone: 'success', icon: Wallet },
  promo: { label: 'عرض', tone: 'warning', icon: Gift },
  referral: { label: 'إحالة', tone: 'brand', icon: UserPlus },
  general: { label: 'تنبيه', tone: 'neutral', icon: BellRing },
};

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

function getCategoryMeta(item) {
  return CATEGORY_META[item?.category] || CATEGORY_META.general;
}

function matchesFilter(item, filterKey) {
  if (filterKey === 'all') return true;
  if (filterKey === 'unread') return !item?.readAt;
  return (item?.category || 'general') === filterKey;
}

function inferActionLabel(item) {
  if (item?.ctaLabel) return item.ctaLabel;

  switch (item?.ctaAction) {
    case 'open_ticket':
    case 'open_tickets':
      return 'افتح التذكرة';
    case 'open_trip':
    case 'open_booking':
    case 'open_bookings':
      return 'افتح الرحلة';
    case 'open_wallet':
      return 'افتح المحفظة';
    case 'open_referral':
      return 'افتح الإحالات';
    case 'use_offer':
    case 'open_offer':
      return 'استخدم العرض';
    default:
      if (item?.category === 'wallet') return 'افتح المحفظة';
      if (item?.category === 'promo') return 'استخدم العرض';
      if (item?.category === 'referral') return 'افتح الإحالات';
      if (item?.category === 'trip') return 'افتح الرحلة';
      return '';
  }
}

function IconActionButton({ label, icon, onClick, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'
      : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
      : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`interactive-press inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${toneClass}`}
    >
      {icon}
    </button>
  );
}

export default function NotificationsModal({
  closeModal,
  notifications,
  unreadCount,
  markAllRead,
  clearNotifications,
  markNotificationRead,
  dismissNotification,
  requestBrowserPermission,
  onOpenItem,
  showToast,
}) {
  const [filter, setFilter] = useState('all');

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, filter)),
    [notifications, filter],
  );

  const summaryCounts = useMemo(
    () => ({
      total: notifications.length,
      unread: unreadCount,
      wallet: notifications.filter((item) => item.category === 'wallet').length,
      promo: notifications.filter((item) => item.category === 'promo').length,
    }),
    [notifications, unreadCount],
  );

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/24 backdrop-blur-[1px] sm:bg-slate-950/10" onClick={closeModal} />

      <div
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto absolute inset-x-3 top-[max(env(safe-area-inset-top),14px)] max-h-[min(74vh,680px)] overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-floating)] sm:left-auto sm:right-4 sm:top-20 sm:w-[430px] sm:max-h-[min(78vh,760px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--line)] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                  <BellRing className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-base font-black text-[var(--ink)] sm:text-lg">التنبيهات</p>
                  <p className="text-xs font-bold text-[var(--ink-muted)] sm:text-sm">
                    كل المهم في مكان واحد
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs font-bold text-[var(--ink-muted)] sm:hidden">
                {summaryCounts.unread} غير مقروءة من أصل {summaryCounts.total}
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              aria-label="إغلاق"
              className="interactive-press grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <IconActionButton
              label="تفعيل إشعارات الجهاز"
              icon={<BellRing className="h-4 w-4" />}
              onClick={async () => {
                const result = await requestBrowserPermission();
                showToast(result.message, result.ok ? 'success' : 'error');
              }}
            />
            <IconActionButton
              label="تعليم الكل كمقروء"
              icon={<Check className="h-4 w-4" />}
              onClick={markAllRead}
              tone="success"
            />
            <IconActionButton
              label="مسح السجل"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                clearNotifications();
                showToast('تم مسح سجل التنبيهات.', 'success');
              }}
              tone="danger"
            />
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
            <MetaChip label={`${summaryCounts.unread} غير مقروء`} tone={summaryCounts.unread ? 'warning' : 'neutral'} />
            <MetaChip label={`${summaryCounts.total} إجمالي`} tone="brand" />
            <MetaChip label={`${summaryCounts.wallet} للمحفظة`} tone="success" />
            <MetaChip label={`${summaryCounts.promo} عروض`} tone="warning" />
          </div>

          <div className="mt-4 hidden flex-col gap-3 sm:flex">
            <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`interactive-press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                    filter === item.key
                      ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
                      : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]'
                  }`}
                >
                  {item.label}
                  {item.key === 'unread' ? (
                    <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-xs font-black">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="hide-scrollbar max-h-[calc(min(74vh,680px)-132px)] overflow-y-auto px-3 py-3 sm:max-h-[calc(min(78vh,760px)-196px)] sm:px-4 sm:py-4">
          {visibleNotifications.length === 0 ? (
            <EmptyStateCard
              title={filter === 'all' ? 'لسه مفيش تنبيهات' : 'مفيش حاجة في القسم ده'}
              text="أول ما يحصل تحديث يهمك، هتلاقيه هنا مع زر واضح يفتح المكان المناسب جوه التطبيق."
            />
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {visibleNotifications.map((item) => {
                const meta = getCategoryMeta(item);
                const Icon = meta.icon;
                const actionLabel = inferActionLabel(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-[22px] border px-3 py-3 sm:rounded-[26px] sm:px-4 sm:py-4 ${
                      item.readAt
                        ? 'border-[var(--line)] bg-[var(--surface-strong)]'
                        : 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:h-11 sm:w-11">
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="hidden flex-wrap items-center gap-2 sm:flex">
                          <MetaChip label={meta.label} tone={meta.tone} />
                          {item.readAt ? <MetaChip label="مقروءة" tone="neutral" /> : <MetaChip label="جديدة" tone="warning" />}
                          {item.priority >= 80 ? <MetaChip label="مهمة" tone="danger" /> : null}
                          {item.tripCode ? <MetaChip label={item.tripCode} tone="brand" /> : null}
                        </div>

                        <p className="text-sm font-black leading-6 text-[var(--ink)] sm:mt-3 sm:text-base">
                          {item.title}
                        </p>
                        <p className="mt-1.5 text-xs font-bold leading-5 text-[var(--ink-muted)] sm:mt-2 sm:text-sm sm:leading-6">
                          {item.body}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[var(--ink-muted)] sm:mt-3 sm:text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatNotificationDate(item.createdAt)}
                          </span>
                          {item.routeLabel ? <span>{item.routeLabel}</span> : null}
                          {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                        </div>

                        <div className="mt-3 flex items-center gap-2 sm:hidden">
                          {actionLabel ? (
                            <IconActionButton
                              label={actionLabel}
                              icon={<ChevronLeft className="h-4 w-4" />}
                              onClick={async () => {
                                await onOpenItem?.(item);
                              }}
                            />
                          ) : null}

                          {!item.readAt ? (
                            <IconActionButton
                              label="تمت القراءة"
                              icon={<Check className="h-4 w-4" />}
                              onClick={async () => {
                                await markNotificationRead?.(item.id);
                                showToast('تم تعليم التنبيه كمقروء.', 'success');
                              }}
                              tone="success"
                            />
                          ) : null}

                          <IconActionButton
                            label="إخفاء"
                            icon={<CheckCheck className="h-4 w-4" />}
                            onClick={async () => {
                              await dismissNotification?.(item.id);
                              showToast('تم إخفاء التنبيه من القائمة.', 'success');
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 hidden shrink-0 gap-2 sm:flex sm:flex-wrap">
                      {actionLabel ? (
                        <PrimaryButton
                          onClick={async () => {
                            await onOpenItem?.(item);
                          }}
                          icon={<ChevronLeft className="h-4 w-4" />}
                        >
                          {actionLabel}
                        </PrimaryButton>
                      ) : null}

                      {!item.readAt ? (
                        <SecondaryButton
                          onClick={async () => {
                            await markNotificationRead?.(item.id);
                            showToast('تم تعليم التنبيه كمقروء.', 'success');
                          }}
                          icon={<Check className="h-4 w-4" />}
                        >
                          تمت القراءة
                        </SecondaryButton>
                      ) : null}

                      <SecondaryButton
                        onClick={async () => {
                          await dismissNotification?.(item.id);
                          showToast('تم إخفاء التنبيه من القائمة.', 'success');
                        }}
                        icon={<CheckCheck className="h-4 w-4" />}
                      >
                        إخفاء
                      </SecondaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
