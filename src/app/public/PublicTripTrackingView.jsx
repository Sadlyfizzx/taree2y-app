import React, { useEffect, useMemo, useState } from 'react';
import { BusFront, MapPinned } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import { AppSurface, MetaChip } from '../components/ui/AppPrimitives';
import { InlineNotice, LoadingPanel } from '../components/ui/StateBlocks';
import { ROUTE_META, getTripLifecycleStatus } from '../utils/travel';
import { getPublicTripShare } from './publicPortal';
import { formatPercent, formatTimeText } from '../utils/formatting';

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--bg)] px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-5">{children}</div>
    </div>
  );
}

export default function PublicTripTrackingView({ token }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const nextPayload = await getPublicTripShare(token);
        if (!active) return;

        if (!nextPayload) {
          setError('رابط المتابعة غير متاح حالياً.');
        } else {
          setPayload(nextPayload);
        }
      } catch (_error) {
        if (active) setError('تعذر تحميل متابعة الرحلة حالياً.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const now = useMemo(() => new Date(tick), [tick]);
  const lifecycle = useMemo(
    () => (payload ? getTripLifecycleStatus(payload, now) : null),
    [payload, now],
  );
  const routeMeta = useMemo(
    () =>
      payload
        ? ROUTE_META[`${payload.from}-${payload.to}`] || { hasRestStop: payload.durationHour >= 4.5 }
        : null,
    [payload],
  );

  if (loading) {
    return (
      <Shell>
        <LoadingPanel title="جاري تحميل المتابعة" text="بنجهز حالة الرحلة لحظياً…" />
      </Shell>
    );
  }

  if (!payload || error) {
    return (
      <Shell>
        <InlineNotice tone="danger" title="تعذر فتح الرابط" text={error || 'الرابط غير صالح.'} />
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.24), transparent 28%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-white/70">متابعة رحلة طريقي</p>
            <h1 className="mt-3 text-3xl font-black">{payload.from} إلى {payload.to}</h1>
            <p className="mt-2 text-sm font-bold text-white/80">الرابط ده يفتح فقط لمن يملكه.</p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-white/12 text-white">
            <BusFront className="h-7 w-7" />
          </span>
        </div>
      </section>

      <AppSurface className="p-5">
        <div className="flex flex-wrap gap-2">
          <MetaChip label={lifecycle?.statusText || 'جاري التتبع'} tone="brand" />
          <MetaChip label={`رقم الرحلة ${payload.publicTripCode || payload.pnr || '—'}`} tone="neutral" />
          {routeMeta?.hasRestStop ? <MetaChip label="فيه استراحة" tone="warning" /> : null}
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">وقت الوصول المتوقع</p>
            <h2 className="mt-2 text-right text-4xl font-black text-slate-900 dark:text-white" dir="ltr">
              {formatTimeText(payload.arrivalTime)}
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">يتم تحديث الحالة تلقائياً كل 30 ثانية.</p>
          </div>

          <div className="w-full max-w-[320px] rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
              <span>تقدم الرحلة</span>
              <span>{formatPercent(lifecycle?.progress || 0)}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#2156d9_0%,#0f9f8a_100%)]" style={{ width: `${Math.max(0, Math.min(100, lifecycle?.progress || 0))}%` }} />
            </div>
          </div>
        </div>
      </AppSurface>

      <RouteTimeline trip={payload} />

      <AppSurface className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
            <MapPinned className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-black text-slate-900 dark:text-white">الحالة الحالية</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{lifecycle?.statusText || '—'}</p>
          </div>
        </div>
      </AppSurface>
    </Shell>
  );
}
