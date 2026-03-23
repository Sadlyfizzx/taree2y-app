import React from 'react';
import { BusFront, X } from 'lucide-react';

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

const toneMap = {
  indigo: {
    chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-500/20',
    icon: 'bg-indigo-500/12 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/20',
    icon: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  amber: {
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/20',
    icon: 'bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },
  rose: {
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/20',
    icon: 'bg-rose-500/12 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  },
};

export function AppLogo({ compact = false, className = '', tagline = 'السفر جوه مصر بقى أسهل' }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-[0_18px_40px_-16px_rgba(79,70,229,0.75)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_transparent_48%)]" />
        <BusFront className="relative z-10 h-7 w-7" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[1.85rem] font-black leading-none tracking-tight text-slate-900 dark:text-white">
            طريقي
          </div>
          <div className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
            {tagline}
          </div>
        </div>
      )}
    </div>
  );
}

export function GlassCard({ className = '', children }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_70px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScreenHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 inline-flex items-center rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-[2rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SoftBadge({ icon, text, tone = 'indigo', className = '' }) {
  const palette = toneMap[tone] || toneMap.indigo;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black',
        palette.chip,
        className,
      )}
    >
      {icon ? <span className="inline-flex">{icon}</span> : null}
      <span>{text}</span>
    </div>
  );
}

export function SectionLabel({ text, className = '' }) {
  return (
    <div className={cn('mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500', className)}>
      {text}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <GlassCard className={cn('mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {React.isValidElement(icon) ? React.cloneElement(icon, { className: 'h-9 w-9' }) : icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </GlassCard>
  );
}

export function KeyValueRow({ label, value, valueClassName = '', className = '' }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm font-bold', className)}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-slate-900 dark:text-slate-100', valueClassName)}>{value}</span>
    </div>
  );
}

export function LoadingPulseCard({ className = '' }) {
  return (
    <GlassCard className={cn('animate-pulse space-y-4', className)}>
      <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div className="h-20 rounded-[24px] bg-slate-100 dark:bg-slate-800" />
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 w-20 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </GlassCard>
  );
}

export function ModalShell({
  tone = 'indigo',
  title,
  subtitle,
  icon,
  closeModal,
  children,
  maxWidth = 'max-w-[560px]',
}) {
  const palette = toneMap[tone] || toneMap.indigo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-in-down">
      <div className={cn('relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl dark:bg-slate-950', maxWidth)}>
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.22),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.22),_transparent_60%)]" />
        <button
          onClick={closeModal}
          className="absolute left-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-500 shadow-sm transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative max-h-[90vh] overflow-y-auto px-6 pb-6 pt-7 md:px-7 hide-scrollbar">
          <div className="mb-7 flex items-start gap-4 pl-12">
            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border', palette.chip)}>
              {React.isValidElement(icon) ? React.cloneElement(icon, { className: 'h-7 w-7' }) : icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h3>
              {subtitle ? (
                <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
