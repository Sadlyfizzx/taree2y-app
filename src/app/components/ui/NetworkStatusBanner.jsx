import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { AppSurface, cx } from './AppPrimitives';

const OFFLINE_EXPANDED_MS = 4600;

export default function NetworkStatusBanner({
  isOnline,
  show = false,
  justRestored = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const collapseTimerRef = useRef(null);

  useEffect(() => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    if (!show) return undefined;

    if (isOnline) {
      setIsExpanded(true);
      return undefined;
    }

    setIsExpanded(true);
    collapseTimerRef.current = window.setTimeout(() => {
      setIsExpanded(false);
    }, OFFLINE_EXPANDED_MS);

    return () => {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, [isOnline, show]);

  if (!show) return null;

  const Icon = isOnline ? Wifi : WifiOff;

  if (!isOnline && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="interactive-press fixed right-4 top-4 z-[115] inline-flex items-center gap-2 rounded-full border border-amber-200/85 bg-amber-50/95 px-3 py-2 text-xs font-black text-amber-900 shadow-[var(--shadow-floating)] backdrop-blur-xl dark:border-amber-900/50 dark:bg-amber-950/82 dark:text-amber-100"
        aria-label="إظهار تفاصيل حالة الإنترنت"
        title="إظهار تفاصيل حالة الإنترنت"
      >
        <WifiOff className="h-4 w-4" />
        <span>أوفلاين</span>
      </button>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[115] mx-auto flex w-full justify-center px-4">
      <AppSurface
        tone="strong"
        className={cx(
          'pointer-events-auto w-full max-w-[560px] border px-4 py-3 shadow-[var(--shadow-floating)] backdrop-blur-xl',
          isOnline
            ? 'border-emerald-200/80 bg-emerald-50/92 dark:border-emerald-900/40 dark:bg-emerald-950/70'
            : 'border-amber-200/80 bg-amber-50/96 dark:border-amber-900/40 dark:bg-amber-950/76',
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
            <p
              className={cx(
                'text-sm font-black',
                isOnline
                  ? 'text-emerald-900 dark:text-emerald-100'
                  : 'text-amber-900 dark:text-amber-100',
              )}
            >
              {isOnline ? 'رجع الاتصال بالإنترنت' : 'أنت أوفلاين حالياً'}
            </p>
            <p
              className={cx(
                'mt-1 text-sm font-bold leading-6',
                isOnline
                  ? 'text-emerald-800/90 dark:text-emerald-200'
                  : 'text-amber-800/90 dark:text-amber-200',
              )}
            >
              {isOnline
                ? justRestored
                  ? 'التحديثات والدفع والحجز رجعت تشتغل بشكل طبيعي.'
                  : 'التطبيق متصل بالسيرفر الآن.'
                : 'تقدر تراجع البيانات الموجودة، لكن البحث الحالي، تثبيت المقاعد، الدفع، والإلغاء يحتاجوا إنترنت ثابت.'}
            </p>
          </div>

          {!isOnline ? (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="interactive-press mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-white/60 text-amber-800 transition hover:bg-white/80 dark:border-amber-900/50 dark:bg-white/5 dark:text-amber-200 dark:hover:bg-white/10"
              aria-label="تصغير تنبيه الإنترنت"
              title="تصغير"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </AppSurface>
    </div>
  );
}
