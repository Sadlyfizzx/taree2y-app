import { Armchair, Briefcase, Clock3, Map, ShieldCheck, Tag } from 'lucide-react';
import { getTripBookability } from '../../utils/travel';
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
  if (Number.isFinite(Number(trip.availableSeatsCount))) return Number(trip.availableSeatsCount);
  return trip.seats?.filter((seat) => seat.status === 'available').length || 0;
};

export default function TripCard({ trip, onSelect, showSecondary = false, secondaryLabel = 'تفاصيل أكثر' }) {
  const data = withStationNames(trip);
  const availableSeats = getAvailableSeatsCount(data);
  const bookability = getTripBookability({ ...data, status: data.status || 'upcoming' });
  const badge = data.badge ? badgeContent[data.badge] : null;
  const seatsTone = availableSeats === 0 ? 'warning' : availableSeats <= 5 ? 'warning' : 'success';

  return (
    <AppSurface className="px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">رحلة بين المحافظات</p>
          <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{data.company}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{data.class}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
          {!bookability.canBook ? (
            <StatusBadge label={bookability.reason} tone="danger" className="max-w-[180px] text-center" />
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <RouteTimeline trip={data} showMeta={false} compact />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MetaChip
          icon={<Armchair className="h-3.5 w-3.5" />}
          label={availableSeats === 0 ? 'امتلأت - ممكن تسجل انتظار' : `فاضل ${availableSeats} كرسي`}
          tone={seatsTone}
        />
        <MetaChip
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="الحجز يقفل قبل التحرك بساعتين"
          tone="neutral"
        />
        <MetaChip
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="شنطة 20 كجم مشمولة"
          tone="neutral"
        />
        <MetaChip
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="الاسترداد للمحفظة حسب التوقيت"
          tone="brand"
        />
        <MetaChip
          icon={<Map className="h-3.5 w-3.5" />}
          label={data.hasRestStop ? 'فيه استراحة في النص' : 'خط مباشر من غير استراحة'}
          tone={data.hasRestStop ? 'warning' : 'success'}
        />
        <MetaChip
          icon={<Tag className="h-3.5 w-3.5" />}
          label="الصعود بالتذكرة والـ QR"
          tone="neutral"
        />
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500">السعر للراكب</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(data.price)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:w-auto sm:min-w-[190px]">
          <PrimaryButton
            onClick={() => onSelect(data)}
            disabled={!bookability.canBook}
            className={availableSeats === 0 ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25' : ''}
          >
            {availableSeats === 0 ? 'سجل انتظار' : 'اختار الرحلة'}
          </PrimaryButton>
          {showSecondary ? <SecondaryButton>{secondaryLabel}</SecondaryButton> : null}
        </div>
      </div>
    </AppSurface>
  );
}
