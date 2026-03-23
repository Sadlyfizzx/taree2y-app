import {
  ArrowRightLeft,
  Bot,
  Calendar,
  Car,
  Copy,
  Crown,
  MapPin,
  Package,
  Sparkles,
  Sun,
  Tag,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { CITIES, getLocalDateInputValue } from '../utils/travel';
import { AppLogo, GlassCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';

function HomeView({ searchParams, setSearchParams, onSearch, showToast, onPromoSearch, openModal }) {
  const handleSwap = () => setSearchParams((prev) => ({ ...prev, from: prev.to, to: prev.from }));
  const todayDate = getLocalDateInputValue();

  const copyPromo = (code) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
    } else {
      const area = document.createElement('textarea');
      area.value = code;
      area.style.position = 'fixed';
      document.body.appendChild(area);
      area.focus();
      area.select();
      try {
        document.execCommand('copy');
      } catch (_) {
        // noop
      }
      document.body.removeChild(area);
    }
    showToast(`نسخنا كود الخصم (${code}) بنجاح! ✂️`, 'success');
  };

  const services = [
    {
      icon: Package,
      label: 'إرسال طرد',
      modal: 'courier',
      tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
      desc: 'شحن سريع بين المحافظات',
    },
    {
      icon: Crown,
      label: 'باقات التوفير',
      modal: 'subs',
      tone: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
      desc: 'خصومات ثابتة على الرحلات',
    },
    {
      icon: Car,
      label: 'مشاركة سيارات',
      modal: 'carpool',
      tone: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
      desc: 'قريبًا داخل التطبيق',
    },
    {
      icon: Users,
      label: 'تأجير باص',
      modal: 'charter',
      tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
      desc: 'للمشاوير الجماعية',
    },
    {
      icon: Bot,
      label: 'مساعد ودعم',
      modal: 'bot',
      tone: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
      desc: 'اسأل طارق عن أي حاجة',
    },
  ];

  const offers = [
    {
      title: '50 ج.م خصم على أول رحلة',
      desc: 'استخدم الكود في أول حجز ليك على طريقي.',
      action: () => copyPromo('AHLAN50'),
      chip: 'انسخ: AHLAN50',
      icon: Copy,
      classes: 'from-amber-400 via-orange-500 to-rose-500',
    },
    {
      title: 'فورمة الساحل بدأت',
      desc: 'ادخل مباشرة على رحلة القاهرة → مرسى مطروح.',
      action: () =>
        onPromoSearch({
          from: 'القاهرة',
          to: 'مرسى مطروح',
          date: todayDate,
          passengers: 1,
        }),
      chip: 'احجز مطروح فورًا',
      icon: ChevronLeft,
      classes: 'from-cyan-500 via-sky-500 to-blue-600',
    },
    {
      title: 'خصم رحلات الصعيد',
      desc: 'كود صالح على خطوط الصعيد طول الوقت.',
      action: () => copyPromo('SA3EED15'),
      chip: 'انسخ: SA3EED15',
      icon: Copy,
      classes: 'from-emerald-500 via-teal-500 to-green-600',
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_38%)]" />
          <div className="absolute -left-12 bottom-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SoftBadge
                tone="indigo"
                icon={<Sparkles className="h-3.5 w-3.5" />}
                text="سوبر آب النقل والسفر في مصر"
                className="border-white/20 bg-white/10 text-white"
              />
              <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-indigo-50 md:block">
                تجربة مصرية موبايل‑فرست
              </div>
            </div>

            <div className="max-w-2xl">
              <AppLogo className="mb-5 [&_h1]:text-white [&_p]:text-indigo-100" />
              <h2 className="text-3xl font-black leading-[1.2] tracking-tight text-shadow-brand md:text-5xl">
                على فين يا بطل؟
                <br />
                احجز رحلتك في أقل من دقيقة.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-bold leading-7 text-indigo-100 md:text-base">
                من القاهرة لمطروح، من المنصورة لأسوان، ومن التذكرة للمحفظة والتتبع —
                طريقي بيخلّي كل الرحلة في تجربة واحدة نضيفة وواضحة.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-[11px] font-black text-indigo-100">رحلات مهيأة</div>
                <div className="mt-2 text-2xl font-black">+30</div>
                <div className="mt-1 text-xs font-bold text-indigo-100">خط مباشر وتجريبي</div>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-[11px] font-black text-indigo-100">خدمات داخل الرحلة</div>
                <div className="mt-2 text-2xl font-black">6</div>
                <div className="mt-1 text-xs font-bold text-indigo-100">طرد، أكل، نقاط، وباقات</div>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-[11px] font-black text-indigo-100">دعم عربي</div>
                <div className="mt-2 text-2xl font-black">24/7</div>
                <div className="mt-1 text-xs font-bold text-indigo-100">مساعد طارق جاهز لك</div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="ابدأ الحجز"
            title="دوّر على رحلتك"
            description="اختار المدن والتاريخ وعدد الركاب، وطريقي يجيب لك أنسب الرحلات المتاحة."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="relative rounded-[28px] border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/80">
              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] xl:grid-cols-[1fr_auto_1fr]">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <select
                    value={searchParams.from}
                    onChange={(e) => setSearchParams((prev) => ({ ...prev, from: e.target.value }))}
                    className="h-14 w-full appearance-none rounded-[22px] border border-transparent bg-white pr-12 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>
                      هتتحرك منين؟
                    </option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSwap}
                  className="mx-auto flex h-12 w-12 items-center justify-center self-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-sm transition hover:scale-105 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
                >
                  <ArrowRightLeft className="h-5 w-5 rotate-90 md:rotate-0 xl:rotate-0" />
                </button>

                <div className="relative">
                  <MapPin className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500" />
                  <select
                    value={searchParams.to}
                    onChange={(e) => setSearchParams((prev) => ({ ...prev, to: e.target.value }))}
                    className="h-14 w-full appearance-none rounded-[22px] border border-transparent bg-white pr-12 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="" disabled>
                      رايح فين؟
                    </option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={searchParams.date}
                  min={todayDate}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, date: e.target.value }))}
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-white pr-12 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="relative">
                <Users className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  value={searchParams.passengers}
                  onChange={(e) =>
                    setSearchParams((prev) => ({ ...prev, passengers: Number(e.target.value) }))
                  }
                  className="h-14 w-full appearance-none rounded-[22px] border border-slate-200 bg-white pr-12 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count} أفراد
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={onSearch}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-indigo-500 to-violet-600 text-base font-black text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] transition hover:opacity-95 active:scale-[0.99]"
            >
              يلا بينا ندور
              <BusFront className="h-5 w-5" />
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="خدمات السفر"
            title="أكتر من مجرد حجز تذكرة"
            description="خدمات إضافية تخلي تجربة السفر أسهل وأكتر تكامل داخل التطبيق."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <button
                key={service.label}
                onClick={() =>
                  service.modal === 'carpool' || service.modal === 'charter'
                    ? showToast('الخدمة دي هتنزل قريب جداً 🔜', 'success')
                    : openModal(service.modal)
                }
                className="group rounded-[26px] border border-slate-200 bg-white p-4 text-right transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-indigo-500/20"
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] ${service.tone}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{service.label}</div>
                <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
                  {service.desc}
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="عروض لقطة"
            title="خصومات جاهزة للاستخدام"
            description="انسخ الكود أو ادخل مباشرة على العرض المناسب وخلي الحجز أذكى."
          />

          <div className="mt-5 grid gap-4">
            {offers.map((offer) => (
              <button
                key={offer.title}
                onClick={offer.action}
                className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-r ${offer.classes} p-5 text-right text-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5`}
              >
                <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
                <div className="relative z-10">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1 text-[11px] font-black">
                    <offer.icon className="h-3.5 w-3.5" />
                    {offer.chip}
                  </div>
                  <div className="text-2xl font-black">{offer.title}</div>
                  <div className="mt-2 text-sm font-bold text-white/90">{offer.desc}</div>
                </div>
                <Tag className="absolute -left-4 bottom-0 h-24 w-24 text-white/20" />
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SoftBadge tone="emerald" icon={<Sun className="h-3.5 w-3.5" />} text="رحلات المصايف شغالة" />
            <h3 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              طريقي معمول عشان يبقى فعلاً تطبيق سفر مصري.
            </h3>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
              لغة مصرية، تصميم RTL طبيعي، عروض مرتبطة بالوجهات المحلية، وخدمات تكمّل الرحلة من أول الحجز لحد الوصول.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'حجز ونتايج', value: '01' },
              { label: 'مقاعد ودفع', value: '02' },
              { label: 'تذكرة وتتبع', value: '03' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{item.value}</div>
                <div className="mt-2 text-xs font-black text-slate-600 dark:text-slate-300">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default HomeView;
