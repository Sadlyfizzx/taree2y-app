import {
  Armchair,
  Briefcase,
  Clock3,
  Map,
  ShieldCheck,
} from 'lucide-react';
import { getCancellationPolicy, getTripBookability } from '../../utils/travel';
import { withStationNames } from '../../utils/stations';
import { formatCurrency } from '../../utils/formatting';
import {
  AppSurface,
  MetaChip,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from './AppPrimitives';
import RouteTimeline from './RouteTimeline';

const badgeContent = {
  cheapest: { label: 'الأوفر', tone: 'success' },
  fastest: { label: 'الأسرع', tone: 'brand' },
  vip: { label: 'درجة مميزة', tone: 'warning' },
};

const getAvailableSeatsCount = (trip) => {
  if (Number.isFinite(Number(trip.availableSeatsCount))) {
    return Number(trip.availableSeatsCount);
  }

  return trip.seats?.filter((seat) => seat.status === 'available').length || 0;
};

export default function TripCard({
  trip,
  onSelect,
  showSecondary = false,
  secondaryLabel = 'تفاصيل أكثر',
}) {
  const data = withStationNames(trip);
  const availableSeats = getAvailableSeatsCount(data);
  const bookability = getTripBookability({
    ...data,
    status: data.status || 'upcoming',
  });
  const cancellationPolicy = getCancellationPolicy({
    ...data,
    status: 'upcoming',
    finalTotal: data.price,
  });
  const badge = data.badge ? badgeContent[data.badge] : null;
  const isSoldOut = availableSeats === 0;
  const seatsTone = isSoldOut ? 'danger' : availableSeats <= 5 ? 'warning' : 'success';
  const cancellationLabel = cancellationPolicy.allowed
    ? `استرداد متوقع ${formatCurrency(cancellationPolicy.refundAmount)}`
    : cancellationPolicy.message;
  const routeLabel = data.hasRestStop ? 'فيه استراحة' : 'خط مباشر';

  return (
    <AppSurface className="flex h-full flex-col overflow-hidden rounded-[28px] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.14em] text-[var(--ink-soft)] sm:text-xs">
            رحلة بين المحافظات
          </p>
          <h3 className="mt-1 text-base font-black text-[var(--ink)] sm:text-lg">{data.company}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">{data.class}</p>
        </div>
        <div className="flex max-w-[45%] flex-wrap items-center justify-end gap-2">
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
          {!bookability.canBook ? (
            <StatusBadge
              label={bookability.reason}
              tone="danger"
              className="max-w-[150px] text-center text-[11px] sm:max-w-[180px]"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3 sm:mt-4">
        <RouteTimeline trip={data} showMeta={false} compact />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
        <MetaChip
          icon={<Armchair className="h-3.5 w-3.5" />}
          label={isSoldOut ? 'ممتلئة حالياً' : availableSeats <= 5 ? `فاضل ${availableSeats} كراسي` : `${availableSeats} كرسي متاح`}
          tone={seatsTone}
        />
        <MetaChip
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="شنطة 20 كجم"
          tone="neutral"
        />
        <MetaChip
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label={cancellationLabel}
          tone={cancellationPolicy.allowed ? 'brand' : 'warning'}
        />
        <MetaChip
          icon={<Map className="h-3.5 w-3.5" />}
          label={routeLabel}
          tone={data.hasRestStop ? 'warning' : 'success'}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold text-[var(--ink-muted)] sm:text-[13px]">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          الحجز متاح لحد قبل التحرك بساعتين
        </span>
        <span>الصعود من المحطة والـ QR ظاهرين في التذكرة</span>
      </div>

      <div className="mt-4 app-dashed-divider pt-3.5 sm:mt-5 sm:pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs font-black text-[var(--ink-soft)]">السعر للراكب</p>
            <p className="mt-1 text-xl font-black text-[var(--ink)] sm:text-2xl">
              {formatCurrency(data.price)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[210px]">
            <PrimaryButton
              onClick={() => onSelect(data)}
              disabled={!bookability.canBook || isSoldOut}
              className={isSoldOut ? 'disabled:!border-slate-300 disabled:!bg-slate-200 disabled:!text-slate-700 disabled:shadow-none' : !bookability.canBook ? 'disabled:!border-amber-200 disabled:!bg-amber-50 disabled:!text-amber-800 disabled:shadow-none dark:disabled:!border-amber-900/40 dark:disabled:!bg-amber-950/20 dark:disabled:!text-amber-200' : ''}
            >
              {isSoldOut
                ? 'غير متاحة الآن'
                : !bookability.canBook
                ? 'الحجز مقفول'
                : 'اختار الرحلة'}
            </PrimaryButton>
            {showSecondary ? <SecondaryButton>{secondaryLabel}</SecondaryButton> : null}
          </div>
        </div>
      </div>
    </AppSurface>
  );
}
