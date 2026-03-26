import {
  Armchair,
  Briefcase,
  Clock3,
  Map,
  ShieldCheck,
  Tag,
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

  return (
    <AppSurface className="flex h-full flex-col overflow-hidden px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-[var(--ink-soft)]">
            رحلة بين المحافظات
          </p>
          <h3 className="mt-1 text-lg font-black text-[var(--ink)]">{data.company}</h3>
          <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">{data.class}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
          {!bookability.canBook ? (
            <StatusBadge
              label={bookability.reason}
              tone="danger"
              className="max-w-[180px] text-center"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <RouteTimeline trip={data} showMeta={false} compact />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MetaChip
          icon={<Armchair className="h-3.5 w-3.5" />}
          label={isSoldOut ? 'ممتلئة حالياً' : availableSeats <= 5 ? `فاضل ${availableSeats} كراسي` : `${availableSeats} كرسي متاح`}
          tone={seatsTone}
        />
        <MetaChip
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="الحجز متاح لحد قبل التحرك بساعتين"
          tone="neutral"
        />
        <MetaChip
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="شنطة 20 كجم مشمولة"
          tone="neutral"
        />
        <MetaChip
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label={cancellationPolicy.allowed ? `استرداد متوقع ${formatCurrency(cancellationPolicy.refundAmount)}` : cancellationPolicy.message}
          tone={cancellationPolicy.allowed ? 'brand' : 'warning'}
        />
        <MetaChip
          icon={<Map className="h-3.5 w-3.5" />}
          label={data.hasRestStop ? 'فيه استراحة في النص' : 'خط مباشر من غير استراحة'}
          tone={data.hasRestStop ? 'warning' : 'success'}
        />
        <MetaChip
          icon={<Tag className="h-3.5 w-3.5" />}
          label="الصعود من المحطة والـ QR ظاهرين في التذكرة"
          tone="neutral"
        />
      </div>

      <div className="mt-5 app-dashed-divider pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black text-[var(--ink-soft)]">السعر للراكب</p>
            <p className="mt-1 text-2xl font-black text-[var(--ink)]">
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
