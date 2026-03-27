import React, { useMemo, useState } from 'react';
import { Sparkles, Star, Tag, WifiOff, Zap } from 'lucide-react';
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
  getAvailableSeatsCount,
  getSearchAvailabilityNotice,
} from '../utils/travel';

const FILTERS = [
  { key: 'all', label: 'الكل', icon: <Star className="h-3.5 w-3.5" /> },
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
  isOnline = true,
}) {
  const [filter, setFilter] = useState('all');
  const { trips = [], isDirect } = searchResults;
  const hasSearchContext = Boolean(
    searchParams?.from && searchParams?.to && searchParams?.date,
  );

  const displayedTrips = useMemo(() => {
    const preparedTrips = [...trips].map(withStationNames);

    const sortSoldOutLast = (tripA, tripB) => {
      const soldOutA = getAvailableSeatsCount(tripA) === 0 ? 1 : 0;
      const soldOutB = getAvailableSeatsCount(tripB) === 0 ? 1 : 0;
      return soldOutA - soldOutB;
    };

    if (filter === 'cheapest') {
      preparedTrips.sort((tripA, tripB) => {
        const soldOutOrder = sortSoldOutLast(tripA, tripB);
        if (soldOutOrder !== 0) return soldOutOrder;
        return tripA.price - tripB.price;
      });
      return preparedTrips;
    }

    if (filter === 'fastest') {
      preparedTrips.sort((tripA, tripB) => {
        const soldOutOrder = sortSoldOutLast(tripA, tripB);
        if (soldOutOrder !== 0) return soldOutOrder;
        return tripA.durationHour - tripB.durationHour;
      });
      return preparedTrips;
    }

    if (filter === 'vip') {
      return preparedTrips
        .filter((trip) => String(trip.class || '').includes('VIP'))
        .sort(sortSoldOutLast);
    }

    return preparedTrips.sort(sortSoldOutLast);
  }, [filter, trips]);

  const totalAvailableSeats = useMemo(
    () => displayedTrips.reduce((sum, trip) => sum + getAvailableSeatsCount(trip), 0),
    [displayedTrips],
  );

  const soldOutTripsCount = useMemo(
    () => displayedTrips.filter((trip) => getAvailableSeatsCount(trip) === 0).length,
    [displayedTrips],
  );

  const availabilityNotice = useMemo(
    () => getSearchAvailabilityNotice(displayedTrips),
    [displayedTrips],
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
          {!isOnline ? (
            <InlineNotice
              tone="warning"
              title="أنت أوفلاين حالياً"
              text="آخر نتائج ظهرت لسه قدامك، لكن تحديث الرحلات أو تحميل المقاعد الحالية يحتاج إنترنت."
              icon={WifiOff}
            />
          ) : null}

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

          {!isSearching && isDirect && displayedTrips.length > 0 ? (
            <AppSurface className="p-4">
              <SectionHeader title="رتّب النتائج" subtitle="اختار طريقة المقارنة اللي تهمك دلوقتي." />
              <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`interactive-press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                      filter === item.key
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
          ) : displayedTrips.length === 0 ? (
            <EmptyStateCard
              title="مفيش رحلات متاحة في اليوم ده"
              text="جرّب يوم مختلف أو عدد ركاب أقل، وإن شاء الله تلاقي اختيارات أنسب."
              actionLabel="تعديل البحث"
              onAction={onGoHome}
            />
          ) : (
            <div className="grid gap-2.5 sm:gap-3 lg:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {displayedTrips.map((trip) => (
                <TripCard
                  key={trip.instanceId || trip.id}
                  trip={trip}
                  onSelect={(selectedTrip) => {
                    const availableSeats = getAvailableSeatsCount(selectedTrip);

                    if (availableSeats === 0) {
                      showToast('لا توجد مقاعد متاحة على الرحلة دي حالياً.', 'error');
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
