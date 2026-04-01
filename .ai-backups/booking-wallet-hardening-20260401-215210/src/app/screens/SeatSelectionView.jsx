import React, { useMemo, useState } from 'react';
import { Armchair, Check, Clock } from 'lucide-react';
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
import { formatInteger } from '../utils/formatting';

const LEGEND_ITEMS = [
  { label: 'مختار', tone: 'brand' },
  { label: 'فاضي', tone: 'neutral' },
  { label: 'متثبت لراكب تاني', tone: 'warning' },
  { label: 'محجوز', tone: 'danger' },
];

function SeatSelectionView({
  trip,
  passengers,
  selectedSeats,
  setSelectedSeats,
  onConfirm,
  showToast,
}) {
  const data = useMemo(() => withStationNames(trip) || {}, [trip]);
  const seatItems = useMemo(() => (Array.isArray(data.seats) ? data.seats : []), [data]);
  const bookability = useMemo(() => getTripBookability(data), [data]);
  const rows = useMemo(
    () =>
      Array.from({ length: Math.ceil(seatItems.length / 4) }, (_, rowIndex) =>
        seatItems.slice(rowIndex * 4, rowIndex * 4 + 4),
      ),
    [seatItems],
  );

  const remainingSeats = Math.max(0, passengers - selectedSeats.length);
  const isReady = selectedSeats.length === passengers;
  const [isConfirming, setIsConfirming] = useState(false);

  if (!trip || !seatItems.length) return null;

  const handleConfirm = async () => {
    if (isConfirming || !isReady || !bookability.canBook) return;

    setIsConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setIsConfirming(false);
    }
  };

  const toggleSeat = (seat) => {
    if (!bookability.canBook) {
      showToast(bookability.reason, 'error');
      return;
    }

    const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
    const unavailable = seat.status === 'booked' || heldByOther;

    if (unavailable) {
      showToast(
        heldByOther
          ? 'الكرسي ده متثبت مؤقتًا لراكب تاني.'
          : 'الكرسي ده محجوز بالفعل.',
        'error',
      );
      return;
    }

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats((currentValue) =>
        currentValue.filter((item) => item !== seat.number),
      );
      return;
    }

    if (selectedSeats.length >= passengers) {
      showToast(`مطلوب ${formatInteger(passengers)} مقاعد فقط في الحجز ده.`, 'error');
      return;
    }

    setSelectedSeats((currentValue) => [...currentValue, seat.number]);
  };

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
      <PageHeading
        eyebrow="الخطوة ٢ من ٤"
        title="اختار المقاعد"
        subtitle="اختيار الكراسي هنا واضح: اسم الرحلة قدامك، وعدد المقاعد المطلوب ظاهر، وكل حالة لها شكل مختلف."
      />

      <AppSurface className="p-4 sm:p-5">
        <BookingProgress current="seats" />
        <div className="mt-4">
          <RouteTimeline trip={data} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaChip
            label={`مطلوب ${formatInteger(passengers)} ${passengers === 1 ? 'مقعد' : 'مقاعد'}`}
            tone="brand"
          />
          <MetaChip
            label={`المختار ${formatInteger(selectedSeats.length)}`}
            tone={isReady ? 'success' : 'neutral'}
          />
          <MetaChip label={data.class} tone="neutral" />
        </div>
      </AppSurface>

      {!bookability.canBook ? (
        <InlineNotice
          tone="danger"
          title="الحجز مش متاح على الرحلة دي"
          text={bookability.reason}
          icon={Clock}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AppSurface className="p-5">
          <SectionHeaderLite title="خريطة المقاعد" subtitle="اضغط على الكرسي لاختياره أو إلغاء اختياره." />
          <div className="mt-4 flex flex-wrap gap-2">
            {LEGEND_ITEMS.map((item) => (
              <MetaChip key={item.label} label={item.label} tone={item.tone} />
            ))}
          </div>

          <div className="mt-5 rounded-[32px] border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <div className="mx-auto mb-8 flex h-8 w-32 items-center justify-center rounded-full bg-[var(--surface-strong)] text-xs font-black text-[var(--ink-muted)]">
              مقدمة الباص
            </div>

            <div className="mx-auto max-w-[340px] space-y-3" dir="ltr">
              {rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-[1fr_1fr_26px_1fr_1fr] items-center gap-3"
                >
                  {row.map((seat, seatIndex) => {
                    const isSelected = selectedSeats.includes(seat.number);
                    const heldByOther =
                      seat.status === 'held' && !seat.heldByCurrentUser;
                    const isBooked = seat.status === 'booked';
                    const disabled = isBooked || heldByOther;
                    const toneClassName = isSelected
                      ? 'border-transparent bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_30px_-18px_rgba(33,86,217,0.52)]'
                      : heldByOther
                      ? 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200'
                      : isBooked
                      ? 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'
                      : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)]';

                    const seatButton = (
                      <button
                        key={seat.number}
                        type="button"
                        onClick={() => toggleSeat(seat)}
                        disabled={disabled}
                        aria-pressed={isSelected}
                        aria-label={`المقعد ${seat.number}${isSelected ? ' مختار' : disabled ? ' غير متاح' : ' متاح'}`}
                        className={`interactive-press flex h-16 flex-col items-center justify-center rounded-[22px] border text-center transition ${toneClassName} ${disabled ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <Armchair className="h-4.5 w-4.5" />
                        <span className="mt-1 text-xs font-black">{seat.number}</span>
                      </button>
                    );

                    if (seatIndex === 1) {
                      return (
                        <React.Fragment key={seat.number}>
                          {seatButton}
                          <span className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                            ممر
                          </span>
                        </React.Fragment>
                      );
                    }

                    return seatButton;
                  })}
                </div>
              ))}
            </div>
          </div>
        </AppSurface>

        <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
          <AppSurface className="p-5">
            <SectionHeaderLite title="المقاعد المختارة" subtitle="راجع الاختيار قبل ما تثبت المقاعد." />
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedSeats.length ? (
                selectedSeats.map((seat) => (
                  <MetaChip key={seat} label={seat} tone="brand" />
                ))
              ) : (
                <p className="text-sm font-bold text-[var(--ink-muted)]">
                  لسه ما اخترتش أي مقعد.
                </p>
              )}
            </div>
          </AppSurface>

          <InlineNotice
            tone={isReady ? 'success' : 'info'}
            title={
              isReady
                ? 'تمام، المقاعد جاهزة للمراجعة'
                : `فاضل ${remainingSeats} ${remainingSeats === 1 ? 'مقعد' : 'مقاعد'}`
            }
            text={
              isReady
                ? 'لو كل حاجة مناسبة، كمّل لخطوة الدفع.'
                : 'اختار العدد المطلوب فقط عشان تقدر تثبّت المقاعد وتكمل.'
            }
            icon={isReady ? Check : Clock}
          />

          <AppSurface className="p-5">
            <SectionHeaderLite title="قبل ما تكمل" subtitle="معلومتين مهمين وقت الاختيار." />
            <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-[var(--ink-muted)]">
              <p>• المقاعد بتتثبت مؤقتًا بعد ما تضغط متابعة من الخطوة دي.</p>
              <p>• لو غيرت رأيك، تقدر تشيل أي كرسي قبل ما تروح للدفع.</p>
            </div>
          </AppSurface>
        </div>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--ink)]">
              {isReady
                ? 'المقاعد جاهزة للمراجعة والدفع'
                : `اختار ${formatInteger(remainingSeats)} ${remainingSeats === 1 ? 'مقعد كمان' : 'مقاعد كمان'}`}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">
              لو غيرت رأيك، تقدر تشيل أي كرسي قبل ما تكمل.
            </p>
          </div>
          <PrimaryButton
            onClick={handleConfirm}
            disabled={!isReady || !bookability.canBook}
            loading={isConfirming}
            loadingText="جاري تثبيت المقاعد…"
            className="w-full sm:w-auto sm:min-w-[220px]"
          >
            كمّل للدفع
          </PrimaryButton>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

function SectionHeaderLite({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-lg font-black text-[var(--ink)]">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default SeatSelectionView;

