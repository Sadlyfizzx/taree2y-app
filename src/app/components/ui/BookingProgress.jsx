import { Check } from 'lucide-react';
import { BOOKING_FLOW_STEPS } from '../../design/tokens';
import { cx } from './AppPrimitives';

export default function BookingProgress({ current = 'results', className = '' }) {
  const activeIndex = Math.max(
    0,
    BOOKING_FLOW_STEPS.findIndex((step) => step.key === current),
  );

  return (
    <div className={cx('hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1', className)}>
      {BOOKING_FLOW_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const stateClassName = isCurrent
          ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
          : isDone
          ? 'border-transparent bg-[var(--success-bg)] text-[var(--success)]'
          : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-soft)]';

        return (
          <div key={step.key} className="flex shrink-0 items-center gap-2">
            <div
              className={cx(
                'flex items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200',
                stateClassName,
              )}
            >
              <span
                className={cx(
                  'grid h-7 w-7 place-items-center rounded-full text-xs font-black',
                  isCurrent
                    ? 'bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white'
                    : isDone
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--surface-strong)] text-[var(--ink-soft)]',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div>
                <p className="text-xs font-black">{step.label}</p>
              </div>
            </div>
            {index < BOOKING_FLOW_STEPS.length - 1 ? (
              <span
                className={cx(
                  'h-1 w-8 rounded-full',
                  index < activeIndex
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--line)]',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
