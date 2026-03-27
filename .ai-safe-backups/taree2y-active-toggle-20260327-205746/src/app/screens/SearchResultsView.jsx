import React, { useMemo, useState } from 'react';
import { Clock3, Sparkles, Star, Tag, Zap } from 'lucide-react';
import BookingProgress from '../components/ui/BookingProgress';
import TripCard from '../components/ui/TripCard';
import {
  AppSurface,
  MetaChip,
  PageHeading,
  SecondaryButton,
  SectionHeader,
} from '../components/ui/AppPrimitives';
import {
  EmptyStateCard,
  InlineNotice,
  TripCardSkeleton,
} from '../components/ui/StateBlocks';
import { withStationNames } from '../utils/stations';
import { formatDateText } from '../utils/formatting';
import {
  getLocalDateInputValue,
  getSearchAvailabilityNotice,
  getTripSearchUiState,
} from '../utils/travel';

const SCOPE_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'المتاحة فقط' },
  { key: 'closed', label: 'المقفولة / السابقة' },
];

const SORT_FILTERS = [
  { key: 'default', label: 'الترتيب الذكي', icon: <Star className="h-3.5 w-3.5" /> },
  { key: 'cheapest', label: 'الأوفر', icon: <Tag className="h-3.5 w-3.5" /> },
  { key: 'fastest', label: 'الأسرع', icon: <Zap className="h-3.5 w-3.5" /> },
  { key: 'vip', label: 'VIP', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

function SearchResultsView({
  searchParams,
  searchResults,
  isSearching,
  onSelectTrip,
  showToast,
  onGoHome,
}) {
  const [scopeFilter, setScopeFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('default');
  const { trips = [], isDirect } = searchResults;
  const hasSearchContext = Boolean(
    searchParams?.from && searchParams?.to && searchParams?.date,
  );
  const isTodaySearch = searchParams?.date === getLocalDateInputValue();

  const preparedTrips = useMemo(
    () =>
      [...trips].map((trip) => {
        const safeTrip = withStationNames(trip);
        return {
          ...safeTrip,
          searchUi: getTripSearchUiState(safeTrip),
        };
      }),
    [trips],
  );

  const activeTripsCount = useMemo(
    () => preparedTrips.filter((trip) => trip.searchUi?.isActionable).length,
    [preparedTrips],
  );

  const closedTripsCount = useMemo(
    () => preparedTrips.filter((trip) => !trip.searchUi?.isActionable).length,
    [preparedTrips],
  );

  const allTripsUnavailable = preparedTrips.length > 0 && activeTripsCount === 0;
  const showScopeFilters = preparedTrips.length > 0 && closedTripsCount > 0;

  const scopedTrips = useMemo(() => {
    if (scopeFilter === 'active') {
      return preparedTrips.filter((trip) => trip.searchUi?.isActionable);
    }

    if (scopeFilter === 'closed') {
      return preparedTrips.filter((trip) => !trip.searchUi?.isActionable);
    }

    return preparedTrips;
  }, [preparedTrips, scopeFilter]);

  const displayedTrips = useMemo(() => {
    const safeTrips = [...scopedTrips];

    const compareBySort = (tripA, tripB) => {
      if (sortFilter === 'cheapest') return tripA.price - tripB.price;
      if (sortFilter === 'fastest') return tripA.durationHour - tripB.durationHour;
      if (sortFilter === 'vip') {
        const vipA = String(tripA.class || '').includes('VIP') ? 1 : 0;
        const vipB = String(tripB.class || '').includes('VIP') ? 1 : 0;
        return vipB - vipA;
      }
      const seatsDiff =
        (tripB.searchUi?.availableSeats || 0) - (tripA.searchUi?.availableSeats || 0);
      if (seatsDiff !== 0) return seatsDiff;
      return tripA.price - tripB.price;
    };

    safeTrips.sort((tripA, tripB) => {
      if (scopeFilter === 'all') {
        const activeOrder =
          Number(Boolean(tripB.searchUi?.isActionable)) -
          Number(Boolean(tripA.searchUi?.isActionable));
        if (activeOrder !== 0) return activeOrder;
      }
      return compareBySort(tripA, tripB);
    });

    return safeTrips;
  }, [scopeFilter, scopedTrips, sortFilter]);

  const totalAvailableSeats = useMemo(
    () =>
      displayedTrips.reduce((sum, trip) => {
        if (!trip.searchUi?.isActionable) return sum;
        return sum + (trip.searchUi?.availableSeats || 0);
      }, 0),
    [displayedTrips],
  );

  const soldOutTripsCount = useMemo(
    () => displayedTrips.filter((trip) => trip.searchUi?.isSoldOut).length,
    [displayedTrips],
  );

  const availabilityNotice = useMemo(
    () => getSearchAvailabilityNotice(scopeFilter === 'closed' ? preparedTrips : scopedTrips),
    [preparedTrips, scopeFilter, scopedTrips],
  );

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
      <PageHeading
        eyebrow="اختيار الرحلة"
        title="قارن واختار المناسب ليك"
        subtitle="ركّز على وقت التحرك، اسم المحطة، الدرجة، والإتاحة قبل ما تروح للمقاعد."
      />

      {!hasSearchContext ? (
        <EmptyStateCard
          title="ابدأ البحث من الرئيسية"
          text="ادخل المسار والتاريخ وعدد الركاب من الصفحة الرئيسية، وبعدها النتائج هتظهر هنا مباشرة."
          actionLabel="الذهاب للرئيسية"
          onAction={onGoHome}
        />
      ) : (
        <>
          <AppSurface className="p-4 sm:p-5">
            <BookingProgress current="results" />
            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <div>
                <h2 className="text-2xl font-black text-[var(--ink)]">
                  {searchParams.from} إلى {searchParams.to}
                </h2>
                <p className="mt-2 text-sm font-bold text-[var(--ink-muted)]">
                  {formatDateText(searchParams.date)} · {searchParams.passengers}{' '}
                  {searchParams.passengers === 1 ? 'راكب' : 'ركاب'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MetaChip label={`${displayedTrips.length} رحلة`} tone="brand" />
                  <MetaChip label={`${totalAvailableSeats} مقعد متاح`} tone="success" />
                  {closedTripsCount > 0 ? (
                    <MetaChip label={`${closedTripsCount} غير متاحة`} tone="warning" />
                  ) : null}
                  {soldOutTripsCount > 0 ? (
                    <MetaChip label={`${soldOutTripsCount} ممتلئة`} tone="warning" />
                  ) : null}
                </div>
              </div>
              <SecondaryButton onClick={onGoHome}>تعديل البحث</SecondaryButton>
            </div>
          </AppSurface>

          {availabilityNotice ? (
            <InlineNotice
              tone={availabilityNotice.tone}
              title={availabilityNotice.title}
              text={availabilityNotice.text}
              icon={Sparkles}
            />
          ) : null}

          {showScopeFilters ? (
            <AppSurface className="p-4">
              <SectionHeader
                title="عرض النتائج"
                subtitle="اعرض الرحلات المتاحة فقط أو راجع الرحلات اللي فات وقت الحجز عليها."
              />
              <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {SCOPE_FILTERS.map((item) => {
                  const count =
                    item.key === 'active'
                      ? activeTripsCount
                      : item.key === 'closed'
                      ? closedTripsCount
                      : preparedTrips.length;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setScopeFilter(item.key)}
                      className={`interactive-press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                        scopeFilter === item.key
                          ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
                          : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </AppSurface>
          ) : null}

          {!isSearching && isDirect && preparedTrips.length > 0 ? (
            <AppSurface className="p-4">
              <SectionHeader title="رتّب النتائج" subtitle="اختار طريقة المقارنة اللي تهمك دلوقتي." />
              <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {SORT_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSortFilter(item.key)}
                    className={`interactive-press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                      sortFilter === item.key
                        ? 'border-transparent bg-[var(--info-bg)] text-[var(--brand-strong)] dark:text-[var(--brand)]'
                        : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </AppSurface>
          ) : null}

          {isSearching ? (
            <div className="grid gap-2.5 sm:gap-3 lg:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <TripCardSkeleton key={index} />
              ))}
            </div>
          ) : !isDirect ? (
            <EmptyStateCard
              title="مفيش خط مباشر للمسار ده"
              text={`حالياً مفيش رحلة مباشرة من ${searchParams.from} إلى ${searchParams.to}. جرّب يوم مختلف أو عدّل نقطة التحرك والوصول.`}
              actionLabel="تعديل البحث"
              onAction={onGoHome}
            />
          ) : preparedTrips.length === 0 ? (
            <EmptyStateCard
              title="مفيش رحلات متاحة في اليوم ده"
              text="جرّب يوم مختلف أو عدد ركاب أقل، وإن شاء الله تلاقي اختيارات أنسب."
              actionLabel="تعديل البحث"
              onAction={onGoHome}
            />
          ) : allTripsUnavailable && scopeFilter !== 'closed' ? (
            <EmptyStateCard
              icon={Clock3}
              title={isTodaySearch ? 'مفيش رحلات متاحة النهارده' : 'مفيش رحلات متاحة في اليوم ده'}
              text="كل الرحلات الظاهرة فات وقت الحجز عليها أو انتهت بالفعل. تقدر تراجعها لو محتاج تشوف الأوقات والبيانات فقط."
              actionLabel="عرض الرحلات المقفولة / السابقة"
              onAction={() => setScopeFilter('closed')}
            />
          ) : displayedTrips.length === 0 ? (
            <EmptyStateCard
              title={
                scopeFilter === 'active'
                  ? 'مفيش رحلات متاحة للحجز حالياً'
                  : scopeFilter === 'closed'
                  ? 'مفيش رحلات مقفولة أو سابقة'
                  : 'مفيش نتائج مطابقة'
              }
              text={
                scopeFilter === 'active'
                  ? 'جرّب تعرض الكل أو الرحلات المقفولة لو حابب تراجع الأوقات السابقة.'
                  : scopeFilter === 'closed'
                  ? 'كل النتائج الحالية ما زالت متاحة للحجز.'
                  : 'جرّب فلتر مختلف أو عدّل البحث.'
              }
              actionLabel={scopeFilter !== 'all' ? 'عرض كل النتائج' : 'تعديل البحث'}
              onAction={() => {
                if (scopeFilter !== 'all') setScopeFilter('all');
                else onGoHome();
              }}
            />
          ) : (
            <div className="grid gap-2.5 sm:gap-3 lg:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {displayedTrips.map((trip) => (
                <TripCard
                  key={trip.instanceId || trip.id}
                  trip={trip}
                  onSelect={(selectedTrip) => {
                    const ui = selectedTrip.searchUi || getTripSearchUiState(selectedTrip);

                    if (!ui.isActionable) {
                      showToast(ui.unavailabilityReason || 'الرحلة دي غير متاحة حالياً.', 'warning');
                      return;
                    }

                    onSelectTrip(selectedTrip);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SearchResultsView;
