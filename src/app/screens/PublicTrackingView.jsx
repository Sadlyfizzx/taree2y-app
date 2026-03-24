import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, BusFront, Copy, MapPin, ShieldCheck } from 'lucide-react';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { getTripLifecycleStatus } from '../utils/travel';
import { copyShareUrl } from '../utils/publicTripSharing';

export default function PublicTrackingView({ payload }) {
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const lifecycle = useMemo(() => getTripLifecycleStatus(payload, now), [payload, now]);
  const progress = Math.max(0, Math.min(100, lifecycle.progress));

  if (!payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
        <AppSurface className="max-w-xl p-6 text-center">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">الرابط ده غير صالح</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            اتأكد إنك فتحت الرابط كامل من اللي شارك الحالة معاك.
          </p>
        </AppSurface>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-6 py-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.24), transparent 26%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <PageHeading
              eyebrow="متابعة عامة بدون تسجيل دخول"
              title={`حالة الرحلة ${payload.from} → ${payload.to}`}
              subtitle="الرابط ده شغال فقط للي معاه الرابط نفسه، ويعرض التقدم الحالي بشكل واضح ومباشر."
              className="[&_h1]:text-white [&_p]:text-white/80 [&_[class*='text-indigo-600']]:text-white/70"
            />
            <div className="flex flex-wrap gap-2">
              <MetaChip label={payload.publicTripCode} tone="brand" className="border-white/15 bg-white/10 text-white" />
              <MetaChip label={payload.driverRunCode} tone="brand" className="border-white/15 bg-white/10 text-white" />
            </div>
          </div>
        </section>

        <InlineNotice
          tone={progress === 100 ? 'success' : lifecycle.key === 'rest_stop' ? 'warning' : 'info'}
          title={lifecycle.statusText}
          text="التقدم هنا مبني على بيانات الرحلة والجدول المشارك، ويتم تحديثه تلقائيًا داخل الصفحة."
          icon={BusFront}
        />

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <AppSurface className="p-5">
            <RouteTimeline trip={payload} />
            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-3 text-sm font-black text-slate-900 dark:text-white">
                <span>تقدم الرحلة</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#2156d9_0%,#0f9f8a_100%)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                آخر تحديث داخل الصفحة كل 30 ثانية.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetaChip label={`المحطة: ${payload.fromStationName}`} tone="neutral" className="justify-center text-center" />
              <MetaChip label={`الوصول: ${payload.toStationName}`} tone="neutral" className="justify-center text-center" />
              <MetaChip label={`${payload.company} • ${payload.class}`} tone="brand" className="justify-center text-center" />
              <MetaChip label={payload.hasRestStop ? 'فيه استراحة في الطريق' : 'رحلة مباشرة'} tone={payload.hasRestStop ? 'warning' : 'success'} className="justify-center text-center" />
            </div>
          </AppSurface>

          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">تفاصيل سريعة</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-black text-slate-900 dark:text-white">كود الرحلة</p>
                <p className="mt-2 text-xl font-black text-indigo-700 dark:text-indigo-300">{payload.publicTripCode}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-sm font-black text-slate-900 dark:text-white">كود السواق / التشغيل</p>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{payload.driverRunCode}</p>
              </div>
              {payload.driver ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-black text-slate-900 dark:text-white">الكابتن</p>
                  <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{payload.driver.name}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                    التقييم {payload.driver.rating} · {payload.driver.trips} رحلة
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <PrimaryButton
                onClick={async () => {
                  const copied = await copyShareUrl(window.location.href);
                  window.alert(copied ? 'تم نسخ رابط الصفحة.' : 'تعذر نسخ الرابط تلقائيًا.');
                }}
                icon={<Copy className="h-5 w-5" />}
              >
                انسخ الرابط
              </PrimaryButton>
              <SecondaryButton onClick={() => { window.location.href = window.location.origin + window.location.pathname; }} icon={<MapPin className="h-5 w-5" />}>
                افتح طريقي
              </SecondaryButton>
            </div>
          </AppSurface>
        </div>

        <InlineNotice
          tone="info"
          title="تنبيه"
          text="الصفحة دي بتعرض بيانات مشاركة فقط. لوحة السواق أو لوحة الإدارة الفعلية تقدر تتبني لاحقًا فوق نفس أكواد الرحلة والتشغيل."
          icon={ShieldCheck}
        />

        <InlineNotice
          tone="success"
          title="لو التطبيق مفتوح على جهاز صاحب الحجز"
          text="هيتلقى تنبيه قبل التحرك بـ 20 دقيقة وتنبيه تاني وقت بداية الرحلة، ثم يقدر يفتح تقدم الرحلة من داخل التطبيق."
          icon={BellRing}
        />
      </div>
    </div>
  );
}
