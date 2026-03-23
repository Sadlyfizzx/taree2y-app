import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BusFront,
  CheckCircle2,
  Clock,
  Ticket,
  X,
} from 'lucide-react';
import { getCancellationPolicy, getTripLifecycleStatus } from '../utils/travel';

function TripsView({
  trips,
  _setMyTrips,
  processRefund,
  pendingCancellationBookingIds = [],
  onViewTicket,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);

  const computedTrips = useMemo(() => {
    return trips.map((trip) => {
      if (trip.status !== 'upcoming') return trip;
      const lifecycle = getTripLifecycleStatus(trip);
      if (lifecycle.key === 'arrived') return { ...trip, status: 'past' };
      return trip;
    });
  }, [trips]);

  const confirmCancel = () => {
    if (!cancelingTrip) return;
    processRefund(cancelingTrip);
    setCancelingTrip(null);
  };

  const cancelPolicy = cancelingTrip ? getCancellationPolicy(cancelingTrip) : null;

  const filteredTrips = computedTrips.filter((trip) =>
    activeTab === 'upcoming'
      ? ['upcoming', 'refund_pending'].includes(trip.status)
      : ['cancelled', 'past'].includes(trip.status),
  );

  return (
    <div className="p-5 lg:px-16 space-y-5 flex-1 w-full">
      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
        تذاكري 🎫
      </h2>

      <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl flex max-w-md mx-auto mb-8">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'upcoming'
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          تذاكر جاية
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'past'
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          سابقة وملغية
        </button>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 max-w-2xl mx-auto w-full">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 mb-1">
            مفيش تذاكر هنا
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            احجز أول رحلة ليك وعيش المغامرة يا بطل!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredTrips.map((trip) => {
            const policy = getCancellationPolicy(trip);
            const bookingId = trip.bookingId || trip.id || null;
            const isPendingCancellation =
              trip.status === 'refund_pending' ||
              (bookingId && pendingCancellationBookingIds.includes(bookingId));

            return (
              <div
                key={trip.pnr}
                onClick={() =>
                  ['upcoming', 'past'].includes(trip.status) && onViewTicket(trip)
                }
                className={`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border ${
                  ['cancelled', 'refund_pending'].includes(trip.status)
                    ? 'border-rose-100 dark:border-rose-900/30 opacity-80'
                    : 'border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono font-bold text-slate-500 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                    PNR: {trip.pnr?.replace('TRQ-', '') || ''}
                  </span>

                  {trip.status === 'cancelled' ? (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg">
                      ملغية
                    </span>
                  ) : isPendingCancellation ? (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> جاري الإلغاء
                    </span>
                  ) : trip.status === 'past' ? (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> انتهت
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> مؤكدة
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center font-black text-lg text-slate-800 dark:text-slate-100 mb-1">
                  <span>{trip.from}</span>
                  <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-slate-700 mx-4 relative">
                    <BusFront className="w-4 h-4 text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-0.5" />
                  </div>
                  <span>{trip.to}</span>
                </div>
                <div
                  className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 text-left"
                  dir="ltr"
                >
                  {trip.date} • {trip.departureTime}
                </div>

                {trip.status === 'upcoming' && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onViewTicket(trip);
                      }}
                      className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold py-2.5 rounded-xl text-sm transition-colors"
                    >
                      التذكرة
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isPendingCancellation) return;
                        if (!policy.allowed) {
                          showToast(policy.message, 'error');
                          return;
                        }
                        setCancelingTrip(trip);
                      }}
                      disabled={!policy.allowed || isPendingCancellation}
                      className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors ${
                        policy.allowed && !isPendingCancellation
                          ? 'bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isPendingCancellation
                        ? 'جاري الإلغاء'
                        : policy.allowed
                        ? 'إلغاء'
                        : 'فات وقت الإلغاء'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cancelingTrip && cancelPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[428px] rounded-[2rem] p-6 shadow-2xl relative">
            <button
              onClick={() => setCancelingTrip(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              متأكد إنك عايز تلغي؟
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              {cancelPolicy.label} • {cancelingTrip.company}
            </p>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 space-y-3 text-sm font-bold">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>قيمة التذكرة:</span>
                <span dir="ltr">{cancelingTrip.finalTotal} ج.م</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>رسوم الإلغاء ({(cancelPolicy.feeRatio * 100).toFixed(0)}%):</span>
                <span dir="ltr">
                  -{Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio)} ج.م
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-lg text-emerald-600 dark:text-emerald-400">
                <span>المبلغ المسترد:</span>
                <span dir="ltr">{cancelPolicy.refundAmount} ج.م</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelingTrip(null)}
                className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                لا، خليها
              </button>
              <button
                onClick={confirmCancel}
                disabled={!cancelPolicy.allowed}
                className={`flex-1 py-4 rounded-2xl font-black transition shadow-lg ${
                  cancelPolicy.allowed
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                أكد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripsView;
