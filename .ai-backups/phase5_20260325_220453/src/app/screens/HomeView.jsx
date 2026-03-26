import React from 'react';
import { ArrowRightLeft, Award, BookOpen, Calendar, Crown, MapPin, Search, Ticket, Users, Wallet as WalletIcon } from 'lucide-react';
import { AppSurface, FieldShell, MetaChip, PageHeading, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { CITIES, getLocalDateInputValue } from '../utils/travel';
import { getPrimaryStationName, withStationNames } from '../utils/stations';

const QUICK_ROUTES = [
  { from: 'القاهرة', to: 'الإسكندرية' },
  { from: 'القاهرة', to: 'المنصورة' },
  { from: 'القاهرة', to: 'أسوان' },
  { from: 'الإسكندرية', to: 'مرسى مطروح' },
];

function formatTripDateChip(dateValue) {
  if (!dateValue) return 'تاريخ غير محدد';

  try {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${dateValue}T12:00:00`));
  } catch {
    return String(dateValue);
  }
}

function UtilityCard({ icon: Icon, label, value, note, onClick, tone, mobileOnly = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[26px] border border-slate-200 bg-white p-4 text-right shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-indigo-200 hover:shadow-md active:scale-[0.985] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 ${mobileOnly ? 'md:hidden' : ''}`}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-[18px] ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-black text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{note}</p>
    </button>
  );
}

