import { useEffect } from 'react';
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
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const { body, documentElement } = document;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      htmlOverflow: documentElement.style.overflow,
      overscroll: body.style.overscrollBehavior,
      touch: body.style.touchAction,
    };

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    body.style.touchAction = 'none';

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.overscrollBehavior = prev.overscroll;
      body.style.touchAction = prev.touch;
      documentElement.style.overflow = prev.htmlOverflow;
      window.scrollTo({ top: scrollY, behavior: 'auto' });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={cx(
          'app-surface app-surface-strong flex w-full max-h-[88svh] flex-col overflow-hidden rounded-[28px] shadow-[var(--shadow-floating)] sm:max-h-[min(86vh,860px)] sm:rounded-[32px]',
          maxWidth,
          className,
        )}
      >
        <div className="border-b border-[var(--line)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:h-12 sm:w-12">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <h3 className="text-lg font-black text-[var(--ink)] sm:text-xl">{title}</h3>
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
              className="interactive-press grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-muted)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface)] hover:text-[var(--ink)] sm:h-11 sm:w-11"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={cx('hide-scrollbar overflow-y-auto px-4 py-4 sm:max-h-[70vh] sm:px-6 sm:py-5', bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--line)] bg-[var(--surface-overlay)] px-4 py-4 backdrop-blur-md sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
