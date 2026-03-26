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
  neutral:
    'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)]',
  brand:
    'border-[rgba(33,86,217,0.14)] bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]',
  success:
    'border-[rgba(13,127,95,0.16)] bg-[var(--success-bg)] text-[var(--success)]',
  warning:
    'border-[rgba(184,106,14,0.16)] bg-[var(--warning-bg)] text-[var(--warning)]',
  danger:
    'border-[rgba(197,54,82,0.16)] bg-[var(--danger-bg)] text-[var(--danger)]',
};

const badgeToneClasses = {
  neutral: 'bg-[var(--surface-soft)] text-[var(--ink-muted)]',
  success: 'bg-[var(--success-bg)] text-[var(--success)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  brand: 'bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]',
};

const statusTones = {
  upcoming: 'success',
  refund_pending: 'warning',
  cancelled: 'danger',
  past: 'neutral',
};

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

export function AppSurface({ children, className = '', tone = 'default' }) {
  const toneClassName =
    tone === 'soft'
      ? 'app-surface-soft'
      : tone === 'strong'
      ? 'app-surface-strong'
      : tone === 'inverse'
      ? 'app-brand-panel text-white'
      : 'app-surface app-surface-hover';

  return (
    <section
      className={cx(
        'min-w-0 w-full rounded-[28px] transition-[transform,box-shadow,border-color,background-color] duration-300',
        toneClassName,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-black tracking-[0.16em] text-[var(--brand-strong)] dark:text-[var(--brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-black tracking-tight text-[var(--ink)] md:text-[2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[var(--ink-muted)] md:text-[15px]">
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
    <div className={cx('flex min-w-0 items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-[var(--ink)] md:text-xl">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  icon,
  className = '',
  loading = false,
  loadingText = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const resolvedDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cx(
        'interactive-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-transparent bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_-18px_rgba(33,86,217,0.48)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_22px_48px_-20px_rgba(33,86,217,0.55)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[linear-gradient(135deg,var(--surface-soft)_0%,var(--surface-strong)_100%)] disabled:text-[var(--ink)] disabled:opacity-65 disabled:shadow-none',
        className,
      )}
      disabled={resolvedDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <ButtonSpinner /> : icon ? <span className="shrink-0">{icon}</span> : null}
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
  type = 'button',
  ...props
}) {
  const resolvedDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cx(
        'interactive-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-black text-[var(--ink)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-[var(--line-strong)] disabled:bg-[var(--surface-soft)] disabled:text-[var(--ink)] disabled:opacity-65 disabled:shadow-none',
        className,
      )}
      disabled={resolvedDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <ButtonSpinner /> : icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}

export function ActionChip({ children, icon, className = '', ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'interactive-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-black text-[var(--ink)] transition-all duration-200 hover:border-[var(--line-strong)] hover:bg-[var(--surface-strong)] disabled:border-[var(--line)] disabled:bg-[var(--surface-soft)] disabled:text-[var(--ink)] disabled:opacity-65',
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
    <label className={cx('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3 text-right">
        {icon ? (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
            {React.cloneElement(icon, { className: 'h-5 w-5' })}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--ink)]">{label}</div>
          {hint ? (
            <div className="mt-0.5 text-xs font-bold leading-5 text-[var(--ink-muted)]">
              {hint}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

export function KeyValueRow({
  label,
  value,
  valueClassName = '',
  className = '',
}) {
  return (
    <div
      className={cx(
        'flex min-w-0 items-start justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3',
        className,
      )}
    >
      <span className="text-sm font-black text-[var(--ink-muted)]">{label}</span>
      <span className={cx('min-w-0 break-words text-left text-sm font-black text-[var(--ink)]', valueClassName)} dir="ltr">
        {value}
      </span>
    </div>
  );
}

export function StickyActionBar({ children, className = '' }) {
  return (
    <div
      className={cx(
        'sticky bottom-0 z-30 mt-auto bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/95 to-transparent px-0 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DesktopNavItem({
  icon,
  label,
  active,
  onClick,
  collapsed,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : ''}
      className={cx(
        'interactive-press group flex w-full items-center rounded-[24px] border px-4 py-3.5 text-right transition-all duration-200',
        collapsed ? 'justify-center px-3' : 'gap-3',
        active
          ? 'border-transparent bg-white/10 text-white shadow-[0_18px_40px_-26px_rgba(16,35,63,0.45)]'
          : 'border-transparent text-slate-200 hover:border-white/10 hover:bg-white/8 hover:text-white',
      )}
    >
      <span
        className={cx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-all',
          active
            ? 'bg-white/14 text-current ring-1 ring-white/10'
            : 'bg-white/8 text-current',
        )}
      >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </span>
      {!collapsed ? <p className="truncate text-sm font-black">{label}</p> : null}
    </button>
  );
}

export function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'interactive-press group relative flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-center transition-all duration-200',
        active
          ? 'bg-[var(--surface-soft)] text-[var(--ink)] shadow-[0_12px_24px_-18px_rgba(16,35,63,0.3)]'
          : 'text-[var(--ink-soft)]',
      )}
    >
      {active ? (
        <span className="absolute inset-x-3 top-0 h-1 rounded-full bg-[linear-gradient(90deg,#163c98_0%,#2156d9_100%)]" />
      ) : null}
      <span
        className={cx(
          'grid h-9 w-9 place-items-center rounded-2xl transition-all',
          active
            ? 'bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
            : 'bg-transparent text-current group-hover:bg-[var(--surface-soft)]',
        )}
      >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </span>
      <span className="text-[11px] font-black leading-none">{label}</span>
    </button>
  );
}
