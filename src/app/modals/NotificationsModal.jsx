import React, { useEffect, useMemo, useState } from 'react';
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
import { MetaChip, SecondaryButton, cx } from '../components/ui/AppPrimitives';
import { formatInteger } from '../utils/formatting';

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
  if (item?.category === 'trip') return 'فتح الرحلة';
  if (item?.category === 'wallet') return 'فتح المحفظة';
  if (item?.category === 'promo') return 'فتح العرض';
  if (item?.category === 'referral') return 'فتح الإحالة';
  return 'فتح';
}

function lockBodyScrollForMobile() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window.innerWidth >= 768) return () => {};

  const body = document.body;
  const html = document.documentElement;
  const scrollY = window.scrollY || html.scrollTop || body.scrollTop || 0;
  const snapshot = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyTouchAction: body.style.touchAction,
    bodyOverscroll: body.style.overscrollBehavior,
    htmlOverflow: html.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
  };

  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.touchAction = 'none';
  body.style.overscrollBehavior = 'none';

  return () => {
    html.style.overflow = snapshot.htmlOverflow;
    html.style.overscrollBehavior = snapshot.htmlOverscroll;
    body.style.overflow = snapshot.bodyOverflow;
    body.style.position = snapshot.bodyPosition;
    body.style.top = snapshot.bodyTop;
    body.style.width = snapshot.bodyWidth;
    body.style.touchAction = snapshot.bodyTouchAction;
    body.style.overscrollBehavior = snapshot.bodyOverscroll;
    window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
  };
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

  useEffect(() => lockBodyScrollForMobile(), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeModal?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeModal]);

  const filteredNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, filter)),
    [filter, notifications],
  );

  return (
    <>
      <button
        type="button"
        aria-label="إغلاق قائمة التنبيهات"
        onClick={closeModal}
        className="fixed inset-0 z-[95] bg-slate-950/18 md:bg-slate-950/10"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="التنبيهات"
        className="fixed inset-x-3 top-[max(env(safe-area-inset-top),0.85rem)] z-[96] mx-auto flex max-h-[calc(100dvh-1.7rem-env(safe-area-inset-top))] w-auto max-w-[28rem] flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_30px_80px_-36px_rgba(15,23,42,0.42)] md:left-auto md:right-6 md:top-6 md:w-[26rem] md:max-h-[min(78vh,720px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--line)] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                  <BellRing className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-[var(--ink)]">التنبيهات</p>
                  <p className="mt-0.5 text-xs font-bold text-[var(--ink-muted)]">
                    {unreadCount > 0 ? `عندك ${formatInteger(unreadCount)} غير مقروءة` : 'كل التنبيهات واضحة ومقروءة'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await requestBrowserPermission?.();
                    if (result === 'denied') {
                      showToast?.('فعّل الإشعارات من إعدادات المتصفح أولاً.', 'info');
                    }
                  } catch {
                    showToast?.('تعذر تفعيل إشعارات المتصفح حالياً.', 'error');
                  }
                }}
                className="hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)] md:inline-flex"
              >
                تفعيل إشعارات المتصفح
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-11 w-11 place-items-center rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-xs font-black text-[var(--ink)]"
            >
              تعليم الكل كمقروء
            </button>
            <button
              type="button"
              onClick={clearNotifications}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-xs font-black text-[var(--ink-muted)]"
            >
              مسح الكل
            </button>
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 md:flex">
            {FILTERS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setFilter(entry.key)}
                className={cx(
                  'rounded-full px-3 py-2 text-xs font-black transition-all',
                  filter === entry.key
                    ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_14px_28px_-18px_rgba(33,86,217,0.45)]'
                    : 'border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)]',
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {filteredNotifications.length === 0 ? (
            <div className="p-1">
              <EmptyStateCard
                title="مفيش تنبيهات حالياً"
                text="أول ما يحصل تحديث مهم في الرحلة أو المحفظة أو العروض، هيوصل هنا بشكل أوضح."
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((item) => {
                const meta = getCategoryMeta(item);
                const Icon = meta.icon;
                const isUnread = !item?.readAt;
                const actionLabel = inferActionLabel(item);

                return (
                  <article
                    key={item.id}
                    className={cx(
                      'rounded-[24px] border px-3.5 py-3.5 transition-all md:px-4 md:py-4',
                      isUnread
                        ? 'border-[rgba(33,86,217,0.18)] bg-[var(--info-bg)]/55'
                        : 'border-[var(--line)] bg-[var(--surface-soft)]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[16px]',
                          isUnread
                            ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white'
                            : 'bg-[var(--surface-strong)] text-[var(--ink-muted)]',
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-[var(--ink)]">{item.title || 'تنبيه جديد'}</p>
                              {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)] md:bg-[var(--brand-accent)]" /> : null}
                            </div>
                            <p className="mt-1 text-[11px] font-bold text-[var(--ink-soft)] md:text-xs">{formatNotificationDate(item.createdAt)}</p>
                          </div>

                          <div className="hidden md:flex md:items-center md:gap-2">
                            <MetaChip label={meta.label} tone={meta.tone} className="min-h-8 px-2.5 py-1 text-[11px]" />
                            {isUnread ? <MetaChip label="جديد" tone="brand" className="min-h-8 px-2.5 py-1 text-[11px]" /> : null}
                          </div>
                        </div>

                        <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">{item.body || item.message || 'وصل تنبيه جديد في حسابك.'}</p>

                        <div className="mt-3 flex items-center justify-between gap-2 md:hidden">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                markNotificationRead?.(item.id);
                                onOpenItem?.(item);
                              }}
                              aria-label={actionLabel}
                              className="grid h-10 w-10 place-items-center rounded-[16px] border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => markNotificationRead?.(item.id)}
                              aria-label="تعليم كمقروء"
                              className="grid h-10 w-10 place-items-center rounded-[16px] border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => dismissNotification?.(item.id)}
                              aria-label="إخفاء"
                              className="grid h-10 w-10 place-items-center rounded-[16px] border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {isUnread ? <Clock3 className="h-4 w-4 text-[var(--brand)]" /> : <CheckCheck className="h-4 w-4 text-emerald-600" />}
                        </div>

                        <div className="mt-4 hidden items-center justify-between gap-2 md:flex">
                          <div className="flex gap-2">
                            <SecondaryButton
                              className="min-h-10 px-4 py-2 text-xs"
                              onClick={() => {
                                markNotificationRead?.(item.id);
                                onOpenItem?.(item);
                              }}
                              icon={<ChevronLeft className="h-4 w-4" />}
                            >
                              {actionLabel}
                            </SecondaryButton>
                            <SecondaryButton
                              className="min-h-10 px-4 py-2 text-xs"
                              onClick={() => markNotificationRead?.(item.id)}
                              icon={<Check className="h-4 w-4" />}
                            >
                              تعليم كمقروء
                            </SecondaryButton>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissNotification?.(item.id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-xs font-black text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--danger)]"
                          >
                            <Trash2 className="h-4 w-4" />
                            إخفاء
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden border-t border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 md:block">
          <div className="flex items-center justify-between gap-2">
            <SecondaryButton className="min-h-10 px-4 py-2 text-xs" onClick={markAllRead} icon={<CheckCheck className="h-4 w-4" />}>
              تعليم الكل كمقروء
            </SecondaryButton>
            <button
              type="button"
              onClick={clearNotifications}
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 text-xs font-black text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--danger)]"
            >
              <Trash2 className="h-4 w-4" />
              مسح الكل
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
