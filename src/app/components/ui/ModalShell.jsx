import { X } from 'lucide-react';
import { cx } from './AppPrimitives';

export default function ModalShell({
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-xl',
  className = '',
  bodyClassName = '',
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/62 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'app-surface app-surface-strong flex max-h-[min(90vh,860px)] w-full flex-col overflow-hidden rounded-[32px] shadow-[var(--shadow-floating)]',
          maxWidth,
          className,
        )}
      >
        <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
                  {icon}
                </span>
              ) : null}
              <div>
                <h3 className="text-xl font-black text-[var(--ink)]">{title}</h3>
                {subtitle ? (
                  <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="interactive-press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={cx('hide-scrollbar max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--line)] bg-[var(--surface-overlay)] px-5 py-4 backdrop-blur-md sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
