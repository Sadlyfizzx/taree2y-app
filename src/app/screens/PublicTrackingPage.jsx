import { BusFront, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { readPublicTrackingPayloadFromLocation } from '../utils/publicLinks';
import { getTripLifecycleStatus } from '../utils/travel';
import { withStationNames } from '../utils/stations';
import { formatDateText, formatDuration } from '../utils/formatting';

export default function PublicTrackingPage() {
  const payload = withStationNames(readPublicTrackingPayloadFromLocation());

  if (!payload) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg)] px-4 text-center" dir="rtl">
        <div className="max-w-lg rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(16,35,63,0.35)] dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-black text-slate-900 dark:text-white">رابط المتابعة غير صالح</p>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">تأكد إن الرابط كامل أو اطلب مشاركة جديدة من التذكرة.</p>
        </div>
      </div>
    );
  }

  const lifecycle = getTripLifecycleStatus(payload);
  const progress = Math.round(Math.max(0, Math.min(100, lifecycle.progress || 0)));

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 dark:bg-slate-950" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-white/70">متابعة عامة عبر الرابط</p>
              <h1 className="mt-3 text-4xl font-black">{payload.publicTripCode || 'رحلة طريقي'}</h1>
              <p className="mt-3 text-sm font-bold text-white/80">الرابط ده يشتغل فقط للي معاه المشاركة، وبيوضح حالة الرحلة الحالية بشكل مباشر.</p>
            </div>
            <div className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-3 text-left">
              <p className="text-xs font-black text-white/70">كود تشغيل الرحلة</p>
              <p className="mt-2 font-mono text-lg font-black" dir="ltr">{payload.driverRunCode}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(16,35,63,0.35)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">حالة الرحلة الآن</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{lifecycle.statusText}</h2>
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{formatDateText(payload.date)} · {payload.company} · {payload.class}</p>
            </div>
            <div className="min-w-[220px] rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>تقدم الرحلة</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#2156d9_0%,#0f9f8a_100%)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[1fr_auto_1fr] rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(16,35,63,0.35)] dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">من</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{payload.from}</p>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{payload.fromStationName}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 px-1">
            <div className="flex items-center gap-2 text-slate-300 dark:text-slate-600">
              <span className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900" />
              <span className="h-0.5 w-10 rounded-full bg-current md:w-20" />
              <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                <BusFront className="h-5 w-5" />
              </span>
              <span className="h-0.5 w-10 rounded-full bg-current md:w-20" />
              <span className="h-3 w-3 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-900" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDuration(payload.durationHour)}
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">إلى</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{payload.to}</p>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{payload.toStationName}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Clock3, label: 'التحرك', value: payload.departureTime },
            { icon: Clock3, label: 'الوصول', value: payload.arrivalTime },
            { icon: ShieldCheck, label: 'نوع العرض', value: 'متابعة عامة بالرابط فقط' },
          ].map((item) => (
            <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-black text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm font-bold leading-7 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <MapPin className="ml-2 inline h-4 w-4 text-indigo-500" />
          التقدم هنا تقديري ومبني على جدول الرحلة، ومتاح من خلال الرابط نفسه بدون الحاجة لتسجيل دخول.
        </div>
      </div>
    </div>
  );
}
