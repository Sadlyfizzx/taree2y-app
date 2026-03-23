import React from 'react';
import { Check, Clock } from 'lucide-react';
import { getTripBookability } from '../utils/travel';

function SeatSelectionView({ trip, passengers, selectedSeats, setSelectedSeats, onConfirm, showToast }) {
  if (!trip || !trip.seats) return null;
  const bookability = getTripBookability(trip);

  const toggleSeat = (seat) => {
    if (!bookability.canBook) return showToast(bookability.reason, 'error');
    const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
    const unavailable = seat.status === 'booked' || heldByOther;
    if (unavailable) return showToast(heldByOther ? 'الكرسي ده متثبت مؤقتاً لراكب تاني' : 'الكرسي ده محجوز يا ريس 😔', 'error');

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seat.number));
      return;
    }
    if (selectedSeats.length >= passengers) return showToast(`أنت طالب تحجز ${passengers} مقاعد بس ✌️`, 'error');
    setSelectedSeats((prev) => [...prev, seat.number]);
  };

  const isReady = selectedSeats.length === passengers;
  const rows = Array.from({ length: Math.ceil(trip.seats.length / 4) }, (_, rowIndex) => trip.seats.slice(rowIndex * 4, rowIndex * 4 + 4));

  return (
    <div className="flex flex-col flex-1 pt-4 w-full h-full">
      <div className="text-center mb-6 px-5 shrink-0">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">اختار كرسيك 💺</h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">مطلوب اختيار <span className="text-indigo-600 dark:text-indigo-400">{passengers}</span> مقاعد</p>
        {!bookability.canBook && <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-2 text-xs font-black border border-rose-200 dark:border-rose-800/50"><Clock className="w-4 h-4" /> {bookability.reason}</div>}
      </div>

      <div className="flex justify-center gap-6 mb-8 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 flex-wrap">
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-indigo-600 shadow-md"></div> مختار</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700"></div> فاضي</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-orange-200 dark:bg-orange-900/40"></div> متثبت مؤقتاً</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700"></div> محجوز</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 hide-scrollbar shrink-0 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-6 max-w-[320px] mx-auto border-4 border-slate-200 dark:border-slate-700 relative shadow-sm mb-6">
          <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-10 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div></div>
          <div className="space-y-3" dir="ltr">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[1fr_1fr_24px_1fr_1fr] gap-3 items-center">
                {row.map((seat, seatIndex) => {
                  const isSelected = selectedSeats.includes(seat.number);
                  const heldByOther = seat.status === 'held' && !seat.heldByCurrentUser;
                  const isBooked = seat.status === 'booked';
                  const disabled = isBooked || heldByOther;
                  const element = (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat)}
                      disabled={disabled}
                      className={`w-12 h-12 flex items-center justify-center rounded-xl text-base font-bold transition-all duration-200
                        ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110 border-none' : heldByOther ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 cursor-not-allowed border-none' : isBooked ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border-none' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 border-2 border-slate-200 dark:border-slate-700 shadow-sm'}`}
                    >{isSelected ? <Check className="w-5 h-5" /> : seat.number}</button>
                  );
                  if (seatIndex === 2) return <React.Fragment key={`gap-${seat.id}`}><div />{element}</React.Fragment>;
                  return element;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto p-5 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pb-8 z-20 pointer-events-none">
        <button onClick={() => { if (!bookability.canBook) return showToast(bookability.reason, 'error'); onConfirm(); }} disabled={!isReady || !bookability.canBook} className={`w-full max-w-[400px] mx-auto font-black text-lg py-4 rounded-2xl transition-all shadow-lg flex justify-between items-center px-6 pointer-events-auto ${isReady && bookability.canBook ? 'bg-indigo-600 text-white shadow-indigo-600/30 active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}>
          <span>تأكيد الحجز</span>
          <span className={`px-3 py-1 rounded-lg text-sm ${isReady ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700'}`}>{selectedSeats.length} / {passengers}</span>
        </button>
      </div>
    </div>
  );
}

export default SeatSelectionView;
