import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from './AppPrimitives';

let activeModalLocks = 0;
let modalScrollSnapshot = null;

function acquireBodyScrollLock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  activeModalLocks += 1;

  if (activeModalLocks === 1) {
    const body = document.body;
    const documentElement = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    modalScrollSnapshot = {
      scrollY,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: documentElement.style.overflow,
      htmlOverscrollBehavior: documentElement.style.overscrollBehavior,
    };

    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.touchAction = 'none';
  }

  return () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    activeModalLocks = Math.max(0, activeModalLocks - 1);
    if (activeModalLocks !== 0 || !modalScrollSnapshot) {
      return;
    }

    const snapshot = modalScrollSnapshot;
    modalScrollSnapshot = null;

    const body = document.body;
    const documentElement = document.documentElement;
    body.style.overflow = snapshot['bodyOverflow'];
    body.style.position = snapshot['bodyPosition'];
    body.style.top = snapshot['bodyTop'];
    body.style.left = snapshot['bodyLeft'];
    body.style.right = snapshot['bodyRight'];
    body.style.width = snapshot['bodyWidth'];
    body.style.touchAction = snapshot['bodyTouchAction'];
    documentElement.style.overflow = snapshot['htmlOverflow'];
    documentElement.style.overscrollBehavior = snapshot['htmlOverscrollBehavior'];
    window.scrollTo({ top: snapshot['scrollY'], left: 0, behavior: 'auto' });
  };
}

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
  useEffect(() => acquireBodyScrollLock(), []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/62 px-4 py-[max(20px,env(safe-area-inset-top))] backdrop-blur-sm sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'app-surface app-surface-strong flex max-h-[min(84dvh,760px)] w-full flex-col overflow-hidden rounded-[28px] shadow-[var(--shadow-floating)] sm:max-h-[min(88vh,860px)] sm:rounded-[32px]',
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

        <div
          className={cx(
            'hide-scrollbar max-h-[min(56dvh,480px)] overflow-y-auto px-4 py-4 sm:max-h-[70vh] sm:px-6 sm:py-5',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--line)] bg-[var(--surface-overlay)] px-4 py-3.5 backdrop-blur-md sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
