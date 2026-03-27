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
  const flyoutRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (flyoutRef.current && !flyoutRef.current.contains(event.target)) {
        closeModal?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal?.();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, filter)).slice(0, 8),
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
    <div
      ref={flyoutRef}
      className="absolute left-1/2 top-[calc(100%+12px)] z-[95] w-[min(92vw,430px)] -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
      dir="rtl"
    >
      <div className="app-surface app-surface-strong overflow-hidden rounded-[28px] border border-[var(--line)] shadow-[0_30px_80px_-40px_rgba(16,35,63,0.42)] backdrop-blur-xl">
        <div className="border-b border-[var(--line)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-[18px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                  <BellRing className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-black text-[var(--ink)]">التنبيهات</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[var(--ink-muted)]">
                    آخر التحديثات المهمة من الرحلات والمحفظة والعروض.
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="إغلاق التنبيهات"
              className="interactive-press grid h-10 w-10 shrink-0 place-items-center rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <MetaChip label={`${summaryCounts.unread} غير مقروء`} tone={summaryCounts.unread ? 'warning' : 'neutral'} className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
            <MetaChip label={`${summaryCounts.total} إجمالي`} tone="brand" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
            <MetaChip label={`${summaryCounts.wallet} للمحفظة`} tone="success" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
            <MetaChip label={`${summaryCounts.promo} عروض`} tone="warning" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`interactive-press inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition-all ${
                  filter === item.key
                    ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
                    : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]'
                }`}
              >
                {item.label}
                {item.key === 'unread' ? (
                  <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-black">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="hide-scrollbar max-h-[min(62dvh,520px)] overflow-y-auto px-4 py-3">
          {visibleNotifications.length === 0 ? (
            <EmptyStateCard
              title={filter === 'all' ? 'لسه مفيش تنبيهات' : 'مفيش حاجة في القسم ده'}
              text="أول ما يحصل تحديث يهمك، هتلاقيه هنا مع زر واضح يفتح المكان المناسب جوه التطبيق."
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
                    className={`rounded-[24px] border px-3.5 py-3 transition-colors ${
                      item.readAt
                        ? 'border-[var(--line)] bg-[var(--surface-strong)]'
                        : 'border-indigo-200 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[18px] bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <MetaChip label={meta.label} tone={meta.tone} className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
                          {item.readAt ? (
                            <MetaChip label="مقروءة" tone="neutral" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
                          ) : (
                            <MetaChip label="جديدة" tone="warning" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" />
                          )}
                          {item.priority >= 80 ? <MetaChip label="مهمة" tone="danger" className="min-h-0 rounded-[16px] px-3 py-1.5 text-[11px]" /> : null}
                        </div>

                        <p className="mt-2 text-sm font-black text-[var(--ink)]">{item.title}</p>
                        <p className="mt-1.5 text-xs font-bold leading-6 text-[var(--ink-muted)]">
                          {item.body}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[var(--ink-muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatNotificationDate(item.createdAt)}
                          </span>
                          {item.routeLabel ? <span>{item.routeLabel}</span> : null}
                          {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {actionLabel ? (
                            <PrimaryButton
                              onClick={async () => {
                                await onOpenItem?.(item);
                              }}
                              icon={<ChevronLeft className="h-4 w-4" />}
                              className="min-h-11 rounded-[18px] px-4 py-2 text-xs"
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
                              className="min-h-11 rounded-[18px] px-4 py-2 text-xs"
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
                            className="min-h-11 rounded-[18px] px-4 py-2 text-xs"
                          >
                            إخفاء
                          </SecondaryButton>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] px-4 py-3">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={async () => {
                  const result = await requestBrowserPermission();
                  showToast(result.message, result.ok ? 'success' : 'error');
                }}
                className="min-h-11 rounded-[18px] px-4 py-2 text-xs"
              >
                تفعيل إشعارات الجهاز
              </SecondaryButton>
              <SecondaryButton onClick={markAllRead} className="min-h-11 rounded-[18px] px-4 py-2 text-xs">
                تعليم الكل كمقروء
              </SecondaryButton>
            </div>
            <PrimaryButton
              onClick={() => {
                clearNotifications();
                showToast('تم مسح سجل التنبيهات.', 'success');
              }}
              icon={<Trash2 className="h-4 w-4" />}
              className="min-h-11 rounded-[18px] bg-rose-600 px-4 py-2 text-xs hover:bg-rose-700 shadow-rose-600/25"
            >
              مسح السجل
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
