import { ArrowRightLeft, BusFront, Calendar, Clock3, MapPin } from 'lucide-react';
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

  return (
    <Wrapper className={cx(surface ? 'px-4 py-4' : '', className)}>
      <div className={cx('grid items-center gap-3', compact ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-[1fr_auto_1fr]')}>
        <div>
          <p className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
            {data.departureTime}
          </p>
          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{data.from}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
            <MapPin className="ml-1 inline h-3.5 w-3.5 text-indigo-500" />
            {data.fromStationName}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 px-1">
          <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
            <span className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900" />
            <span className="h-0.5 w-8 rounded-full bg-current sm:w-12" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
              <BusFront className="h-4.5 w-4.5" />
            </span>
            <span className="h-0.5 w-8 rounded-full bg-current sm:w-12" />
            <span className="h-3 w-3 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-900" />
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDuration(data.durationHour)}
          </div>
        </div>

        <div className="text-left">
          <p className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
            {data.arrivalTime}
          </p>
          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{data.to}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
            {data.toStationName}
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
          </p>
        </div>
      </div>

      {showMeta ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaChip icon={<Calendar className="h-3.5 w-3.5" />} label={formatDateText(data.date)} tone="neutral" />
          <MetaChip icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label={`${data.company} • ${data.class}`} tone="brand" />
          {data.hasRestStop ? (
            <MetaChip label="فيه استراحة في الطريق" tone="warning" />
          ) : (
            <MetaChip label="رحلة مباشرة" tone="success" />
          )}
        </div>
      ) : null}
    </Wrapper>
  );
}
