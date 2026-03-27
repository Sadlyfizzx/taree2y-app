import React, { useEffect, useRef, useState } from 'react';
import {
  Armchair,
  Briefcase,
  Loader2,
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
  const [isSelecting, setIsSelecting] = useState(false);
  const selectTimerRef = useRef(null);

  useEffect(() => () => {
    if (selectTimerRef.current) {
      window.clearTimeout(selectTimerRef.current);
    }
  }, []);

  const handleSelect = () => {
    if (isSelecting || !bookability.canBook || isSoldOut) return;
    setIsSelecting(true);

    selectTimerRef.current = window.setTimeout(() => {
      onSelect(data);
    }, 90);
  };

  return (
    <AppSurface className="flex h-full flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black tracking-[0.14em] text-[var(--ink-soft)] sm:text-xs sm:tracking-[0.16em]">
            رحلة بين المحافظات
          </p>
          <h3 className="mt-1 text-base font-black text-[var(--ink)] sm:text-lg">{data.company}</h3>
          <p className="mt-1 text-xs font-bold text-[var(--ink-muted)] sm:text-sm">{data.class}</p>
        </div>
        <div className="flex max-w-[42%] flex-wrap items-center justify-end gap-2 sm:max-w-none">
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
          {!bookability.canBook ? (
            <StatusBadge
              label={bookability.reason}
              tone="danger"
              className="max-w-[160px] text-center text-[11px] sm:max-w-[180px]"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3.5 sm:mt-4">
        <RouteTimeline trip={data} showMeta={false} compact />
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-2">
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
          label={cancellationPolicy.allowed ? `استرداد ${formatCurrency(cancellationPolicy.refundAmount)}` : 'الإلغاء غير متاح'}
          tone={cancellationPolicy.allowed ? 'brand' : 'warning'}
        />
        <div className="hidden sm:contents">
          <MetaChip
            icon={<Map className="h-3.5 w-3.5" />}
            label={data.hasRestStop ? 'فيه استراحة في النص' : 'خط مباشر'}
            tone={data.hasRestStop ? 'warning' : 'success'}
          />
          <MetaChip
            icon={<Tag className="h-3.5 w-3.5" />}
            label="الـ QR ظاهر في التذكرة"
            tone="neutral"
          />
        </div>
      </div>

      <div className="mt-4 app-dashed-divider pt-3.5 sm:mt-5 sm:pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-[11px] font-black text-[var(--ink-soft)] sm:text-xs">السعر للراكب</p>
            <p className="mt-1 text-xl font-black text-[var(--ink)] sm:text-2xl">
              {formatCurrency(data.price)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[210px]">
            <PrimaryButton
              onClick={handleSelect}
              disabled={!bookability.canBook || isSoldOut || isSelecting}
              className={isSoldOut ? 'disabled:!border-slate-300 disabled:!bg-slate-200 disabled:!text-slate-700 disabled:shadow-none' : !bookability.canBook ? 'disabled:!border-amber-200 disabled:!bg-amber-50 disabled:!text-amber-800 disabled:shadow-none dark:disabled:!border-amber-900/40 dark:disabled:!bg-amber-950/20 dark:disabled:!text-amber-200' : ''}
              icon={isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            >
              {isSoldOut
                ? 'غير متاحة الآن'
                : !bookability.canBook
                ? 'الحجز مقفول'
                : isSelecting
                ? 'جاري التحميل...'
                : 'اختار الرحلة'}
            </PrimaryButton>
            {showSecondary ? <SecondaryButton>{secondaryLabel}</SecondaryButton> : null}
          </div>
        </div>
      </div>
    </AppSurface>
  );
}
