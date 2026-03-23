import { useEffect, useMemo, useState } from 'react';
import { BusFront, Coffee, Share2, ShieldAlert, Star } from 'lucide-react';
import { GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';
import { getTripLifecycleStatus, ROUTE_META } from '../utils/travel';

function TrackingView({ ticket, showToast, openModal }) {
  if (!ticket) return null;

  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const lifecycle = useMemo(() => getTripLifecycleStatus(ticket, now), [ticket, now]);
  const routeMeta = ROUTE_META[`${ticket.from}-${ticket.to}`] || {
    hasRestStop: ticket.durationHour >= 4.5,
  };
  const progress = lifecycle.progress;
  const statusText = lifecycle.statusText;
  const isMoving = ['en_route', 'rest_stop', 'final_approach'].includes(lifecycle.key);
  const busTopPosition = `${progress}%`;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-4">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="تتبع الرحلة"
            title="متابعة لحظية حسب الجدول"
            description="التتبع هنا تقديري ومربوط بحالة الرحلة الحالية داخل التطبيق."
            actions={<SoftBadge tone="indigo" text={statusText} />}
          />

          {ticket.driver ? (
            <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-indigo-50 text-2xl dark:bg-indigo-500/10">
                    {ticket.driver.img}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {ticket.driver.name}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      كابتن الرحلة • {ticket.driver.trips} رحلة سابقة
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {ticket.driver.rating}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => showToast('مشاركة الرحلة هتكون متاحة لما يبقى فيه رابط فعلي للحالة', 'error')}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500/20 dark:hover:text-indigo-300"
            >
              <span className="inline-flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                شارك الرحلة
              </span>
            </button>

            <button
              onClick={() => showToast('زر الطوارئ ده تجريبي حالياً', 'error')}
              className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-black text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                طوارئ
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              وقت الوصول المتوقع
            </div>
            <div className="mt-2 text-4xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
              {ticket.arrivalTime}
            </div>
            <div className="mt-3">
              <SoftBadge
                tone={progress === 100 ? 'amber' : lifecycle.key === 'rest_stop' ? 'amber' : 'emerald'}
                text={statusText}
              />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              دي متابعة تقديرية حسب الجدول وليست GPS مباشر.
            </div>
          </div>
        </GlassCard>

        <GlassCard className="relative overflow-hidden p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_38%)]" />
          <div className="relative z-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  خط الرحلة
                </div>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {ticket.from} → {ticket.to}
                </div>
              </div>
              <SoftBadge tone="indigo" icon={<BusFront className="h-3.5 w-3.5" />} text={`${progress}%`} />
            </div>

            <div className="relative mx-auto flex min-h-[420px] w-full max-w-xl justify-center">
              <div className="absolute inset-y-0 right-1/2 w-1.5 translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div
                className="absolute right-1/2 top-0 w-1.5 translate-x-1/2 rounded-full bg-indigo-500 transition-all duration-1000"
                style={{ height: busTopPosition }}
              />
              <div className="absolute right-1/2 top-0 z-10 h-5 w-5 translate-x-1/2 rounded-full border-4 border-white bg-indigo-500 dark:border-slate-950" />
              <div className="absolute bottom-0 right-1/2 z-10 h-5 w-5 translate-x-1/2 rounded-full border-4 border-white bg-emerald-500 dark:border-slate-950" />

              <div className="absolute right-[calc(50%+2rem)] top-0 w-32">
                <div className="text-sm font-black text-slate-900 dark:text-white">{ticket.from}</div>
                <div className="mt-1 text-[11px] font-black text-slate-400" dir="ltr">
                  {ticket.departureTime}
                </div>
              </div>

              <div className="absolute left-[calc(50%+2rem)] bottom-0 w-32 text-left">
                <div className="text-sm font-black text-slate-900 dark:text-white">{ticket.to}</div>
                <div className="mt-1 text-[11px] font-black text-slate-400" dir="ltr">
                  {ticket.arrivalTime}
                </div>
              </div>

              {routeMeta.hasRestStop ? (
                <>
                  <div className="absolute right-1/2 top-1/2 z-10 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 dark:border-slate-950" />
                  <div className="absolute right-[calc(50%+2rem)] top-1/2 w-32 -translate-y-1/2">
                    <div className="text-xs font-black text-slate-700 dark:text-slate-200">استراحة ريست</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">وقت توقّف قصير</div>
                  </div>
                  <button
                    onClick={() => openModal('food')}
                    className="absolute left-[calc(50%+2rem)] top-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Coffee className="h-3.5 w-3.5" />
                      اطلب للريست
                    </span>
                  </button>
                </>
              ) : null}

              <div
                className={`absolute right-1/2 z-20 flex h-14 w-14 translate-x-1/2 items-center justify-center rounded-full bg-indigo-500 text-white shadow-[0_22px_48px_-24px_rgba(79,70,229,0.82)] transition-all duration-1000 ${
                  isMoving ? 'animate-bounce' : ''
                }`}
                style={{ top: `calc(${busTopPosition} - 28px)` }}
              >
                <BusFront className="h-6 w-6" />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default TrackingView;
