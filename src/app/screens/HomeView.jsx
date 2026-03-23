import React from 'react';
import {
  ArrowRightLeft,
  Bot,
  BusFront,
  Calendar,
  Car,
  Copy,
  Crown,
  MapPin,
  Package,
  Search,
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
import { getPrimaryStationName } from '../utils/stations';

const QUICK_ROUTES = [
  { from: 'القاهرة', to: 'الإسكندرية' },
  { from: 'القاهرة', to: 'المنصورة' },
  { from: 'القاهرة', to: 'أسوان' },
  { from: 'الإسكندرية', to: 'مرسى مطروح' },
];

const SERVICES = [
  {
    icon: Package,
    title: 'إرسال طرد',
    subtitle: 'بين المحافظات بتسعير واضح',
    action: 'courier',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    icon: Crown,
    title: 'باقات التوفير',
    subtitle: 'خصومات ثابتة للمسافرين الكتير',
    action: 'subs',
    tone: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  },
  {
    icon: Bot,
    title: 'الدعم والمساعدة',
    subtitle: 'اسأل بسرعة عن الحجز والإلغاء',
    action: 'bot',
    tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  },
  {
    icon: Car,
    title: 'توصيل للمحطة',
    subtitle: 'بيتفعل وقت الدفع حسب رحلتك',
    action: 'coming',
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
  },
];

const OFFERS = [
  {
    code: 'AHLAN50',
    title: 'خصم 50 جنيه',
    text: 'على أول رحلة ليك على طريقي',
    tone: 'from-amber-400 via-orange-500 to-orange-600',
    action: 'copy',
  },
  {
    code: 'SA3EED15',
    title: 'خصم رحلات الصعيد',
    text: 'خصم 15% على الرحلات الطويلة',
    tone: 'from-emerald-500 via-teal-500 to-cyan-600',
    action: 'copy',
  },
  {
    code: 'مطروح',
    title: 'رحلات الساحل السريعة',
    text: 'ادخل على القاهرة → مرسى مطروح فورًا',
    tone: 'from-sky-500 via-blue-500 to-indigo-600',
    action: 'route',
    params: { from: 'القاهرة', to: 'مرسى مطروح' },
  },
];

const HELPER_CARDS = [
  {
    icon: Search,
    title: 'ابحث بسرعة',
    text: 'حدد المحافظة واليوم وشوف الرحلات بترتيب واضح من غير لف.',
  },
  {
    icon: Ticket,
    title: 'التذكرة جاهزة فورًا',
    text: 'بعد التأكيد هتلاقي التذكرة والـ QR وكل التفاصيل في لحظتها.',
  },
  {
    icon: WalletIcon,
    title: 'المحفظة والاسترداد',
    text: 'لو حصل إلغاء أو استرداد، الحركة هتظهر قدامك مباشرة وبوضوح.',
  },
];

function HomeView({
  searchParams,
  setSearchParams,
  onSearch,
  showToast,
  onPromoSearch,
  openModal,
  openGuide,
}) {
  const todayDate = getLocalDateInputValue();

  const handleSwap = () => {
    setSearchParams((currentValue) => ({
      ...currentValue,
      from: currentValue.to,
      to: currentValue.from,
    }));
  };

  const copyPromo = (code) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
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

    showToast(`تم نسخ الكود ${code} جاهز للاستخدام`, 'success');
  };

  const searchFieldClassName =
    'h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 pr-12 text-base font-black text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-5 pb-6 pt-6 text-white shadow-[0_30px_60px_-36px_rgba(16,35,63,0.6)] md:px-7 md:pt-7">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.24), transparent 28%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div className="space-y-5">
            <PageHeading
              eyebrow="رحلات مصر بشكل أوضح"
              title="احجز رحلتك من غير توتر ولا دوشة"
              subtitle="طريقي مصمم عشان يوريك الرحلة، المحطة، ميعاد التحرك، المقاعد، والدفع بشكل مفهوم جدًا من أول مرة."
              className="text-white [&_h1]:text-white [&_p]:text-white/80 [&_[class*='text-indigo-600']]:text-white/70"
              actions={
                <div className="flex flex-wrap gap-2">
                  <MetaChip label="تذكرة فورية" tone="brand" className="border-white/15 bg-white/12 text-white" />
                  <MetaChip label="استرداد للمحفظة" tone="brand" className="border-white/15 bg-white/12 text-white" />
                  <MetaChip label="متابعة الرحلة" tone="brand" className="border-white/15 bg-white/12 text-white" />
                </div>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:max-w-[520px]">
              <button
                type="button"
                onClick={openGuide}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">أول مرة تستخدم طريقي؟</p>
                <p className="mt-1 text-sm font-bold text-white/75">دليل سريع يشرح البحث، الكرسي، الدفع، التذكرة، والتتبع.</p>
              </button>
              <button
                type="button"
                onClick={() => openModal('bot')}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">محتاج مساعدة؟</p>
                <p className="mt-1 text-sm font-bold text-white/75">افتح الدعم واسأل عن الإلغاء، الرصيد، أو العروض المتاحة.</p>
              </button>
            </div>
          </div>

          <AppSurface className="border-white/10 bg-white/95 p-5 backdrop-blur sm:p-6 dark:border-slate-800 dark:bg-slate-950/95">
            <SectionHeader title="دور على رحلتك" subtitle="المحطة بتظهر تلقائيًا حسب المحافظة اللي هتختارها." />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FieldShell
                label="منين"
                hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'}
                icon={<MapPin />}
              >
                <select
                  value={searchParams.from}
                  onChange={(event) =>
                    setSearchParams((currentValue) => ({ ...currentValue, from: event.target.value }))
                  }
                  className={`${searchFieldClassName} appearance-none`}
                >
                  <option value="">اختار محافظة التحرك</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell
                label="رايح فين"
                hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'}
                icon={<MapPin />}
              >
                <select
                  value={searchParams.to}
                  onChange={(event) =>
                    setSearchParams((currentValue) => ({ ...currentValue, to: event.target.value }))
                  }
                  className={`${searchFieldClassName} appearance-none`}
                >
                  <option value="">اختار محافظة الوصول</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="يوم السفر" icon={<Calendar />}>
                <input
                  type="date"
                  value={searchParams.date}
                  min={todayDate}
                  onChange={(event) =>
                    setSearchParams((currentValue) => ({ ...currentValue, date: event.target.value }))
                  }
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
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'راكب' : 'ركاب'}
                    </option>
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
        title="الحجز لأول مرة لازم يبقى مطمّن"
        text="كل خطوة في طريقي بتوضح إنت فين، حصل إيه، وإيه اللي جاي بعده. ولو في مشكلة هتلاقي تصرف واضح بدل شاشة مبهمة."
        actionLabel="شوف الدليل"
        onAction={openGuide}
      />

      <section className="space-y-4">
        <SectionHeader
          title="مسارات سريعة"
          subtitle="اختيارات جاهزة للمسارات الأشهر عشان تبدأ أسرع."
        />
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
              className="min-w-[220px] rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-right shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-slate-800"
            >
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {route.from} <span className="mx-1 text-slate-300">←</span> {route.to}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                {getPrimaryStationName(route.from)} · {getPrimaryStationName(route.to)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="إيه اللي هيحصل بعد الحجز؟" subtitle="ثلاث نقاط مهمين لأي مستخدم جديد." />
        <div className="grid gap-4 md:grid-cols-3">
          {HELPER_CARDS.map((card) => (
            <AppSurface key={card.title} className="p-5">
              <span className="grid h-12 w-12 place-items-center rounded-[22px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                <card.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{card.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{card.text}</p>
            </AppSurface>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="خدمات السفر" subtitle="مدخل واضح للخدمات المكملة بدل ما تبقى مستخبية." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((service) => (
            <button
              key={service.title}
              type="button"
              onClick={() => {
                if (service.action === 'coming') {
                  showToast('الخدمة دي مرتبطة بخطوة الدفع وبتظهر وقتها تلقائيًا', 'success');
                  return;
                }
                openModal(service.action);
              }}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <span className={`grid h-14 w-14 place-items-center rounded-[24px] ${service.tone}`}>
                <service.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{service.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{service.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="عروض مفيدة" subtitle="عروض واضحة وسهلة الاستخدام من غير زحمة بصرية." />
        <div className="grid gap-4 lg:grid-cols-3">
          {OFFERS.map((offer) => (
            <button
              key={offer.title}
              type="button"
              onClick={() => {
                if (offer.action === 'copy') {
                  copyPromo(offer.code);
                  return;
                }

                onPromoSearch({
                  ...offer.params,
                  date: searchParams.date || todayDate,
                  passengers: 1,
                });
              }}
              className={`overflow-hidden rounded-[30px] bg-gradient-to-br ${offer.tone} p-5 text-right text-white shadow-[0_20px_45px_-28px_rgba(16,35,63,0.35)] transition hover:-translate-y-0.5`}
            >
              <p className="text-xs font-black tracking-[0.16em] text-white/70">
                {offer.action === 'copy' ? `استخدم ${offer.code}` : 'افتح المسار'
                }
              </p>
              <h3 className="mt-3 text-2xl font-black">{offer.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-white/85">{offer.text}</p>
              <div className="mt-5 inline-flex rounded-full bg-white/14 px-3 py-2 text-xs font-black">
                {offer.action === 'copy' ? <Copy className="ml-2 h-4 w-4" /> : <BusFront className="ml-2 h-4 w-4" />}
                {offer.action === 'copy' ? 'انسخ الكود' : 'ابدأ البحث'}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeView;
