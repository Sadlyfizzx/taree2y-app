import {
  Armchair,
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

function getBookingBadgeLabel(bookability, isSoldOut) {
  if (isSoldOut) return 'لا توجد مقاعد';
  if (bookability?.canBook) return '';

  const reason = String(bookability?.reason || '');
  if (reason.includes('ساعتين')) return 'الحجز مقفول';
  if (reason.includes('مقاعد')) return 'غير متاحة';
  return 'غير متاح حالياً';
}

function getRefundChipLabel(cancellationPolicy) {
  if (cancellationPolicy?.allowed) {
    return `استرداد حتى ${formatCurrency(cancellationPolicy.refundAmount)}`;
  }
  return 'الإلغاء غير متاح الآن';
}

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
  const bookingBadgeLabel = getBookingBadgeLabel(bookability, isSoldOut);

  return (
    <AppSurface className="flex h-full flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.14em] text-[var(--ink-soft)] sm:text-xs">
            رحلة بين المحافظات
          </p>
          <h3 className="mt-1 truncate text-base font-black text-[var(--ink)] sm:text-lg">{data.company}</h3>
          <p className="mt-1 truncate text-sm font-bold text-[var(--ink-muted)]">{data.class}</p>
        </div>
        <div className="flex max-w-[46%] flex-wrap items-center justify-end gap-2">
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
          {bookingBadgeLabel ? (
            <StatusBadge
              label={bookingBadgeLabel}
              tone={isSoldOut ? 'danger' : 'warning'}
              className="text-center"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3.5">
        <RouteTimeline trip={data} showMeta={false} compact />
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <MetaChip
          className="min-h-0 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs"
          icon={<Armchair className="h-3.5 w-3.5" />}
          label={
            isSoldOut
              ? 'ممتلئة حالياً'
              : availableSeats <= 5
              ? `فاضل ${availableSeats} كراسي`
              : `${availableSeats} كرسي متاح`
          }
          tone={seatsTone}
        />
        <MetaChip
          className="min-h-0 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:justify-start sm:text-xs"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label={getRefundChipLabel(cancellationPolicy)}
          tone={cancellationPolicy.allowed ? 'brand' : 'warning'}
        />
        <MetaChip
          className="col-span-2 min-h-0 justify-center rounded-[18px] px-3 py-2 text-[11px] sm:col-span-1 sm:justify-start sm:text-xs"
          icon={<Map className="h-3.5 w-3.5" />}
          label={data.hasRestStop ? 'فيه استراحة في النص' : 'خط مباشر'}
          tone={data.hasRestStop ? 'warning' : 'success'}
        />
      </div>

      <div className="mt-4 app-dashed-divider pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--ink-soft)]">السعر للراكب</p>
            <p className="mt-1 text-xl font-black text-[var(--ink)] sm:text-2xl">
              {formatCurrency(data.price)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[190px]">
            <PrimaryButton
              onClick={() => onSelect(data)}
              disabled={!bookability.canBook || isSoldOut}
              className={
                isSoldOut
                  ? 'disabled:!border-slate-300 disabled:!bg-slate-200 disabled:!text-slate-700 disabled:shadow-none'
                  : !bookability.canBook
                  ? 'disabled:!border-amber-200 disabled:!bg-amber-50 disabled:!text-amber-800 disabled:shadow-none dark:disabled:!border-amber-900/40 dark:disabled:!bg-amber-950/20 dark:disabled:!text-amber-200'
                  : ''
              }
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