export default function HomeView({
  searchParams,
  setSearchParams,
  onSearch,
  openGuide,
  isFirstTimeUser = false,
  latestTrip = null,
  wallet = 0,
  points = 0,
  subscription = 'none',
  onOpenLatestTicket,
  onOpenBookings,
  onOpenTickets,
  onOpenWallet,
  onOpenRewards,
  onOpenSubscriptions,
  onPromoSearch,
}) {
  const todayDate = getLocalDateInputValue();
  const preparedLatestTrip = latestTrip ? withStationNames(latestTrip) : null;
  const hasUpcomingTrip = Boolean(preparedLatestTrip?.from && preparedLatestTrip?.to);
  const subscriptionLabel = subscription === 'vip' ? 'VIP' : subscription === 'student' ? 'طالب' : 'بدون باقة';

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
    <div className="space-y-5 md:space-y-6">
      <PageHeading
        eyebrow="الرئيسية"
        title="ابدأ الحجز من هنا"
        subtitle="الرئيسية للحجز السريع فقط، وباقي المزايا لها أماكن أوضح ومخصصة."
      />

      {hasUpcomingTrip ? (
        <AppSurface className="overflow-hidden p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">الرحلة القادمة</p>
              <h2 className="mt-2 flex flex-wrap items-center gap-3 text-xl font-black text-slate-900 dark:text-white">
                <span>{preparedLatestTrip.from}</span>
                <ArrowRightLeft className="h-4 w-4 text-slate-300" />
                <span>{preparedLatestTrip.to}</span>
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label={formatTripDateChip(preparedLatestTrip.date)} tone="brand" />
                <MetaChip label={`التحرك ${preparedLatestTrip.departureTime || '--:--'}`} tone="neutral" />
                <MetaChip label={`المقاعد ${preparedLatestTrip.selectedSeats?.join('، ') || '—'}`} tone="success" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={onOpenLatestTicket} className="sm:min-w-[180px]">افتح التذكرة</PrimaryButton>
              <SecondaryButton onClick={onOpenBookings}>رحلاتي</SecondaryButton>
            </div>
          </div>
        </AppSurface>
      ) : null}

      <div className="grid gap-4 md:hidden">
        <AppSurface className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,#10233f_0%,#163c98_58%,#2156d9_100%)] p-5 text-white">
            <p className="text-xs font-black tracking-[0.16em] text-white/70">حجز جديد</p>
            <h2 className="mt-2 text-2xl font-black">منين لحد فين؟</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-white/80">اختار خط الرحلة واليوم وعدد الركاب، وبعدها هتدخل مباشرة على نتائج البحث والمقاعد والدفع.</p>
          </div>

          <div className="space-y-4 p-4">
            <FieldShell label="منين" hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'} icon={<MapPin />}>
              <select value={searchParams.from} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, from: event.target.value }))} className={`${searchFieldClassName} appearance-none`}>
                <option value="">اختار محافظة التحرك</option>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </FieldShell>

            <FieldShell label="رايح فين" hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'} icon={<MapPin />}>
              <select value={searchParams.to} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, to: event.target.value }))} className={`${searchFieldClassName} appearance-none`}>
                <option value="">اختار محافظة الوصول</option>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </FieldShell>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <FieldShell label="يوم السفر" icon={<Calendar />} className="min-w-0">
                <input type="date" value={searchParams.date} min={todayDate} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, date: event.target.value }))} className={searchFieldClassName} />
              </FieldShell>
              <button type="button" onClick={handleSwap} className="mt-[30px] grid h-14 w-14 place-items-center rounded-[22px] border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.985] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <ArrowRightLeft className="h-5 w-5" />
              </button>
            </div>

            <FieldShell label="عدد الركاب" icon={<Users />}>
              <select value={searchParams.passengers} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, passengers: Number(event.target.value) }))} className={`${searchFieldClassName} appearance-none`}>
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'راكب' : 'ركاب'}</option>)}
              </select>
            </FieldShell>

            <PrimaryButton onClick={onSearch} icon={<Search className="h-5 w-5" />} className="w-full">ابحث عن الرحلات</PrimaryButton>
          </div>
        </AppSurface>

        <div className="grid grid-cols-2 gap-3">
          <UtilityCard icon={WalletIcon} label="المحفظة" value={`${wallet} ج.م`} note="الرصيد وحركة الحساب" onClick={onOpenWallet} tone="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300" />
          <UtilityCard icon={Award} label="المكافآت" value={`${points} نقطة`} note="النقاط والدعوات" onClick={onOpenRewards} tone="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" />
          <UtilityCard icon={Crown} label="الاشتراكات" value={subscriptionLabel} note="الباقات والمزايا" onClick={onOpenSubscriptions} tone="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" />
          <UtilityCard icon={Ticket} label="التذاكر" value="الوصول السريع" note="افتح التذكرة أو الـ QR وقت السفر" onClick={onOpenTickets} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" />
        </div>
      </div>

      <div className="hidden gap-5 md:grid xl:grid-cols-[1.15fr_0.85fr]">
        <AppSurface className="p-5 sm:p-6">
          <SectionHeader title="احجز رحلة جديدة" subtitle="البحث جزء من التدفق، لذلك يبدأ من هنا وليس من صفحة مستقلة في التنقل." />

          {isFirstTimeUser ? (
            <div className="mt-5">
              <InlineNotice tone="info" title="أول مرة تستخدم طريقي؟" text="ابدأ بالحجز من هنا، ولو احتجت شرح سريع افتح الدليل في أي وقت." actionLabel="فتح الدليل" onAction={openGuide} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FieldShell label="منين" hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'} icon={<MapPin />}>
              <select value={searchParams.from} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, from: event.target.value }))} className={`${searchFieldClassName} appearance-none`}>
                <option value="">اختار محافظة التحرك</option>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </FieldShell>

            <FieldShell label="رايح فين" hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'} icon={<MapPin />}>
              <select value={searchParams.to} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, to: event.target.value }))} className={`${searchFieldClassName} appearance-none`}>
                <option value="">اختار محافظة الوصول</option>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </FieldShell>

            <FieldShell label="يوم السفر" icon={<Calendar />}>
              <input type="date" value={searchParams.date} min={todayDate} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, date: event.target.value }))} className={searchFieldClassName} />
            </FieldShell>

            <FieldShell label="عدد الركاب" icon={<Users />}>
              <select value={searchParams.passengers} onChange={(event) => setSearchParams((currentValue) => ({ ...currentValue, passengers: Number(event.target.value) }))} className={`${searchFieldClassName} appearance-none`}>
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} {count === 1 ? 'راكب' : 'ركاب'}</option>)}
              </select>
            </FieldShell>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryButton onClick={onSearch} icon={<Search className="h-5 w-5" />} className="sm:min-w-[220px]">ابحث عن الرحلات</PrimaryButton>
            <SecondaryButton onClick={handleSwap} icon={<ArrowRightLeft className="h-5 w-5" />}>بدّل الاتجاه</SecondaryButton>
          </div>
        </AppSurface>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <UtilityCard icon={Ticket} label="رحلاتي" value={hasUpcomingTrip ? 'رحلة قادمة' : 'إدارة الحجوزات'} note="صفحة الإدارة والمتابعة والإلغاء في مكان واحد." onClick={onOpenBookings} tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <UtilityCard icon={Ticket} label="التذاكر" value="الوصول السريع" note="افتح التذكرة أو الـ QR من غير ما تدخل على إدارة الحجز." onClick={onOpenTickets} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" />
            <UtilityCard icon={WalletIcon} label="المحفظة" value={`${wallet} ج.م`} note="الرصيد وحركة الفلوس في صفحة واضحة." onClick={onOpenWallet} tone="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300" />
            <UtilityCard icon={Award} label="المكافآت" value={`${points} نقطة`} note="النقاط والدعوات والعروض في صفحة واحدة." onClick={onOpenRewards} tone="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" />
            <UtilityCard icon={Crown} label="الاشتراكات" value={subscriptionLabel} note="الباقات والمزايا بوضوح من غير زحمة." onClick={onOpenSubscriptions} tone="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300" />
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader title="مسارات سريعة" subtitle="اختيارات جاهزة للمسارات الأشهر عشان تبدأ أسرع." />
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
          {QUICK_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              onClick={() => onPromoSearch({ from: route.from, to: route.to, date: searchParams.date || todayDate, passengers: searchParams.passengers || 1 })}
              className="min-w-[220px] rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-right shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.985] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-slate-800"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">{route.from} <span className="mx-1 text-slate-300">←</span> {route.to}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{getPrimaryStationName(route.from)} · {getPrimaryStationName(route.to)}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <UtilityCard icon={BookOpen} label="الدليل" value="شرح سريع" note="افتح الدليل وقت ما تحب تراجع الخطوات الأساسية." onClick={openGuide} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" />
        <UtilityCard icon={WalletIcon} label="المحفظة" value={`${wallet} ج.م`} note="لما تحتاج الرصيد أو الحركات، ستجدها في صفحتها المخصصة." onClick={onOpenWallet} tone="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300" mobileOnly />
      </div>
    </div>
  );
}
