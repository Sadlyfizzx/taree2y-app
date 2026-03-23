import { Check, Clock, ShieldCheck } from 'lucide-react';
import { GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';
import { getTripBookability } from '../utils/travel';

function SeatSelectionView({ trip, passengers, selectedSeats, setSelectedSeats, onConfirm, showToast }) {
  if (!trip || !trip.seats) return null;
  const bookability = getTripBookability(trip);

  const toggleSeat = (seat) => {
    if (!bookability.canBook) return showToast(bookability.reason, 'error');
    const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
    const unavailable = seat.status === 'booked' || heldByOther;
    if (unavailable) {
      return showToast(
        heldByOther ? 'الكرسي ده متثبت مؤقتاً لراكب تاني' : 'الكرسي ده محجوز يا ريس 😔',
        'error',
      );
    }

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seat.number));
      return;
    }
    if (selectedSeats.length >= passengers) {
      return showToast(`أنت طالب تحجز ${passengers} مقاعد بس ✌️`, 'error');
    }
    setSelectedSeats((prev) => [...prev, seat.number]);
  };

  const isReady = selectedSeats.length === passengers;
  const rows = Array.from({ length: Math.ceil(trip.seats.length / 4) }, (_, rowIndex) =>
    trip.seats.slice(rowIndex * 4, rowIndex * 4 + 4),
  );

  return (
    <div className="space-y-5 pb-4">
      <GlassCard className="p-5 md:p-6">
        <ScreenHeader
          eyebrow="اختيار المقاعد"
          title="اختار كرسيك براحتك"
          description={`مطلوب ${passengers} مقاعد • ${trip.from} → ${trip.to} • ${trip.date}`}
          actions={
            <SoftBadge
              tone={isReady ? 'emerald' : 'indigo'}
              text={`${selectedSeats.length} / ${passengers} مختار`}
            />
          }
        />

        {!bookability.canBook ? (
          <div className="mt-4">
            <SoftBadge
              tone="rose"
              icon={<Clock className="h-3.5 w-3.5" />}
              text={bookability.reason}
            />
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[11px] font-black text-slate-400">الشركة</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{trip.company}</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[11px] font-black text-slate-400">الدرجة</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">{trip.class}</div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[11px] font-black text-slate-400">التحرك</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-white" dir="ltr">
              {trip.departureTime}
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[11px] font-black text-slate-400">الوصول</div>
            <div className="mt-2 text-sm font-black text-slate-900 dark:text-white" dir="ltr">
              {trip.arrivalTime}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SoftBadge
            tone="indigo"
            text="مختار"
            icon={<div className="h-3.5 w-3.5 rounded bg-indigo-500" />}
          />
          <SoftBadge
            tone="emerald"
            text="متاح"
            icon={<div className="h-3.5 w-3.5 rounded border border-emerald-500 bg-white dark:bg-slate-900" />}
          />
          <SoftBadge
            tone="amber"
            text="متثبت مؤقتًا"
            icon={<div className="h-3.5 w-3.5 rounded bg-amber-400" />}
          />
          <SoftBadge
            tone="rose"
            text="محجوز"
            icon={<div className="h-3.5 w-3.5 rounded bg-slate-300 dark:bg-slate-700" />}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.4fr_0.6fr] lg:items-start">
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-sm font-black text-slate-900 dark:text-white">المقاعد اللي اخترتها</div>
            <div className="mt-4 flex min-h-[92px] flex-wrap gap-2">
              {selectedSeats.length > 0 ? (
                selectedSeats.map((seat) => (
                  <div
                    key={seat}
                    className="flex h-11 items-center justify-center rounded-2xl bg-indigo-500 px-4 text-sm font-black text-white shadow-[0_14px_32px_-20px_rgba(79,70,229,0.8)]"
                  >
                    {seat}
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-6 text-sm font-black text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  اختار المقاعد من الخريطة.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                اختيار المقاعد آمن
              </div>
              <div className="mt-2 text-xs font-bold leading-6 text-emerald-700/80 dark:text-emerald-300/80">
                بعد ما تكمل الاختيار، المقاعد هتتثبت مؤقتاً قبل خطوة الدفع.
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-slate-200 bg-slate-50 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-950">
            <div className="mx-auto mb-6 flex h-8 w-28 items-center justify-center rounded-full bg-slate-300/70 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              مقدمة الباص
            </div>

            <div className="mx-auto max-w-[380px]" dir="ltr">
              <div className="space-y-3">
                {rows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-[1fr_1fr_28px_1fr_1fr] gap-3"
                  >
                    {row.map((seat, seatIndex) => {
                      const isSelected = selectedSeats.includes(seat.number);
                      const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
                      const isBooked = seat.status === 'booked';
                      const disabled = isBooked || heldByOther;

                      const classes = isSelected
                        ? 'bg-indigo-500 text-white shadow-[0_16px_34px_-18px_rgba(79,70,229,0.85)] scale-[1.03]'
                        : heldByOther
                        ? 'bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 cursor-not-allowed'
                        : isBooked
                        ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300';

                      const button = (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeat(seat)}
                          disabled={disabled}
                          className={`flex h-14 w-full items-center justify-center rounded-[20px] text-sm font-black transition ${classes}`}
                        >
                          {isSelected ? <Check className="h-5 w-5" /> : seat.number}
                        </button>
                      );

                      if (seatIndex === 2) {
                        return (
                          <div key={`gap-${seat.id}`} className="contents">
                            <div />
                            {button}
                          </div>
                        );
                      }

                      return button;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none sticky bottom-0 mt-6 bg-gradient-to-t from-white via-white to-transparent py-4 dark:from-slate-950 dark:via-slate-950">
          <button
            onClick={() => {
              if (!bookability.canBook) return showToast(bookability.reason, 'error');
              onConfirm();
            }}
            disabled={!isReady || !bookability.canBook}
            className={`pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-[24px] px-5 text-base font-black transition ${
              isReady && bookability.canBook
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_22px_50px_-26px_rgba(79,70,229,0.82)] active:scale-[0.99]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }`}
          >
            <span>تأكيد المقاعد</span>
            <span className={`rounded-full px-3 py-1 text-sm ${isReady ? 'bg-white/15' : 'bg-slate-300/50 dark:bg-slate-700'}`}>
              {selectedSeats.length} / {passengers}
            </span>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default SeatSelectionView;
