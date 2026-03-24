import React, { useEffect, useMemo, useState } from 'react';
import { BusFront, Coffee, Copy, ShieldAlert, Star } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { getTripLifecycleStatus, ROUTE_META } from '../utils/travel';
import { withStationNames } from '../utils/stations';
import { createPublicTripShare, copyTextWithFallback } from '../public/publicPortal';

function TrackingView({ ticket, showToast, openModal }) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const data = withStationNames(ticket) || {
    from: '',
    to: '',
    date: new Date().toISOString().slice(0, 10),
    departureTime: '23:59',
    arrivalTime: '23:59',
    durationHour: 0,
  };
  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const lifecycle = useMemo(() => getTripLifecycleStatus(data, now), [data, now]);
  const routeMeta = useMemo(
    () =>
      ROUTE_META[`${data.from}-${data.to}`] || {
        hasRestStop: data.durationHour >= 4.5,
      },
    [data],
  );

  if (!ticket) return null;

  const isMoving = ['en_route', 'rest_stop', 'final_approach'].includes(lifecycle.key);
  const progress = Math.max(0, Math.min(100, lifecycle.progress));

  const handleCopyShareLink = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      const payload = {
        v: 2,
        publicTripCode: data.publicTripCode || data.tripCode || data.id || data.pnr || null,
        driverRunCode: data.driverRunCode || null,
        pnr: data.pnr || null,
        from: data.from,
        to: data.to,
        fromStationName: data.fromStationName,
        toStationName: data.toStationName,
        date: data.date,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        durationHour: data.durationHour,
        company: data.company,
        class: data.class,
        driver: data.driver || null,
        hasRestStop: Boolean(data.hasRestStop),
        issuedAt: Date.now(),
      };

      const share = await createPublicTripShare(payload);
      const copied = await copyTextWithFallback(share.url);
      showToast(copied ? 'تم نسخ رابط المتابعة.' : 'تعذر نسخ رابط المتابعة حاليا.', copied ? 'success' : 'error');
    } catch (_error) {
      showToast('تعذر نسخ رابط المتابعة حاليا.', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="متابعة الرحلة"
        title="حالة الرحلة لحظة بلحظة"
        subtitle="المتابعة هنا مبنية على حالة الرحلة والجدول، فهتعرف إذا كانت لسه في الانتظار، اتحركت، في استراحة، أو قربت توصل."
      />

      <AppSurface className="overflow-hidden p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 text-right">
            <MetaChip label={lifecycle.statusText} tone={lifecycle.key === 'rest_stop' ? 'warning' : progress === 100 ? 'success' : 'brand'} />
            <h2 className="text-right text-3xl font-black text-slate-900 dark:text-white" dir="ltr">
              {data.arrivalTime}
            </h2>
            <p className="text-right text-sm font-bold text-slate-500 dark:text-slate-400">وقت الوصول المتوقع حسب الحالة الحالية.</p>
          </div>
          <div className="w-full max-w-[320px] rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
              <span>تقدم الرحلة</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#2156d9_0%,#0f9f8a_100%)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">آخر تحديث تلقائي كل 30 ثانية، والمتابعة هنا تقديرية وليست GPS مباشر.</p>
          </div>
        </div>
      </AppSurface>

      <RouteTimeline trip={data} />

      {data.driver ? (
        <AppSurface className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-2xl dark:bg-indigo-900/30">{data.driver.img}</span>
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-white">{data.driver.name}</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">كابتن الرحلة · {data.driver.trips} رحلة سابقة</p>
              </div>
            </div>
            <MetaChip icon={<Star className="h-3.5 w-3.5 fill-current" />} label={`تقييم ${data.driver.rating}`} tone="warning" />
          </div>
        </AppSurface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">خط سير الرحلة</h3>
          <div className="mt-5 flex gap-5">
            <div className="relative mr-2 flex w-10 shrink-0 flex-col items-center">
              <span className="z-10 grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                <BusFront className={`h-5 w-5 ${isMoving ? 'animate-pulse' : ''}`} />
              </span>
              <span className="absolute top-10 h-[calc(100%-40px)] w-1 rounded-full bg-slate-200 dark:bg-slate-800">
                <span className="block rounded-full bg-[linear-gradient(180deg,#2156d9_0%,#0f9f8a_100%)]" style={{ height: `${progress}%` }} />
              </span>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">التحرك من {data.fromStationName}</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{data.departureTime} · {data.from}</p>
              </div>
              {routeMeta.hasRestStop ? (
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">استراحة الطريق</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">لو الرحلة دخلت استراحة هتقدر تطلب قبل الوقفة من هنا.</p>
                  <div className="mt-3">
                    <SecondaryButton onClick={() => openModal('food')} icon={<Coffee className="h-4 w-4" />}>
                      اطلب للاستراحة
                    </SecondaryButton>
                  </div>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">الوصول إلى {data.toStationName}</p>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{data.arrivalTime} · {data.to}</p>
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">أزرار سريعة</h3>
          <div className="mt-4 space-y-3">
            <PrimaryButton onClick={handleCopyShareLink} icon={<Copy className="h-4 w-4" />} className="w-full justify-center" disabled={sharing}>
              {sharing ? 'جاري تجهيز الرابط…' : 'نسخ رابط المتابعة'}
            </PrimaryButton>
            <SecondaryButton onClick={() => showToast('زر الطوارئ تجريبي حالياً.', 'error')} icon={<ShieldAlert className="h-4 w-4" />} className="w-full justify-center">
              تواصل عاجل
            </SecondaryButton>
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">الحالة الحالية</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{lifecycle.statusText}</p>
          </div>
        </AppSurface>
      </div>

      <InlineNotice
        tone="info"
        title="معلومة مهمة"
        text="الشاشة دي هدفها تطمنك وتوضح مكانك في الرحلة، لكنها مش بديل عن الإعلانات اللي بتتقال في المحطة أو من طاقم الرحلة."
      />
    </div>
  );
}

export default TrackingView;
