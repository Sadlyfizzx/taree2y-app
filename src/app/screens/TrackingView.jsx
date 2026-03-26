import React, { useEffect, useMemo, useState } from 'react';
import { BusFront, Copy, ShieldCheck, Star } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { getTripLifecycleStatus, ROUTE_META } from '../utils/travel';
import { withStationNames } from '../utils/stations';
import { createPublicTripShare, copyTextWithFallback } from '../public/publicPortal';

function TrackingView({ ticket, showToast }) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const data = useMemo(
    () =>
      withStationNames(ticket) || {
        from: '',
        to: '',
        date: new Date().toISOString().slice(0, 10),
        departureTime: '23:59',
        arrivalTime: '23:59',
        durationHour: 0,
      },
    [ticket],
  );
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
      const copied = await copyTextWithFallback(share.url, 'رابط المتابعة');
      showToast(
        copied ? 'تم نسخ رابط المتابعة.' : 'تعذر نسخ رابط المتابعة حالياً.',
        copied ? 'success' : 'error',
      );
    } catch {
      showToast('تعذر نسخ رابط المتابعة حالياً.', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
      <PageHeading
        eyebrow="متابعة الرحلة"
        title="حالة الرحلة لحظة بلحظة"
        subtitle="هتعرف إذا كانت الرحلة لسه في الانتظار، اتحركت، في استراحة، أو قربت توصل، مع تحديث تلقائي كل 30 ثانية."
      />

      <section className="app-brand-panel rounded-[36px] p-6 text-white md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 text-right">
            <MetaChip label={lifecycle.statusText} tone={lifecycle.key === 'rest_stop' ? 'warning' : progress === 100 ? 'success' : 'brand'} className="border-white/10 bg-white/10 text-white" />
            <h2 className="text-right text-4xl font-black" dir="ltr">
              {data.arrivalTime}
            </h2>
            <p className="text-right text-sm font-bold text-white/80">وقت الوصول المتوقع حسب الحالة الحالية.</p>
          </div>
          <div className="w-full max-w-[340px] rounded-[26px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm font-black text-white">
              <span>تقدم الرحلة</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#ffffff_0%,#9ff4e2_100%)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-white/78">
              آخر تحديث تلقائي كل 30 ثانية، والمتابعة هنا تقديرية وليست GPS مباشر.
            </p>
          </div>
        </div>
      </section>

      <RouteTimeline trip={data} />

      {data.driver ? (
        <AppSurface className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-[var(--info-bg)] text-2xl dark:text-[var(--brand)]">
                {data.driver.img}
              </span>
              <div>
                <p className="text-lg font-black text-[var(--ink)]">{data.driver.name}</p>
                <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">كابتن الرحلة · {data.driver.trips} رحلة سابقة</p>
              </div>
            </div>
            <MetaChip icon={<Star className="h-3.5 w-3.5 fill-current" />} label={`تقييم ${data.driver.rating}`} tone="warning" />
          </div>
        </AppSurface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-[var(--ink)]">خط سير الرحلة</h3>
          <div className="mt-5 flex gap-5">
            <div className="relative mr-2 flex w-10 shrink-0 flex-col items-center">
              <span className="z-10 grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_30px_-18px_rgba(33,86,217,0.55)]">
                <BusFront className={`h-5 w-5 ${isMoving ? 'animate-pulse' : ''}`} />
              </span>
              <span className="absolute top-10 h-[calc(100%-40px)] w-1 rounded-full bg-[var(--line)]">
                <span className="block rounded-full bg-[linear-gradient(180deg,#2156d9_0%,#0f9f8a_100%)]" style={{ height: `${progress}%` }} />
              </span>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <p className="text-sm font-black text-[var(--ink)]">التحرك من {data.fromStationName}</p>
                <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">{data.departureTime} · {data.from}</p>
              </div>
              {routeMeta.hasRestStop ? (
                <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
                  <p className="text-sm font-black text-[var(--ink)]">فيه استراحة في الطريق</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                    لو الرحلة دخلت استراحة، هتشوف الحالة دي بوضوح هنا.
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-sm font-black text-[var(--ink)]">الوصول إلى {data.toStationName}</p>
                <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">{data.arrivalTime} · {data.to}</p>
              </div>
            </div>
          </div>
        </AppSurface>

        <AppSurface className="p-5">
          <h3 className="text-lg font-black text-[var(--ink)]">مشاركة الحالة</h3>
          <div className="mt-4 space-y-3">
            <PrimaryButton onClick={handleCopyShareLink} icon={<Copy className="h-4 w-4" />} className="w-full justify-center" disabled={sharing}>
              {sharing ? 'جاري تجهيز الرابط…' : 'نسخ رابط المتابعة'}
            </PrimaryButton>
          </div>

          <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              <p className="text-sm font-black text-[var(--ink)]">الحالة الحالية</p>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">{lifecycle.statusText}</p>
          </div>
        </AppSurface>
      </div>

      <InlineNotice
        tone="info"
        title="معلومة مهمة"
        text="الشاشة دي هدفها تطمّنك وتوضح مرحلة الرحلة، لكنها مش بديل عن الإعلانات في المحطة أو تعليمات طاقم الرحلة."
      />
    </div>
  );
}

export default TrackingView;
