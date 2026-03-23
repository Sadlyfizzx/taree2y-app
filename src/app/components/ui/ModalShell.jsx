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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(16,35,63,0.4)] dark:border-slate-800 dark:bg-slate-900',
          maxWidth,
          className,
        )}
      >
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {icon}
                </span>
              ) : null}
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
                {subtitle ? (
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className={cx('max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
