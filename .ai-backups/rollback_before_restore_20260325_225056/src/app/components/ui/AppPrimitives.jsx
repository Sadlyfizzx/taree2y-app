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
  neutral: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  brand: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/30 dark:text-rose-200',
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

export function AppSurface({ children, className = '', tone = 'default', ...props }) {
  return (
    <section
      {...props}
      className={cx(
        'app-surface rounded-[28px] border p-0 transition-colors duration-200',
        tone === 'soft' && 'app-surface-soft',
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
          <p className="text-xs font-black tracking-[0.16em] text-indigo-600 dark:text-indigo-300">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-[2rem]">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={cx('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function MetaChip({ label, tone = 'neutral', className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-black transition-colors',
        chipToneClasses[tone] || chipToneClasses.neutral,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status, label, className = '' }) {
  const tone = statusTones[status] || 'neutral';
  return (
    <span className={cx('inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black', badgeToneClasses[tone], className)}>
      {label || status}
    </span>
  );
}

function ButtonLabel({ loading, loadingText, children }) {
  if (!loading) return children;
  return loadingText || 'جاري التنفيذ…';
}

export function PrimaryButton({
  children,
  icon,
  loading = false,
  loadingText = '',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      className={cx(
        'app-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span><ButtonLabel loading={loading} loadingText={loadingText}>{children}</ButtonLabel></span>
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  loading = false,
  loadingText = '',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      className={cx(
        'app-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span><ButtonLabel loading={loading} loadingText={loadingText}>{children}</ButtonLabel></span>
    </button>
  );
}

export function FieldShell({ label, hint, icon, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900 dark:text-white">{label}</span>
        {hint ? <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{hint}</span> : null}
      </div>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute inset-y-0 right-4 my-auto text-slate-400">{icon}</span> : null}
        {children}
      </div>
    </label>
  );
}

export function KeyValueRow({ label, value, className = '', valueClassName = '' }) {
  return (
    <div className={cx('flex items-start justify-between gap-3', className)}>
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cx('text-sm font-black text-slate-900 dark:text-white', valueClassName)}>{value}</span>
    </div>
  );
}

export function StickyActionBar({ children, className = '' }) {
  return (
    <div className={cx('sticky bottom-[calc(env(safe-area-inset-bottom)+14px)] z-30 mt-5', className)}>
      {children}
    </div>
  );
}

export function DesktopNavItem({ icon, label, active = false, onClick, collapsed = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'app-nav-item flex w-full items-center rounded-[22px] px-3 py-3 text-right transition-all duration-200',
        active && 'app-nav-item-active',
        collapsed ? 'justify-center' : 'gap-3',
      )}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl">{icon}</span>
      {!collapsed ? <span className="text-sm font-black">{label}</span> : null}
    </button>
  );
}

export function BottomNavItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-3 py-2.5 text-xs font-black transition-all duration-200',
        active
          ? 'bg-indigo-600 text-white shadow-[0_16px_30px_-22px_rgba(33,86,217,0.7)]'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
