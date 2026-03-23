import { useMemo, useState } from 'react';
import { AlertTriangle, BusFront, CheckCircle2, Clock, Ticket, X } from 'lucide-react';
import { EmptyState, GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';
import { getCancellationPolicy, getTripLifecycleStatus } from '../utils/travel';

function TripsView({ trips, setMyTrips, processRefund, onViewTicket, showToast }) {
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
    <div className="space-y-5 pb-4">
      <GlassCard className="p-5 md:p-6">
        <ScreenHeader
          eyebrow="إدارة التذاكر"
          title="كل رحلاتك في مكان واحد"
          description="التذاكر الحالية، السابقة، والملغية مع إمكانية عرض التذكرة أو طلب الإلغاء."
        />

        <div className="mt-5 inline-flex rounded-[24px] border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`rounded-[18px] px-5 py-3 text-sm font-black transition ${
              activeTab === 'upcoming'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            التذاكر الجاية
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`rounded-[18px] px-5 py-3 text-sm font-black transition ${
              activeTab === 'past'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            السابقة والملغية
          </button>
        </div>
      </GlassCard>

      {filteredTrips.length === 0 ? (
        <EmptyState
          icon={<Ticket />}
          title="مفيش تذاكر هنا"
          description="أول ما تحجز رحلة هتظهر هنا مع إمكانية متابعة التذكرة والتفاصيل."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredTrips.map((trip) => {
            const policy = getCancellationPolicy(trip);

            return (
              <GlassCard
                key={trip.pnr}
                className={`p-5 ${['cancelled', 'refund_pending'].includes(trip.status) ? 'opacity-90' : ''}`}
              >
                <button
                  onClick={() => ['upcoming', 'past'].includes(trip.status) && onViewTicket(trip)}
                  className="w-full text-right"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      PNR: {trip.pnr?.replace('TRQ-', '') || ''}
                    </span>

                    {trip.status === 'cancelled' ? (
                      <SoftBadge tone="rose" text="ملغية" />
                    ) : trip.status === 'refund_pending' ? (
                      <SoftBadge tone="amber" icon={<Clock className="h-3.5 w-3.5" />} text="جاري الإلغاء" />
                    ) : trip.status === 'past' ? (
                      <SoftBadge tone="amber" icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="انتهت" />
                    ) : (
                      <SoftBadge tone="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="مؤكدة" />
                    )}
                  </div>

                  <div className="mb-3 flex items-center justify-between gap-3 text-center">
                    <div className="w-[32%]">
                      <div className="text-xl font-black text-slate-900 dark:text-white">{trip.from}</div>
                    </div>
                    <div className="flex flex-1 items-center px-2 text-slate-300 dark:text-slate-600">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <div className="mx-1 flex-1 border-t-2 border-dashed border-current" />
                      <BusFront className="h-5 w-5 text-indigo-400" />
                      <div className="mx-1 flex-1 border-t-2 border-dashed border-current" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="w-[32%]">
                      <div className="text-xl font-black text-slate-900 dark:text-white">{trip.to}</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                      {trip.date} • {trip.departureTime}
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      {trip.company} • {trip.class}
                    </div>
                  </div>
                </button>

                {trip.status === 'upcoming' ? (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => onViewTicket(trip)}
                      className="flex-1 rounded-[20px] bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
                    >
                      عرض التذكرة
                    </button>
                    <button
                      onClick={() => {
                        if (!policy.allowed) {
                          showToast(policy.message, 'error');
                          return;
                        }
                        setCancelingTrip(trip);
                      }}
                      className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-black transition ${
                        policy.allowed
                          ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500'
                      }`}
                    >
                      {policy.allowed ? 'إلغاء' : 'فات وقت الإلغاء'}
                    </button>
                  </div>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}

      {cancelingTrip && cancelPolicy ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-in-down">
          <div className="w-full max-w-[460px] rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
            <button
              onClick={() => setCancelingTrip(null)}
              className="mb-5 ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white">متأكد إنك عايز تلغي؟</h3>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              {cancelPolicy.label} • {cancelingTrip.company}
            </p>

            <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-3 text-sm font-black">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>قيمة التذكرة</span>
                  <span dir="ltr">{cancelingTrip.finalTotal} ج.م</span>
                </div>
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-300">
                  <span>رسوم الإلغاء</span>
                  <span dir="ltr">-{Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio)} ج.م</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300">
                  <span>المبلغ المسترد</span>
                  <span dir="ltr">{cancelPolicy.refundAmount} ج.م</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCancelingTrip(null)}
                className="flex-1 rounded-[22px] bg-slate-100 px-4 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                لا، خليها
              </button>
              <button
                onClick={confirmCancel}
                disabled={!cancelPolicy.allowed}
                className={`flex-1 rounded-[22px] px-4 py-4 text-sm font-black transition ${
                  cancelPolicy.allowed
                    ? 'bg-rose-600 text-white shadow-[0_20px_50px_-28px_rgba(225,29,72,0.65)]'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                أكد الإلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TripsView;
