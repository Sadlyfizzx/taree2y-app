import React from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Copy,
  Crown,
  HelpCircle,
  MapPin,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AppSurface,
  FieldShell,
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

const QUICK_ACTIONS = [
  {
    icon: Crown,
    title: 'باقات التوفير',
    subtitle: 'وفّر على الرحلات المتكررة من غير لف.',
    action: 'subs',
    tone: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  },
  {
    icon: HelpCircle,
    title: 'المساعدة والدليل',
    subtitle: 'اسأل أو افتح الشرح التفاعلي وقت ما تحب.',
    action: 'help',
    tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
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
  isFirstTimeUser = false,
  promoHighlights = [],
  onPromoHighlightInteraction,
}) {
  const todayDate = getLocalDateInputValue();

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
        // ignore
      }

      document.body.removeChild(textArea);
    }

    showToast(`تم نسخ الكود ${code}.`, 'success');
    onPromoHighlightInteraction?.(offer, 'copied');
  };

  const searchFieldClassName =
    'h-14 w-full rounded-[22px] border border-slate-200 bg-white px-4 pr-12 text-base font-black text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="space-y-6 md:space-y-7">
      <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-4">
          <AppSurface className="overflow-hidden bg-[linear-gradient(135deg,#10233f_0%,#163c98_52%,#2156d9_100%)] p-5 text-white md:p-7">
            <div className="pointer-events-none absolute inset-0 opacity-20" />
            <PageHeading
              eyebrow="الرحلة من أول مرة تبقى مفهومة"
              title="احجز من غير توتر ولا لف"
              subtitle="اختار الطريق، قارن المواعيد، ثبّت الكرسي، وراجع الدفع بخطوات واضحة وسريعة."
              className="text-white [&_h1]:text-white [&_p]:text-white/80 [&_[class*='text-indigo-600']]:text-white/72"
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={openGuide}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">الدليل التفاعلي</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">
                  {isFirstTimeUser
                    ? 'ابدأ منه لو دي أول مرة تستخدم طريقي.'
                    : 'افتحه في أي وقت لو حابب تراجع الخطوات بسرعة.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => openModal('help')}
                className="rounded-[26px] border border-white/15 bg-white/10 p-4 text-right transition hover:bg-white/14"
              >
                <p className="text-sm font-black">المساعدة</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">
                  إجابات سريعة للحجز، التذاكر، الإلغاء، والمحفظة.
                </p>
              </button>
            </div>
          </AppSurface>

          {isFirstTimeUser ? (
            <InlineNotice
              title="ابدأ من خطوة واحدة فقط"
              text="حدّد منين ورايح فين ويوم السفر. التطبيق هيكمّل معاك خطوة خطوة لحد التذكرة."
              actionLabel="افتح الدليل"
              onAction={openGuide}
              icon={Sparkles}
            />
          ) : null}
        </div>

        <AppSurface className="p-5 md:p-6">
          <SectionHeader title="دور على رحلتك" subtitle="كل المطلوب هنا، من غير عناصر زيادة." />

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
              عايز تبدّل الاتجاه بسرعة؟ استخدم الزر ده.
            </p>
            <SecondaryButton icon={<ArrowRightLeft className="h-4 w-4" />} onClick={handleSwap}>
              بدّل الاتجاه
            </SecondaryButton>
          </div>

          <PrimaryButton className="mt-5 w-full text-base" icon={<Search className="h-5 w-5" />} onClick={onSearch}>
            دور على الرحلات
          </PrimaryButton>
        </AppSurface>
      </section>

      <section className="space-y-4">
        <SectionHeader title="مسارات سريعة" subtitle="لما تكون عارف المشوار، ابدأ منه مباشرة." />
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
              className="min-w-[210px] rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-right shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-slate-800"
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
        <SectionHeader title="أقسام مفيدة" subtitle="اللي موجود هنا يا يفتح خطوة حقيقية، يا يشرحها." />
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                if (item.action === 'help') {
                  openModal('help');
                  return;
                }
                openModal(item.action);
              }}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
            >
              <span className={`grid h-14 w-14 place-items-center rounded-[24px] ${item.tone}`}>
                <item.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      {promoHighlights.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title="عروض متاحة" subtitle="لو في عرض مناسب لحسابك، هتلاقيه هنا مباشرة." />
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
                <p className="text-xs font-black tracking-[0.16em] text-white/70">
                  {offer.code ? `استخدم ${offer.code}` : 'عرض متاح'}
                </p>
                <h3 className="mt-3 text-2xl font-black">{offer.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-white/85">
                  {offer.description || offer.message || 'خصم متاح على رحلتك الجاية.'}
                </p>
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
