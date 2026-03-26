import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  MapPin,
  QrCode,
  Route,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AppSurface,
  FieldShell,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  cx,
} from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice } from '../components/ui/StateBlocks';
import { CITIES, getLocalDateInputValue } from '../utils/travel';
import { formatCurrency, formatDateText } from '../utils/formatting';
import { getPrimaryStationName, withStationNames } from '../utils/stations';
import { copyTextWithFallback } from '../public/publicPortal';

const QUICK_ROUTES = [
  { from: 'القاهرة', to: 'الإسكندرية' },
  { from: 'القاهرة', to: 'المنصورة' },
  { from: 'القاهرة', to: 'أسوان' },
  { from: 'الإسكندرية', to: 'مرسى مطروح' },
];

const WEEKDAY_LABELS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' });

function ActionTile({ icon, title, subtitle, onClick }) {
  const IconComponent = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-press app-surface app-surface-hover rounded-[28px] p-5 text-right"
    >
      <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[var(--surface-soft)] text-[var(--brand-strong)] dark:text-[var(--brand)]">
        <IconComponent className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-black text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">{subtitle}</p>
    </button>
  );
}

function buildCalendarDays(monthValue, minDateValue) {
  const firstDay = new Date(monthValue.getFullYear(), monthValue.getMonth(), 1, 12);
  const offsetFromSaturday = (firstDay.getDay() + 1) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - offsetFromSaturday);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const iso = current.toISOString().slice(0, 10);
    const isCurrentMonth = current.getMonth() === monthValue.getMonth();
    const isPast = iso < minDateValue;
    return {
      iso,
      day: current.getDate(),
      inMonth: isCurrentMonth,
      isPast,
    };
  });
}

function shiftMonth(dateValue, delta) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth() + delta, 1, 12);
}

function normalizeMonthSource(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12);
}

function shiftIsoDate(isoValue, delta) {
  const source = new Date(`${isoValue}T12:00:00`);
  source.setDate(source.getDate() + delta);
  return source.toISOString().slice(0, 10);
}

function useDismissiblePicker({ isOpen, onDismiss }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onDismiss]);

  return ref;
}

