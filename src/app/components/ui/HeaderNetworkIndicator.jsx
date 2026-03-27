import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { cx } from './AppPrimitives';

const AUTO_COLLAPSE_MS = 4600;

export default function HeaderNetworkIndicator({
  isOnline = true,
  justRestored = false,
  connectionLabel = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isOnline) {
      setIsOpen(true);
      timerRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, AUTO_COLLAPSE_MS);
      return () => {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    if (justRestored) {
      setIsOpen(true);
      timerRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, 3200);
      return () => {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    setIsOpen(false);
    return undefined;
  }, [isOnline, justRestored]);

  if (isOnline && !justRestored) return null;

  const Icon = isOnline ? Wifi : WifiOff;
  const label = isOnline ? 'متصل' : 'أوفلاين';
  const summary = isOnline ? connectionLabel || 'رجع الاتصال' : 'أنت أوفلاين حالياً';
  const detail = isOnline
    ? 'رجع الاتصال بالإنترنت والتحديثات رجعت تشتغل بشكل طبيعي.'
    : 'تقدر تراجع البيانات الموجودة، لكن البحث الحالي، تثبيت المقاعد، الدفع، والإلغاء يحتاجوا إنترنت ثابت.';

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={summary}
        aria-expanded={isOpen}
        className={cx(
          'app-pressable inline-flex h-11 items-center gap-2 rounded-full border px-3 transition',
          isOnline
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100',
        )}
        title={summary}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="hidden md:inline text-sm font-black">{label}</span>
      </button>

      {isOpen ? (
        <div
          className={cx(
            'absolute left-0 top-[calc(100%+10px)] z-[70] w-[min(82vw,360px)] rounded-[24px] border px-4 py-4 text-right shadow-[var(--shadow-floating)] backdrop-blur-xl',
            isOnline
              ? 'border-emerald-200/80 bg-emerald-50/96 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/88 dark:text-emerald-100'
              : 'border-amber-200/85 bg-amber-50/96 text-amber-900 dark:border-amber-900/45 dark:bg-amber-950/90 dark:text-amber-100',
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cx(
                'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[18px]',
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{summary}</p>
              <p className="mt-1 text-sm font-bold leading-6 opacity-90">{detail}</p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="app-pressable grid h-9 w-9 shrink-0 place-items-center rounded-full border border-current/15 bg-white/50 text-current transition hover:bg-white/70 dark:bg-white/5 dark:hover:bg-white/10"
              aria-label="إخفاء تفاصيل الإنترنت"
              title="إخفاء"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
