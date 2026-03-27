import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const panelRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(event.target)) return;
      closeModal?.();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal]);

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
    <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[95] px-4 md:left-auto md:right-6 md:top-[86px] md:w-[420px] md:px-0" dir="rtl">
      <div
        ref={panelRef}
        className="pointer-events-auto app-surface app-surface-strong mx-auto flex max-h-[min(74dvh,680px)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-overlay)] shadow-[var(--shadow-floating)] backdrop-blur-xl md:mx-0 md:max-w-[420px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[18px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                <BellRing className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-black text-[var(--ink)]">التنبيهات</p>
                <p className="mt-1 text-xs font-bold text-[var(--ink-muted)]">
                  الرحلات والمحفظة والعروض في قائمة سريعة بدل popup كامل.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="إغلاق"
            className="interactive-press grid h-10 w-10 shrink-0 place-items-center rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="border-b border-[var(--line)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <MetaChip label={`${summaryCounts.unread} غير مقروء`} tone={summaryCounts.unread ? 'warning' : 'neutral'} />
            <MetaChip label={`${summaryCounts.total} إجمالي`} tone="brand" />
            <MetaChip label={`${summaryCounts.wallet} للمحفظة`} tone="success" />
            <MetaChip label={`${summaryCounts.promo} عروض`} tone="warning" />
          </div>

          <div className="hide-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`interactive-press inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition-all ${
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
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {visibleNotifications.length === 0 ? (
            <EmptyStateCard
              title={filter === 'all' ? 'لسه مفيش تنبيهات' : 'مفيش حاجة في القسم ده'}
              text="أول ما يحصل تحديث مهم، هتلاقيه هنا في flyout سريع من غير ما التطبيق يختفي تحته popup كامل."
            />
          ) : (
            <div className="space-y-3">
              {visibleNotifications.map((item) => {
                const meta = getCategoryMeta(item);
                const Icon = meta.icon;
                const actionLabel = inferActionLabel(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-[24px] border px-4 py-4 transition-colors ${
                      item.readAt
                        ? 'border-[var(--line)] bg-[var(--surface-strong)]'
                        : 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <MetaChip label={meta.label} tone={meta.tone} />
                          {item.readAt ? <MetaChip label="مقروءة" tone="neutral" /> : <MetaChip label="جديدة" tone="warning" />}
                          {item.priority >= 80 ? <MetaChip label="مهمة" tone="danger" /> : null}
                        </div>
                        <p className="mt-3 text-sm font-black text-[var(--ink)] sm:text-base">{item.title}</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                          {item.body}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--ink-muted)] sm:text-sm">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-4 w-4" />
                            {formatNotificationDate(item.createdAt)}
                          </span>
                          {item.routeLabel ? <span>{item.routeLabel}</span> : null}
                          {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-[158px] sm:shrink-0">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] bg-[var(--surface-overlay)] px-4 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
    </div>
  );
}