function PickerPopover({ children, className = '' }) {
  return (
    <div
      className={cx(
        'absolute inset-x-0 top-[calc(100%+10px)] z-[140] rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] p-2 shadow-[0_28px_68px_-34px_rgba(16,35,63,0.45)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SelectPickerField({
  id,
  value,
  onChange,
  placeholder,
  options,
  renderLabel,
  openPickerId,
  setOpenPickerId,
  className = '',
}) {
  const isOpen = openPickerId === id;
  const dismiss = () => setOpenPickerId((current) => (current === id ? null : current));
  const wrapperRef = useDismissiblePicker({ isOpen, onDismiss: dismiss });

  const activeOption = options.find((option) => option.value === value) || null;
  const buttonLabel = activeOption ? renderLabel?.(activeOption) || activeOption.label : placeholder;

  return (
    <div
      ref={wrapperRef}
      onBlurCapture={(event) => {
        if (isOpen && !event.currentTarget.contains(event.relatedTarget)) {
          setOpenPickerId(null);
        }
      }}
      className={cx('relative min-w-0', isOpen && 'z-[150]', className)}
    >
      <button
        type="button"
        onClick={() => setOpenPickerId((current) => (current === id ? null : id))}
        className={cx(
          'app-input flex min-h-[60px] w-full items-center justify-between gap-3 text-right',
          !activeOption && 'text-[var(--ink-soft)]',
          isOpen && 'border-[var(--brand)] shadow-[0_0_0_4px_rgba(33,86,217,0.12)]',
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate text-base font-black">{buttonLabel}</span>
        <ChevronDown className={cx('h-5 w-5 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen ? (
        <PickerPopover className="max-h-72 overflow-y-auto">
          <div role="listbox" className="space-y-1">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpenPickerId(null);
                  }}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-right transition',
                    selected
                      ? 'bg-[var(--info-bg)] text-[var(--brand-strong)]'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-soft)]',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{option.label}</p>
                    {option.hint ? (
                      <p className="mt-0.5 truncate text-xs font-bold text-[var(--ink-muted)]">{option.hint}</p>
                    ) : null}
                  </div>
                  {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </PickerPopover>
      ) : null}
    </div>
  );
}

function DatePickerField({
  id,
  value,
  onChange,
  placeholder,
  minDate,
  openPickerId,
  setOpenPickerId,
  className = '',
}) {
  const todayMonth = normalizeMonthSource(minDate, new Date());
  const [visibleMonth, setVisibleMonth] = useState(normalizeMonthSource(value || minDate, todayMonth));
  const isOpen = openPickerId === id;
  const dismiss = () => setOpenPickerId((current) => (current === id ? null : current));
  const wrapperRef = useDismissiblePicker({ isOpen, onDismiss: dismiss });
  const selectedMonthSource = useMemo(() => normalizeMonthSource(value || minDate, todayMonth), [value, minDate, todayMonth]);

  const days = useMemo(() => buildCalendarDays(visibleMonth, minDate), [visibleMonth, minDate]);
  const monthLabel = useMemo(() => MONTH_FORMATTER.format(visibleMonth), [visibleMonth]);
  const canGoPrev = visibleMonth.getFullYear() > todayMonth.getFullYear() || visibleMonth.getMonth() > todayMonth.getMonth();
  const selectedLabel = value ? formatDateText(value) : placeholder;
  const quickDateOptions = useMemo(
    () => [
      { value: minDate, label: 'اليوم' },
      { value: shiftIsoDate(minDate, 1), label: 'بكرة' },
      { value: shiftIsoDate(minDate, 2), label: 'بعد بكرة' },
    ],
    [minDate],
  );

  return (
    <div
      ref={wrapperRef}
      onBlurCapture={(event) => {
        if (isOpen && !event.currentTarget.contains(event.relatedTarget)) {
          setOpenPickerId(null);
        }
      }}
      className={cx('relative min-w-0', isOpen && 'z-[150]', className)}
    >
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setVisibleMonth(selectedMonthSource);
          }
          setOpenPickerId((current) => (current === id ? null : id));
        }}
        className={cx(
          'app-input flex min-h-[60px] w-full items-center justify-between gap-3 text-right',
          !value && 'text-[var(--ink-soft)]',
          isOpen && 'border-[var(--brand)] shadow-[0_0_0_4px_rgba(33,86,217,0.12)]',
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 truncate text-base font-black">{selectedLabel}</span>
        <ChevronDown className={cx('h-5 w-5 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen ? (
        <PickerPopover className="overflow-hidden p-3 md:p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => canGoPrev && setVisibleMonth((current) => shiftMonth(current, -1))}
                disabled={!canGoPrev}
                className="grid h-10 w-10 place-items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] transition hover:border-[var(--brand)]/30 hover:bg-[var(--surface-inset)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="الشهر السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-[15px] font-black tracking-tight text-[var(--ink)]">{monthLabel}</p>
                <p className="mt-1 truncate text-[11px] font-bold text-[var(--ink-muted)]">{value ? `المختار: ${selectedLabel}` : 'اختار يوم السفر'}</p>
              </div>

              <button
                type="button"
                onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                className="grid h-10 w-10 place-items-center rounded-[14px] border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] transition hover:border-[var(--brand)]/30 hover:bg-[var(--surface-inset)]"
                aria-label="الشهر التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {quickDateOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setVisibleMonth(normalizeMonthSource(option.value, todayMonth));
                    }}
                    className={cx(
                      'h-11 rounded-[14px] border text-xs font-black transition',
                      selected
                        ? 'border-[var(--brand)] bg-[var(--info-bg)] text-[var(--brand-strong)] shadow-[0_14px_28px_-26px_rgba(33,86,217,0.35)]'
                        : 'border-[var(--line)] bg-transparent text-[var(--ink)] hover:border-[var(--brand)]/22 hover:bg-[var(--surface-soft)]',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              dir="rtl"
              className="grid grid-cols-7 justify-items-center gap-x-2 gap-y-1 text-center text-[11px] font-black text-[var(--ink-soft)]"
            >
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="grid h-7 w-7 place-items-center">{label}</span>
              ))}
            </div>

            <div dir="rtl" className="grid grid-cols-7 justify-items-center gap-x-2 gap-y-2">
              {days.map((day) => {
                const selected = day.iso === value;
                const isToday = day.iso === minDate;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={day.isPast}
                    onClick={() => {
                      onChange(day.iso);
                      setOpenPickerId(null);
                    }}
                    className={cx(
                      'group relative grid h-10.5 w-10.5 place-items-center rounded-[15px] text-sm font-black transition',
                      day.isPast && 'cursor-not-allowed opacity-35',
                      !day.isPast && day.inMonth && !selected && 'hover:bg-[var(--surface-soft)]',
                      !day.isPast && !day.inMonth && !selected && 'hover:bg-[var(--surface-soft)]/60',
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-8.5 w-8.5 place-items-center transition',
                        selected
                          ? 'rounded-full bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_18px_34px_-26px_rgba(33,86,217,0.58)]'
                          : isToday && !day.isPast
                          ? 'rounded-[12px] bg-[var(--info-bg)]/45 text-[var(--brand-strong)]'
                          : day.inMonth
                          ? 'rounded-[12px] text-[var(--ink)]'
                          : 'rounded-[12px] text-[var(--ink-soft)]',
                      )}
                    >
                      {day.day}
                    </span>
                    {isToday && !selected && !day.isPast ? (
                      <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand)]/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </PickerPopover>
      ) : null}
    </div>
  );
}

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
  latestTrip,
  wallet = 0,
  points = 0,
  subscription = 'none',
  onOpenTickets,
  onOpenWallet,
}) {
  const todayDate = getLocalDateInputValue();
  const latestTripData = withStationNames(latestTrip);
  const [openPickerId, setOpenPickerId] = useState(null);

  const cityOptions = useMemo(
    () => CITIES.map((city) => ({ value: city, label: city, hint: getPrimaryStationName(city) })),
    [],
  );
  const passengerOptions = useMemo(
    () => [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value} ${value === 1 ? 'راكب' : 'ركاب'}` })),
    [],
  );

  const handleSwap = () => {
    setSearchParams((currentValue) => ({
      ...currentValue,
      from: currentValue.to,
      to: currentValue.from,
    }));
    setOpenPickerId(null);
  };

  const copyPromo = async (offer) => {
    const code = String(offer?.code || '').trim();
    if (!code) return;

    const copied = await copyTextWithFallback(code, 'كود العرض');
    showToast(copied ? `تم نسخ الكود ${code}.` : 'تعذر نسخ الكود حالياً.', copied ? 'success' : 'error');
    if (copied) {
      onPromoHighlightInteraction?.(offer, 'copied');
    }
  };

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-6 pb-[calc(env(safe-area-inset-bottom)+116px)] md:space-y-7 md:pb-0">
      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
        <section
          className="app-surface relative z-20 order-1 rounded-[30px] p-5 md:rounded-[32px] md:p-6 xl:order-2"
          style={{ overflow: 'visible' }}
        >
          <SectionHeader title="دور على رحلتك" subtitle="كل اختيار يفتح فوق البطاقة بشكل واضح، ومن غير ما القوائم تتخبى تحتها." />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FieldShell
              label="منين"
              hint={searchParams.from ? getPrimaryStationName(searchParams.from) : 'اختار محافظة التحرك'}
              icon={<MapPin />}
            >
              <SelectPickerField
                id="from"
                value={searchParams.from}
                onChange={(nextValue) => setSearchParams((currentValue) => ({ ...currentValue, from: nextValue }))}
                placeholder="اختار محافظة التحرك"
                options={cityOptions}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
              />
            </FieldShell>

            <FieldShell
              label="رايح فين"
              hint={searchParams.to ? getPrimaryStationName(searchParams.to) : 'اختار محافظة الوصول'}
              icon={<MapPin />}
            >
              <SelectPickerField
                id="to"
                value={searchParams.to}
                onChange={(nextValue) => setSearchParams((currentValue) => ({ ...currentValue, to: nextValue }))}
                placeholder="اختار محافظة الوصول"
                options={cityOptions}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
              />
            </FieldShell>

            <FieldShell label="يوم السفر" icon={<Calendar />}>
              <DatePickerField
                id="date"
                value={searchParams.date}
                onChange={(nextValue) => setSearchParams((currentValue) => ({ ...currentValue, date: nextValue }))}
                placeholder="اختار يوم السفر"
                minDate={todayDate}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
              />
            </FieldShell>

            <FieldShell label="عدد الركاب" icon={<Users />}>
              <SelectPickerField
                id="passengers"
                value={String(searchParams.passengers || 1)}
                onChange={(nextValue) =>
                  setSearchParams((currentValue) => ({
                    ...currentValue,
                    passengers: Number(nextValue),
                  }))
                }
                placeholder="عدد الركاب"
                options={passengerOptions}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
              />
            </FieldShell>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--ink-muted)]">لو محتاج تبدّل الاتجاه بسرعة، استخدم الزر ده.</p>
            <SecondaryButton icon={<ArrowRightLeft className="h-4 w-4" />} onClick={handleSwap}>
              بدّل الاتجاه
            </SecondaryButton>
          </div>

          <PrimaryButton className="mt-5 w-full text-base" icon={<Search className="h-5 w-5" />} onClick={onSearch}>
            دور على الرحلات
          </PrimaryButton>
        </section>

        <div className="order-2 space-y-5 xl:order-1">
          <div className="app-brand-panel app-grid-pattern rounded-[32px] p-5 md:rounded-[36px] md:p-7">
            <PageHeading
              eyebrow="رحلات مصر بشكل أوضح"
              title="احجز وانت مطمّن من أول خطوة"
              subtitle="شوف المسار، المحطة، الوقت، والسعر من غير لف. كل خطوة بتوضح لك أنت فين وإيه اللي بعد كده."
              className="text-white [&_h1]:text-[2.3rem] [&_h1]:leading-[1.05] [&_h1]:text-white [&_p]:text-white/80 md:[&_h1]:text-[3.25rem]"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <MetaChip label={`رصيدك ${formatCurrency(wallet)}`} tone="brand" className="border-white/10 bg-white/10 text-white" />
              <MetaChip label={`${points} نقطة`} tone="success" className="border-white/10 bg-white/10 text-white" />
              <MetaChip
                label={subscription !== 'none' ? `باقة ${subscription === 'vip' ? 'VIP' : 'طالب'}` : 'بدون باقة'}
                tone="warning"
                className="border-white/10 bg-white/10 text-white"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={openGuide}
                className="interactive-press rounded-[24px] border border-white/14 bg-white/10 p-4 text-right text-white transition hover:bg-white/14"
              >
                <p className="text-sm font-black">الدليل السريع</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">
                  {isFirstTimeUser
                    ? 'لو دي أول مرة، هيوضح لك خطوات الحجز في أقل من دقيقة.'
                    : 'افتحه وقت ما تحب تراجع الحجز أو التذكرة أو الإلغاء.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => openModal?.('help')}
                className="interactive-press rounded-[24px] border border-white/14 bg-white/10 p-4 text-right text-white transition hover:bg-white/14"
              >
                <p className="text-sm font-black">المساعدة</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/78">
                  إجابات سريعة للحجز، التذاكر، المحفظة، والإلغاء.
                </p>
              </button>
            </div>
          </div>

          {isFirstTimeUser ? (
            <InlineNotice
              title="ابدأ من البحث فقط"
              text="حدد منين ورايح فين ويوم السفر. التطبيق هيكمل معاك خطوة بخطوة لحد التذكرة."
              actionLabel="افتح الدليل"
              onAction={openGuide}
              icon={Sparkles}
            />
          ) : null}
        </div>
      </section>

      {latestTripData ? (
        <AppSurface className="p-5 md:p-6">
          <SectionHeader
            title="أقرب تذكرة ليك"
            subtitle="وصول سريع للتذكرة أو متابعة الرحلة من غير ما تدور."
            action={<SecondaryButton onClick={onOpenTickets}>كل التذاكر</SecondaryButton>}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
              <p className="text-sm font-black text-[var(--ink)]">
                {latestTripData.from} إلى {latestTripData.to}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">
                {latestTripData.fromStationName} ← {latestTripData.toStationName}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label={formatDateText(latestTripData.date)} tone="neutral" />
                <MetaChip label={`${latestTripData.departureTime} → ${latestTripData.arrivalTime}`} tone="brand" />
                <MetaChip label={latestTripData.pnr ? `رقم الحجز ${latestTripData.pnr}` : 'تذكرة جاهزة'} tone="success" />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row xl:flex-row">
              <PrimaryButton onClick={onOpenTickets} icon={<QrCode className="h-5 w-5" />}>افتح التذكرة</PrimaryButton>
              <SecondaryButton onClick={onOpenWallet} icon={<Wallet className="h-5 w-5" />}>افتح المحفظة</SecondaryButton>
            </div>
          </div>
        </AppSurface>
      ) : (
        <EmptyStateCard
          title="مفيش تذكرة نشطة دلوقتي"
          text="أول ما تكمل حجز، هتلاقي التذكرة والرحلة الجاية ظاهرين هنا للوصول السريع."
          actionLabel="التذاكر"
          onAction={onOpenTickets}
        />
      )}

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
              className="interactive-press app-surface app-surface-hover min-w-[220px] max-w-[86vw] rounded-[26px] px-4 py-4 text-right"
            >
              <p className="text-sm font-black text-[var(--ink)]">
                {route.from} <span className="mx-1 text-[var(--ink-soft)]">←</span> {route.to}
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--ink-muted)]">
                {getPrimaryStationName(route.from)} · {getPrimaryStationName(route.to)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="اختصارات مفيدة" subtitle="دخول سريع للحاجات اللي الناس بتحتاجها فعلاً." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionTile icon={Route} title="رحلاتي" subtitle="راجع الحجوزات، الإلغاء، وحالة الاسترداد." onClick={onOpenTickets} />
          <ActionTile icon={QrCode} title="التذاكر" subtitle="افتح التذكرة والـ QR وقت السفر بسرعة." onClick={onOpenTickets} />
          <ActionTile icon={Wallet} title="المحفظة" subtitle="شوف الرصيد والحركات أو اشحن الحساب." onClick={onOpenWallet} />
          <ActionTile icon={Crown} title="باقات التوفير" subtitle="لو سفرك متكرر، فعّل باقة تناسبك." onClick={() => openModal?.('subs')} />
        </div>
      </section>

      {promoHighlights.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader title="عروض متاحة" subtitle="لو فيه عرض مناسب لحسابك، هتلاقيه هنا مباشرة." />
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
                className="app-brand-panel interactive-press rounded-[30px] p-5 text-right text-white"
              >
                <p className="text-xs font-black tracking-[0.16em] text-white/70">
                  {offer.code ? `استخدم ${offer.code}` : 'عرض متاح'}
                </p>
                <h3 className="mt-3 text-2xl font-black">{offer.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-white/85">
                  {offer.description || offer.message || 'خصم متاح على رحلتك الجاية.'}
                </p>
                <div className="mt-5 inline-flex rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-black">
                  {offer.ctaLabel || (offer.code ? 'انسخ الكود' : 'افتح العرض')}
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
