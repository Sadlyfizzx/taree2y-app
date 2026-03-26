import React from 'react';
import {
  ArrowRightLeft,
  BookOpen,
  Calendar,
  Copy,
  Crown,
  HelpCircle,
  MapPin,
  Search,
  Ticket,
  Users,
} from 'lucide-react';
import {
  AppSurface,
  FieldShell,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { CITIES, getLocalDateInputValue } from '../utils/travel';
import { getPrimaryStationName } from '../utils/stations';

const QUICK_ROUTES = [
  { from: 'القاهرة', to: 'الإسكندرية' },
  { from: 'القاهرة', to: 'المنصورة' },
  { from: 'القاهرة', to: 'أسوان' },
  { from: 'الإسكندرية', to: 'مرسى مطروح' },
];

function HomeView({
  searchParams,
  setSearchParams,
  onSearch,
  showToast,
  onPromoSearch,
  openModal,
  openGuide,
  isFirstTimeUser = false,
  promoHighlights = [],
  onPromoHighlightInteraction,
}) {
  const todayDate = getLocalDateInputValue();

  const openPanel = (key) => {
    if (typeof openModal === 'function') {
      openModal(key);
      return;
    }

    showToast?.('الميزة دي لسه مش جاهزة في المسار الحالي.', 'error');
  };

  const handleSwap = () => {
    setSearchParams((currentValue) => ({
      ...currentValue,
      from: currentValue.to,
      to: currentValue.from,
    }));
  };

  const copyPromo = async (offer) => {
    const code = String(offer?.code || '').trim();
    if (!code) return;

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
      } catch {
        // ignore fallback copy error
      }

      document.body.removeChild(textArea);
    }

    showToast?.(`تم نسخ الكود ${code}.`, 'success');
    onPromoHighlightInteraction?.(offer, 'copied');
  };

  const searchFieldClassName =
    'h-14 w-full rounded-[22px] border border-slate-200 bg-[var(--panel)] px-4 pr-12 text-base font-black text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-[var(--panel)] dark:text-white';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-5 pb-6 pt-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)] md:px-7 md:pt-7">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 28%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
          <div className="space-y-5">
            <PageHeading
              eyebrow="رحلات مصر بشكل أوضح"
              title="احجز رحلتك بسهولة ومن غير زحمة"
              subtitle="اختار خط السير، راجع المقاعد، وأكمل الدفع من غير دوشة أو خطوات مالهاش لازمة."
              className="text-white [&_h1]:text-white [&_p]:text-white/80 [&_[class*='text-indigo-600']]:text-white/70"
            />

            <div className="flex flex-wrap gap-2">
              <MetaChip label="حجز واضح" tone="brand" className="border-white/15 bg-white/12 text-white" />
              <MetaChip label="تذكرة فورية" tone="brand" className="border-white/15 bg-white/12 text-white" />
              <MetaChip label="استرداد للمحفظة" tone="brand" className="border-white/15 bg-white/12 text-white" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[520px]">
              <button
                type="button"
                onClick={openGuide}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">
                  {isFirstTimeUser ? 'ابدأ بالدليل السريع' : 'راجع الخطوات بسرعة'}
                </p>
                <p className="mt-1 text-sm font-bold text-white/75">
                  شرح مختصر للبحث، اختيار المقعد، الدفع، والتذكرة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => openPanel('help')}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">محتاج مساعدة؟</p>
                <p className="mt-1 text-sm font-bold text-white/75">
                  افتح مركز المساعدة وشوف الإجابات الأساسية بسرعة.
                </p>
              </button>
            </div>
          </div>

          <AppSurface className="border-white/10 bg-white/95 p-5 backdrop-blur sm:p-6 dark:border-slate-800 dark:bg-slate-950/95">
            <SectionHeader title="دور على رحلتك" subtitle="المحطة الأساسية بتظهر تلقائيًا حسب المحافظة." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FieldShell
                label="منين"
                hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'}
                icon={<MapPin className="h-5 w-5" />}
              >
                <select
                  value={searchParams.from}
                  onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, from: event.target.value }))}
                  className={`${searchFieldClassName} appearance-none`}
                >
                  <option value="">اختار محافظة التحرك</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell
                label="رايح فين"
                hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'}
                icon={<MapPin className="h-5 w-5" />}
              >
                <select
                  value={searchParams.to}
                  onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, to: event.target.value }))}
                  className={`${searchFieldClassName} appearance-none`}
                >
                  <option value="">اختار محافظة الوصول</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="يوم السفر" icon={<Calendar className="h-5 w-5" />}>
                <input
                  type="date"
                  value={searchParams.date}
                  min={todayDate}
                  onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, date: event.target.value }))}
                  className={searchFieldClassName}
                />
              </FieldShell>

              <FieldShell label="عدد الركاب" icon={<Users className="h-5 w-5" />}>
                <select
                  value={searchParams.passengers}
                  onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, passengers: Number(event.target.value) }))}
                  className={`${searchFieldClassName} appearance-none`}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>{count} {count === 1 ? 'راكب' : 'ركاب'}</option>
                  ))}
                </select>
              </FieldShell>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                لو عايز تبدّل الاتجاه بسرعة، استخدم الزر ده بدل ما تعيد اختيار المدن.
              </p>
              <SecondaryButton icon={<ArrowRightLeft className="h-4 w-4" />} onClick={handleSwap}>
                بدّل الاتجاه
              </SecondaryButton>
            </div>

            <PrimaryButton className="mt-5 w-full text-base" icon={<Search className="h-5 w-5" />} onClick={onSearch}>
              دور على الرحلات
            </PrimaryButton>
          </AppSurface>
        </div>
      </section>

      <InlineNotice
        title="كل خطوة واضحة"
        text="بعد اختيار الرحلة، هتدخل للمقاعد ثم الدفع ثم التذكرة. مفيش أزرار وهمية ولا خطوات ملهاش لازمة."
        actionLabel="افتح الدليل"
        onAction={openGuide}
      />

      <section className="space-y-4">
        <SectionHeader title="مسارات سريعة" subtitle="اختيارات جاهزة للمسارات الأشهر." />
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
          {QUICK_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              onClick={() =>
                onPromoSearch({
                  from: route.from,
                  to: route.to,
                  date: searchParams.date || todayDate,
                  passengers: searchParams.passengers || 1,
                })
              }
              className="app-surface min-w-[220px] rounded-[24px] px-4 py-4 text-right transition hover:-translate-y-0.5"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {route.from} <span className="mx-1 inline-flex text-slate-300"><ArrowRightLeft className="h-4 w-4" /></span> {route.to}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                {getPrimaryStationName(route.from)} · {getPrimaryStationName(route.to)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="خدمات مهمة" subtitle="الخدمات دي مرتبطة بخطوات حقيقية داخل التطبيق." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => openPanel('subs')}
            className="app-surface rounded-[28px] p-5 text-right transition hover:-translate-y-0.5"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
              <Crown className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">باقات التوفير</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">فعّل باقة لو بتسافر باستمرار وعايز خصومات أوفر.</p>
          </button>

          <button
            type="button"
            onClick={() => openPanel('help')}
            className="app-surface rounded-[28px] p-5 text-right transition hover:-translate-y-0.5"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
              <HelpCircle className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">مركز المساعدة</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">إجابات مباشرة عن الحجز، الإلغاء، المحفظة، والتذكرة.</p>
          </button>

          <button
            type="button"
            onClick={openGuide}
            className="app-surface rounded-[28px] p-5 text-right transition hover:-translate-y-0.5"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <BookOpen className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">دليل الاستخدام</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">لو دي أول مرة تستخدم طريقي، الدليل هيمشي معاك خطوة بخطوة.</p>
          </button>
        </div>
      </section>

      {promoHighlights.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title="عروض متاحة" subtitle="لو العرض مناسب ليك، انسخ الكود أو افتحه مباشرة." />
          <div className="grid gap-4 lg:grid-cols-3">
            {promoHighlights.map((offer) => (
              <button
                key={offer.code || offer.title}
                type="button"
                onClick={() => {
                  if (offer.code) {
                    copyPromo(offer);
                    return;
                  }

                  onPromoHighlightInteraction?.(offer, 'opened');

                  if (offer.routeParams) {
                    onPromoSearch({
                      ...offer.routeParams,
                      date: searchParams.date || todayDate,
                      passengers: searchParams.passengers || 1,
                    });
                  }
                }}
                className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#163c98_0%,#2156d9_64%,#0f9f8a_140%)] p-5 text-right text-white shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] transition hover:-translate-y-0.5"
              >
                <p className="text-xs font-black tracking-[0.16em] text-white/70">{offer.code ? `استخدم ${offer.code}` : 'عرض متاح'}</p>
                <h3 className="mt-3 text-2xl font-black">{offer.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-white/85">{offer.description || offer.message || 'عرض نشط حالياً داخل التطبيق.'}</p>
                <div className="mt-5 inline-flex rounded-full bg-white/14 px-3 py-2 text-xs font-black">
                  <Copy className="ml-2 h-4 w-4" />
                  {offer.code ? 'انسخ الكود' : 'افتح العرض'}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default HomeView;
