import React from 'react';
import { Check, Clock } from 'lucide-react';
import BookingProgress from '../components/ui/BookingProgress';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  StickyActionBar,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { getTripBookability } from '../utils/travel';
import { withStationNames } from '../utils/stations';

function SeatSelectionView({
  trip,
  passengers,
  selectedSeats,
  setSelectedSeats,
  onConfirm,
  showToast,
}) {
  if (!trip || !trip.seats) return null;

  const data = withStationNames(trip);
  const bookability = getTripBookability(data);
  const rows = Array.from(
    { length: Math.ceil(data.seats.length / 4) },
    (_, rowIndex) => data.seats.slice(rowIndex * 4, rowIndex * 4 + 4),
  );

  const remainingSeats = Math.max(0, passengers - selectedSeats.length);
  const isReady = selectedSeats.length === passengers;

  const toggleSeat = (seat) => {
    if (!bookability.canBook) {
      showToast(bookability.reason, 'error');
      return;
    }

    const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
    const unavailable = seat.status === 'booked' || heldByOther;

    if (unavailable) {
      showToast(heldByOther ? 'الكرسي ده متثبت مؤقتًا لراكب تاني.' : 'الكرسي ده محجوز بالفعل.', 'error');
      return;
    }

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats((currentValue) => currentValue.filter((item) => item !== seat.number));
      return;
    }

    if (selectedSeats.length >= passengers) {
      showToast(`مطلوب ${passengers} مقاعد فقط في الحجز ده.`, 'error');
      return;
    }

    setSelectedSeats((currentValue) => [...currentValue, seat.number]);
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الخطوة ٢ من ٤"
        title="اختار المقاعد"
        subtitle="اختيار المقاعد هنا واضح جدًا: الفاضي، المحجوز، والمتثبت مؤقتًا كل واحد ليه شكل مختلف."
      />

      <AppSurface className="p-4 sm:p-5">
        <BookingProgress current="seats" />
        <div className="mt-4">
          <RouteTimeline trip={data} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaChip label={`مطلوب ${passengers} ${passengers === 1 ? 'مقعد' : 'مقاعد'}`} tone="brand" />
          <MetaChip label={`المختار ${selectedSeats.length}`} tone={isReady ? 'success' : 'neutral'} />
          <MetaChip label={data.class} tone="neutral" />
        </div>
      </AppSurface>

      {!bookability.canBook ? (
        <InlineNotice tone="danger" title="الحجز مش متاح على الرحلة دي" text={bookability.reason} icon={Clock} />
      ) : null}

      <AppSurface className="p-5">
        <div className="flex flex-wrap gap-2">
          <MetaChip label="مختار" tone="brand" />
          <MetaChip label="فاضي" tone="neutral" />
          <MetaChip label="متثبت لراكب تاني" tone="warning" />
          <MetaChip label="محجوز" tone="danger" />
        </div>

        <div className="mt-5 rounded-[32px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mx-auto mb-8 flex h-8 w-28 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            مقدمة الباص
          </div>

          <div className="mx-auto max-w-[330px] space-y-3" dir="ltr">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[1fr_1fr_24px_1fr_1fr] items-center gap-3">
                {row.map((seat, seatIndex) => {
                  const isSelected = selectedSeats.includes(seat.number);
                  const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
                  const isBooked = seat.status === 'booked';
                  const disabled = isBooked || heldByOther;
                  const toneClassName = isSelected
                    ? 'border-transparent bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.04]'
                    : heldByOther
                    ? 'border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                    : isBooked
                    ? 'border-slate-200 bg-slate-200 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20';

                  const seatButton = (
                    <button
                      key={seat.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`الكرسي ${seat.number}`}
                      onClick={() => toggleSeat(seat)}
                      disabled={disabled}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black transition-all ${toneClassName}`}
                    >
                      {isSelected ? <Check className="h-5 w-5" /> : seat.number}
                    </button>
                  );

                  if (seatIndex === 2) {
                    return (
                      <React.Fragment key={`gap-${seat.id}`}>
                        <div />
                        {seatButton}
                      </React.Fragment>
                    );
                  }

                  return seatButton;
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">المقاعد المختارة</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSeats.length ? (
              selectedSeats.map((seat) => <MetaChip key={seat} label={seat} tone="brand" />)
            ) : (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">لسه ما اخترتش أي مقعد.</p>
            )}
          </div>
        </div>
      </AppSurface>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {isReady ? 'تمام، المقاعد جاهزة للمراجعة والدفع' : `اختار ${remainingSeats} ${remainingSeats === 1 ? 'مقعد كمان' : 'مقاعد كمان'}`}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              لو غيرت رأيك، تقدر تشيل أي كرسي قبل ما تكمل.
            </p>
          </div>
          <PrimaryButton onClick={onConfirm} disabled={!isReady || !bookability.canBook} className="w-full sm:w-auto sm:min-w-[200px]">
            كمّل للدفع
          </PrimaryButton>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default SeatSelectionView;
