import React from 'react';
import {
  ArrowRightLeft,
  Compass,
  HelpCircle,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Ticket,
  Users,
  Wallet as WalletIcon,
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
import { getPrimaryStationName, withStationNames } from '../utils/stations';
import { formatCurrency, formatSeatsText } from '../utils/formatting';
import RouteTimeline from '../components/ui/RouteTimeline';

const QUICK_ROUTES = [
  { from: 'القاهرة', to: 'الإسكندرية' },
  { from: 'القاهرة', to: 'المنصورة' },
  { from: 'القاهرة', to: 'أسوان' },
  { from: 'الإسكندرية', to: 'مرسى مطروح' },
];

export default function HomeView({
  searchParams,
  setSearchParams,
  onSearch,
  onPromoSearch,
  openHelp,
  latestTrip,
  wallet,
  points,
  subscription,
  promoHighlights = [],
  onOpenTickets,
  onOpenWallet,
}) {
  const todayDate = getLocalDateInputValue();
  const preparedLatestTrip = latestTrip ? withStationNames(latestTrip) : null;

  const searchFieldClassName =
    'h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 pr-12 text-base font-black text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  const handleSwap = () => {
    setSearchParams((currentValue) => ({
      ...currentValue,
      from: currentValue.to,
      to: currentValue.from,
    }));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#f9fbff_0%,#eef4ff_42%,#f6f9ff_100%)] p-5 shadow-[0_24px_60px_-36px_rgba(16,35,63,0.25)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#081322_0%,#0c1d34_40%,#0d2445_100%)] md:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(33,86,217,0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(15,159,138,0.16), transparent 24%)' }} />
          <div className="relative z-10 space-y-5">
            <PageHeading
              eyebrow="الرحلة تبدأ من هنا"
              title="احجز بسرعة ومن غير لف"
              subtitle="اختار خط السير واليوم وعدد الركاب، وبعدها كمل الحجز خطوة بخطوة بشكل واضح ومريح."
              actions={
                <div className="flex flex-wrap gap-2">
                  <MetaChip label="بحث واضح" tone="brand" />
                  <MetaChip label="مقاعد مفهومة" tone="neutral" />
                  <MetaChip label="تذكرة جاهزة" tone="success" />
                </div>
              }
            />

            <AppSurface className="border-slate-200/80 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:p-5">
              <SectionHeader title="دور على رحلتك" subtitle="هتظهر لك المحطة الأساسية تلقائيًا مع كل محافظة." />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FieldShell label="منين" hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'} icon={<MapPin />}>
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

                <FieldShell label="رايح فين" hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'} icon={<Compass />}>
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

                <FieldShell label="يوم السفر" icon={<Ticket />}>
                  <input
                    type="date"
                    value={searchParams.date}
                    min={todayDate}
                    onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, date: event.target.value }))}
                    className={searchFieldClassName}
                  />
                </FieldShell>

                <FieldShell label="عدد الركاب" icon={<Users />}>
                  <select
                    value={searchParams.passengers}
                    onChange={(event) =>
                      setSearchParams((currentValue) => ({
                        ...currentValue,
                        passengers: Number(event.target.value),
                      }))
                    }
                    className={`${searchFieldClassName} appearance-none`}
                  >
                    {[1, 2, 3, 4, 5].map((count) => (
                      <option key={count} value={count}>{count} {count === 1 ? 'راكب' : 'ركاب'}</option>
                    ))}
                  </select>
                </FieldShell>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SecondaryButton onClick={handleSwap} icon={<ArrowRightLeft className="h-4 w-4" />}>بدّل الاتجاه</SecondaryButton>
                <PrimaryButton className="w-full sm:w-auto sm:min-w-[220px]" icon={<Search className="h-4 w-4" />} onClick={onSearch}>
                  دور على الرحلات
                </PrimaryButton>
              </div>
            </AppSurface>
          </div>
        </div>

        <div className="grid gap-4 content-start">
          {preparedLatestTrip ? (
            <AppSurface className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_24px_55px_-34px_rgba(16,35,63,0.24)] dark:border-slate-800 dark:bg-slate-900 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">رحلة قريبة</p>
                  <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{preparedLatestTrip.from} ← {preparedLatestTrip.to}</h3>
                </div>
                <MetaChip label="جاهزة" tone="success" />
              </div>
              <RouteTimeline trip={preparedLatestTrip} compact className="mt-4 p-0" />
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={`المقاعد: ${formatSeatsText(preparedLatestTrip.selectedSeats)}`} tone="neutral" />
                <MetaChip label={preparedLatestTrip.departureTime} tone="brand" />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton className="flex-1" onClick={onOpenTickets} icon={<QrCode className="h-4 w-4" />}>
                  افتح التذكرة
                </PrimaryButton>
                <SecondaryButton className="flex-1" onClick={onOpenWallet} icon={<WalletIcon className="h-4 w-4" />}>
                  راجع المحفظة
                </SecondaryButton>
              </div>
            </AppSurface>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <AppSurface className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <WalletIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-500 dark:text-slate-400">الرصيد الحالي</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{formatCurrency(wallet)}</p>
                </div>
              </div>
            </AppSurface>

            <AppSurface className="rounded-[30px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-500 dark:text-slate-400">المزايا الحالية</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{Number(points || 0)} نقطة</p>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {subscription && subscription !== 'none' ? 'فيه باقة مفعلة على الحساب.' : 'فعّل باقة لو بتسافر بشكل متكرر.'}
                  </p>
                </div>
              </div>
            </AppSurface>
          </div>
        </div>
      </section>

      <InlineNotice
        title="لو احتجت شرح، هتلاقيه في مكان واحد"
        text="المساعدة والدليل بقوا سوا: خطوات الاستخدام الأساسية والإجابات الشائعة من غير تكرار ولا حشو."
        actionLabel="افتح المساعدة"
        onAction={openHelp}
      />

      <section className="space-y-4">
        <SectionHeader title="ابدأ أسرع" subtitle="اختيارات جاهزة للمسارات الأشهر عشان تدخل على النتائج مباشرة." />
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 xl:grid-cols-4 md:overflow-visible">
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
              className="group min-w-[240px] rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-right shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {route.from}
                <span className="mx-2 inline-flex text-slate-300 dark:text-slate-600">←</span>
                {route.to}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                {getPrimaryStationName(route.from)} · {getPrimaryStationName(route.to)}
              </p>
            </button>
          ))}
        </div>
      </section>

      {promoHighlights.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title="عروض متاحة الآن" subtitle="لو عندك عرض صالح، هتلاقيه هنا بشكل مباشر وواضح." />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {promoHighlights.map((offer) => (
              <div key={offer.code || offer.title} className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_54%,#0f9f8a_140%)] p-5 text-white shadow-[0_22px_55px_-32px_rgba(16,35,63,0.45)]">
                <p className="text-xs font-black tracking-[0.16em] text-white/68">{offer.code ? `كود ${offer.code}` : 'عرض متاح'}</p>
                <h3 className="mt-3 text-xl font-black">{offer.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-white/82">{offer.description || offer.message || 'عرض متاح على حسابك حالياً.'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
