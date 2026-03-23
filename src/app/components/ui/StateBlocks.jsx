import { AlertCircle, Clock, Search } from 'lucide-react';
import { AppSurface, PrimaryButton, SecondaryButton, cx } from './AppPrimitives';

const toneStyles = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800/50 dark:bg-indigo-900/20 dark:text-indigo-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-900/20 dark:text-rose-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
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
  const Icon = icon || AlertCircle;

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
          {text ? <p className="mt-1 text-sm font-bold opacity-90">{text}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <SecondaryButton className="border-current/20 bg-white/70 text-current dark:bg-slate-900/40" onClick={onAction}>
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
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
        {text}
      </p>
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction ? <PrimaryButton onClick={onAction}>{actionLabel}</PrimaryButton> : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <SecondaryButton onClick={onSecondaryAction}>{secondaryActionLabel}</SecondaryButton>
          ) : null}
        </div>
      ) : null}
    </AppSurface>
  );
}

export function TripCardSkeleton() {
  return (
    <AppSurface className="animate-pulse px-5 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-5 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="space-y-2">
            <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2 text-left">
            <div className="mr-auto h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mr-auto h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-12 w-32 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </AppSurface>
  );
}

export function LoadingPanel({ title = 'جاري التحميل', text = 'بنجهز البيانات حالاً…', className = '' }) {
  return (
    <AppSurface className={cx('mx-auto max-w-xl px-6 py-10 text-center', className)}>
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
        <Clock className="h-6 w-6 animate-pulse" />
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{text}</p>
    </AppSurface>
  );
}
