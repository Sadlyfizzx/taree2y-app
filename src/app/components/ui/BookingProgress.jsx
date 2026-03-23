import { BOOKING_FLOW_STEPS } from '../../design/tokens';
import { cx } from './AppPrimitives';

export default function BookingProgress({ current = 'results', className = '' }) {
  const activeIndex = Math.max(
    0,
    BOOKING_FLOW_STEPS.findIndex((step) => step.key === current),
  );

  return (
    <div className={cx('hide-scrollbar flex items-center gap-2 overflow-x-auto', className)}>
      {BOOKING_FLOW_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <div key={step.key} className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-2.5 py-1.5 dark:bg-slate-800/80">
              <span
                className={cx(
                  'grid h-7 w-7 place-items-center rounded-full text-xs font-black transition-all',
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cx(
                  'text-xs font-black',
                  isCurrent || isDone
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < BOOKING_FLOW_STEPS.length - 1 ? (
              <span
                className={cx(
                  'h-1 w-8 rounded-full',
                  index < activeIndex
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
