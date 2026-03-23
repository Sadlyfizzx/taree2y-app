import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[9999] flex w-[min(92vw,480px)] -translate-x-1/2 flex-col gap-3">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        return (
          <div
            key={toast.id}
            className={`animate-fade-in-down pointer-events-auto overflow-hidden rounded-[24px] border px-4 py-3 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl ${
              isSuccess
                ? 'border-emerald-200 bg-emerald-500/95 text-white dark:border-emerald-500/30'
                : 'border-rose-200 bg-rose-500/95 text-white dark:border-rose-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18">
                {isSuccess ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black leading-6">{toast.msg}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
