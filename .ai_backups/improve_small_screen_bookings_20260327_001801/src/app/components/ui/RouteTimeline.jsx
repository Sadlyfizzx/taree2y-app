import { BusFront, Calendar, Clock3, MapPin } from 'lucide-react';
import { withStationNames } from '../../utils/stations';
import { formatDateText, formatDuration } from '../../utils/formatting';
import { AppSurface, MetaChip, cx } from './AppPrimitives';

export default function RouteTimeline({
  trip,
  className = '',
  showMeta = true,
  compact = false,
  surface = true,
}) {
  if (!trip) return null;

  const data = withStationNames(trip);
  const Wrapper = surface ? AppSurface : 'div';
  const routeMetaLabel = [data.company, data.class].filter(Boolean).join(' • ');

  return (
    <Wrapper className={cx(surface ? 'rounded-[24px] border border-[var(--line)]/80 bg-[var(--surface-soft)]/70 px-3 py-3.5 sm:px-4 sm:py-4 md:px-5' : '', className)}>
      <div
        dir="rtl"
        className={cx(
          'grid min-w-0 items-center gap-2.5 sm:gap-3 md:gap-4',
          compact
            ? 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
        )}
      >
        <div className="min-w-0 text-right">
          <p className="text-[18px] font-black text-[var(--ink)] sm:text-[20px] md:text-[28px]" dir="ltr">
            {data.departureTime}
          </p>
          <p className="mt-1 truncate text-[13px] font-black text-[var(--ink)] sm:text-sm md:text-lg">{data.from}</p>
          <p className="mt-1 inline-flex min-w-0 items-start gap-1 text-[10px] font-bold leading-5 text-[var(--ink-muted)] sm:text-[11px] md:text-sm">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
            <span className="line-clamp-2 min-w-0 break-words">{data.fromStationName}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 px-0.5 sm:gap-2 sm:px-1">
          <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
            <span className="h-3 w-3 rounded-full border-2 border-[var(--brand)] bg-[var(--surface-strong)]" />
            <span className="h-0.5 w-4 rounded-full bg-current sm:w-8 md:w-10" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)] sm:h-9 sm:w-9 md:h-10 md:w-10">
              <BusFront className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </span>
            <span className="h-0.5 w-4 rounded-full bg-current sm:w-10" />
            <span className="h-3 w-3 rounded-full border-2 border-[var(--accent)] bg-[var(--surface-strong)]" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-black text-[var(--ink-muted)] sm:gap-2 sm:px-2.5 sm:text-[11px] md:px-3 md:text-xs">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDuration(data.durationHour)}
          </div>
        </div>

        <div className="min-w-0 text-left">
          <p className="text-[20px] font-black text-[var(--ink)] md:text-[28px]" dir="ltr">
            {data.arrivalTime}
          </p>
          <p className="mt-1 truncate text-[13px] font-black text-[var(--ink)] sm:text-sm md:text-lg">{data.to}</p>
          <p className="mt-1 inline-flex min-w-0 items-start gap-1 text-[11px] font-bold leading-5 text-[var(--ink-muted)] md:text-sm">
            <span className="line-clamp-2 min-w-0 break-words">{data.toStationName}</span>
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          </p>
        </div>
      </div>

      {showMeta ? (
        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:flex-wrap">
          <MetaChip className="justify-center sm:justify-start" icon={<Calendar className="h-3.5 w-3.5" />} label={formatDateText(data.date)} tone="neutral" />
          {data.hasRestStop ? (
            <MetaChip className="justify-center sm:justify-start" label="فيه استراحة في الطريق" tone="warning" />
          ) : (
            <MetaChip className="justify-center sm:justify-start" label="رحلة مباشرة" tone="success" />
          )}
          <MetaChip className="col-span-2 justify-center sm:col-span-1 sm:justify-start" label={routeMetaLabel || 'بيانات الرحلة'} tone="brand" />
        </div>
      ) : null}
    </Wrapper>
  );
}
