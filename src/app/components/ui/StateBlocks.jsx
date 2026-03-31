import {
  AlertCircle,
  Clock,
  RefreshCcw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { AppSurface, PrimaryButton, SecondaryButton, cx } from './AppPrimitives';

const toneStyles = {
  info: 'border-[rgba(33,86,217,0.14)] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]',
  success: 'border-[rgba(13,127,95,0.16)] bg-[var(--success-bg)] text-[var(--success)]',
  warning: 'border-[rgba(184,106,14,0.16)] bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'border-[rgba(197,54,82,0.16)] bg-[var(--danger-bg)] text-[var(--danger)]',
  neutral: 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)]',
};

const toneIcons = {
  info: AlertCircle,
  success: Clock,
  warning: TriangleAlert,
  danger: AlertCircle,
  neutral: RefreshCcw,
};

export function InlineNotice({
  tone = 'info',
  title,
  text,
  icon,
  actionLabel,
  onAction,
  className = '',
}) {
  const Icon = icon || toneIcons[tone] || AlertCircle;

  return (
    <div
      className={cx(
        'flex flex-col gap-3 rounded-[24px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
        toneStyles[tone] || toneStyles.info,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          {title ? <p className="text-sm font-black">{title}</p> : null}
          {text ? (
            <p className="mt-1 text-sm font-bold leading-6 opacity-95">{text}</p>
          ) : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <SecondaryButton
          className="border-current/15 bg-white/72 text-current hover:bg-white/90 dark:bg-slate-950/35"
          onClick={onAction}
        >
          {actionLabel}
        </SecondaryButton>
      ) : null}
    </div>
  );
}

export function EmptyStateCard({
  icon,
  title,
  text,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) {
  const Icon = icon || Search;

  return (
    <AppSurface className={cx('mx-auto max-w-2xl px-6 py-12 text-center', className)}>
      <div className="mx-auto mb-5 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-[26px] bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-black text-[var(--ink)]">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-7 text-[var(--ink-muted)]">
        {text}
      </p>
      {(actionLabel && onAction) ||
      (secondaryActionLabel && onSecondaryAction) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction ? (
            <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <SecondaryButton onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </SecondaryButton>
          ) : null}
        </div>
      ) : null}
    </AppSurface>
  );
}

export function TripCardSkeleton() {
  return (
    <AppSurface className="overflow-hidden px-5 py-5">
      <div className="animate-pulse">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-2">
              <div className="h-6 w-[4.5rem] rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-10 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2 text-left">
              <div className="mr-auto h-6 w-[4.5rem] rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="mr-auto h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-12 w-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </AppSurface>
  );
}

export function LoadingPanel({
  title = 'جاري التحميل',
  text = 'بنجهز المحتوى دلوقتي…',
  className = '',
}) {
  return (
    <AppSurface className={cx('mx-auto max-w-xl px-6 py-10 text-center', className)}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
        <Clock className="h-7 w-7 animate-pulse" />
      </div>
      <h3 className="text-lg font-black text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
        {text}
      </p>
    </AppSurface>
  );
}
