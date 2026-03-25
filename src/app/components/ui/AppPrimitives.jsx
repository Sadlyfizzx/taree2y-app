/* eslint-disable react-refresh/only-export-components */
import React from 'react';

export function cx(...inputs) {
  return inputs
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'object') {
        return Object.entries(value)
          .filter(([, isActive]) => Boolean(isActive))
          .map(([key]) => key);
      }
      return [value];
    })
    .join(' ');
}

const chipToneClasses = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  brand: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
};

const badgeToneClasses = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  brand: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
};

const statusTones = {
  upcoming: 'success',
  refund_pending: 'warning',
  cancelled: 'danger',
  past: 'neutral',
};

export function AppSurface({ children, className = '', tone = 'default' }) {
  return (
    <section
      className={cx(
        'rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] dark:border-slate-800 dark:bg-slate-900',
        tone === 'soft' && 'bg-slate-50/90 dark:bg-slate-900/80',
        tone === 'inverse' && 'border-transparent bg-[var(--ink)] text-white dark:bg-slate-950',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageHeading({ eyebrow, title, subtitle, actions, className = '' }) {
  return (
    <div className={cx('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-black tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={cx('flex items-center justify-between gap-3', className)}>
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}


function ButtonSpinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

export function PrimaryButton({
  children,
  icon,
  className = '',
  loading = false,
  loadingText = '',
  disabled = false,
  ...props
}) {
  const resolvedDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
        className,
      )}
      disabled={resolvedDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <ButtonSpinner />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  className = '',
  loading = false,
  loadingText = '',
  disabled = false,
  ...props
}) {
  const resolvedDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-800',
        className,
      )}
      disabled={resolvedDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <ButtonSpinner />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}

export function ActionChip({ children, icon, className = '', ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-slate-800',
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export function MetaChip({ icon, label, tone = 'neutral', className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black',
        chipToneClasses[tone] || chipToneClasses.neutral,
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="leading-5">{label}</span>
    </span>
  );
}

export function StatusBadge({ status, label, tone, className = '' }) {
  const resolvedTone = tone || statusTones[status] || 'neutral';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black',
        badgeToneClasses[resolvedTone] || badgeToneClasses.neutral,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function FieldShell({ label, hint, icon, children, className = '' }) {
  return (
    <label className={cx('flex flex-col gap-2', className)}>
      <span className="text-sm font-black text-slate-800 dark:text-slate-100">{label}</span>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
            {React.cloneElement(icon, { className: 'h-5 w-5' })}
          </span>
        ) : null}
        {children}
      </div>
      {hint ? <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function KeyValueRow({ label, value, valueClassName = '', className = '' }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 text-sm font-bold', className)}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cx('text-left text-slate-900 dark:text-white', valueClassName)}>{value}</span>
    </div>
  );
}

export function StickyActionBar({ children, className = '' }) {
  return (
    <div
      className={cx(
        'sticky bottom-0 z-30 mt-auto bg-gradient-to-t from-[var(--bg)] via-[color:rgba(244,247,251,0.96)] to-transparent px-0 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-5 dark:from-slate-950 dark:via-[rgba(2,6,23,0.96)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DesktopNavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : ''}
      className={cx(
        'group flex w-full items-center rounded-[22px] border px-4 py-3.5 text-right transition-all',
        collapsed ? 'justify-center px-3' : 'gap-3',
        active
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900',
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-current shadow-sm dark:bg-slate-800/80">
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </span>
      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{label}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            خطوة واضحة وسريعة
          </p>
        </div>
      ) : null}
    </button>
  );
}

export function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition-all',
        active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500',
      )}
    >
      {active ? (
        <span className="absolute inset-x-3 top-0 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      ) : null}
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl transition-all',
          active
            ? 'bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-900/20 dark:text-indigo-300'
            : 'bg-transparent text-current group-hover:bg-slate-100 dark:group-hover:bg-slate-800',
        )}
      >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </span>
      <span className="text-[11px] font-black leading-none">{label}</span>
    </button>
  );
}
