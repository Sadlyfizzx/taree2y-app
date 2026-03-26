import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from 'lucide-react';

const TOAST_META = {
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50/96 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/78 dark:text-emerald-100',
  },
  error: {
    icon: AlertCircle,
    className:
      'border-rose-200 bg-rose-50/96 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/78 dark:text-rose-100',
  },
  warning: {
    icon: TriangleAlert,
    className:
      'border-amber-200 bg-amber-50/96 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/78 dark:text-amber-100',
  },
  info: {
    icon: Info,
    className:
      'border-indigo-200 bg-indigo-50/96 text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/78 dark:text-indigo-100',
  },
};

export default function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] mx-auto flex w-[min(92vw,440px)] flex-col gap-2 px-4">
      {toasts.map((toast) => {
        const meta = TOAST_META[toast.type] || TOAST_META.info;
        const Icon = meta.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-[24px] border px-4 py-4 shadow-[var(--shadow-elevated)] backdrop-blur ${meta.className}`}
          >
            <span className="mt-0.5 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-black leading-6">{toast.msg}</p>
          </div>
        );
      })}
    </div>
  );
}
