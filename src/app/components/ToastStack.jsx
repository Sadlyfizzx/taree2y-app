import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] mx-auto flex w-[min(92vw,420px)] flex-col gap-2">
      {toasts.map((toast) => {
        const success = toast.type === 'success';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-[24px] border px-4 py-4 shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] backdrop-blur ${
              success
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/80 dark:text-emerald-100'
                : 'border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/80 dark:text-rose-100'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </span>
            <p className="text-sm font-black leading-6">{toast.msg}</p>
          </div>
        );
      })}
    </div>
  );
}
