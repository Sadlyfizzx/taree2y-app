import React from 'react';
import { cn } from './Taree2yUI';

function DesktopNavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : ''}
      className={cn(
        'group relative flex w-full items-center rounded-[24px] border px-4 py-3.5 text-right transition-all duration-300',
        collapsed ? 'justify-center px-0' : 'gap-3.5',
        active
          ? 'border-indigo-200 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_18px_50px_-24px_rgba(79,70,229,0.75)] dark:border-indigo-500/20'
          : 'border-transparent bg-white/55 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/40 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900/70',
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition',
          active
            ? 'bg-white/16 text-white'
            : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-300',
        )}
      >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{label}</div>
        </div>
      )}
    </button>
  );
}

function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2.5 transition"
    >
      <div
        className={cn(
          'absolute inset-x-2 top-1 h-1 rounded-full transition',
          active ? 'bg-indigo-500 opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-2xl transition-all',
          active
            ? 'bg-indigo-500 text-white shadow-[0_14px_36px_-20px_rgba(79,70,229,0.85)]'
            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-300',
        )}
      >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
      </div>
      <span
        className={cn(
          'text-[11px] font-black transition',
          active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function FilterChip({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black whitespace-nowrap transition',
        active
          ? 'border-indigo-500 bg-indigo-500 text-white shadow-[0_16px_36px_-22px_rgba(79,70,229,0.8)]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Badge({ color, text }) {
  return (
    <div className={cn('absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-black shadow-sm', color)}>
      {text}
    </div>
  );
}

export { DesktopNavItem, BottomNavItem, FilterChip, Badge };
