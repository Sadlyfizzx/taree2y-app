import React, { useMemo, useState } from 'react';
import { Sparkles, Star, Tag, Zap } from 'lucide-react';
import BookingProgress from '../components/ui/BookingProgress';
import TripCard from '../components/ui/TripCard';
import { AppSurface, MetaChip, PageHeading } from '../components/ui/AppPrimitives';
import { EmptyStateCard, InlineNotice, TripCardSkeleton } from '../components/ui/StateBlocks';
import { withStationNames } from '../utils/stations';
import { formatDateText } from '../utils/formatting';
import InlineArrow from '../components/ui/InlineArrow';

function SearchResultsView({ searchParams, searchResults, isSearching, onSelectTrip, showToast }) {
  const [filter, setFilter] = useState('all');
  const { trips = [], isDirect } = searchResults;

  const displayedTrips = useMemo(() => {
    const preparedTrips = [...trips].map(withStationNames);

    if (filter === 'cheapest') {
      preparedTrips.sort((tripA, tripB) => tripA.price - tripB.price);
    }

    if (filter === 'fastest') {
      preparedTrips.sort((tripA, tripB) => tripA.durationHour - tripB.durationHour);
    }

    if (filter === 'vip') {
      return preparedTrips.filter((trip) => String(trip.class || '').includes('VIP'));
    }

    return preparedTrips;
  }, [filter, trips]);

  const totalAvailableSeats = useMemo(
    () =>
      displayedTrips.reduce((sum, trip) => {
        if (Number.isFinite(Number(trip.availableSeatsCount))) {
          return sum + Number(trip.availableSeatsCount);
        }
        return sum + (trip.seats?.filter((seat) => seat.status === 'available').length || 0);
      }, 0),
    [displayedTrips],
  );

  const availabilityNotice = useMemo(() => {
    if (!displayedTrips.length) return null;

    if (totalAvailableSeats <= 10) {
      return {
        tone: 'warning',
        title: 'الإتاحة قليلة على الرحلات دي',
        text: 'لو الرحلة مناسبة ليك، الأفضل تختار بسرعة قبل ما المقاعد تخلص.',
      };
    }

    if (totalAvailableSeats <= 30) {
      return {
        tone: 'info',
        title: 'فيه اختيارات كويسة',
        text: 'تقدر تقارن براحتك، لكن بعض الرحلات بدأت تتملي بالفعل.',
      };
    }

    return {
      tone: 'success',
      title: 'الإتاحة مريحة حاليًا',
      text: 'قدامك أكتر من اختيار، فركز على الوقت والمحطة والسعر المناسب ليك.',
    };
  }, [displayedTrips.length, totalAvailableSeats]);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الخطوة ١ من ٤"
        title="اختار الرحلة المناسبة"
        subtitle="قارِن بين وقت التحرك، اسم المحطة، السعر، والإتاحة قبل ما تدخل على المقاعد."
      />

      <AppSurface className="p-4 sm:p-5">
        <BookingProgress current="results" />
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex flex-wrap items-center gap-3 text-xl font-black text-slate-900 dark:text-white">
              <span>{searchParams.from}</span>
              <InlineArrow />
              <span>{searchParams.to}</span>
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              {formatDateText(searchParams.date)} · {searchParams.passengers} {searchParams.passengers === 1 ? 'راكب' : 'ركاب'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MetaChip label={`${displayedTrips.length} رحلة`} tone="brand" />
            <MetaChip label={`${totalAvailableSeats} مقعد متاح`} tone="success" />
          </div>
        </div>
      </AppSurface>

      {availabilityNotice ? (
        <InlineNotice tone={availabilityNotice.tone} title={availabilityNotice.title} text={availabilityNotice.text} icon={Sparkles} />
      ) : null}

      {!isSearching && isDirect && displayedTrips.length > 0 ? (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'الكل', icon: <Star className="h-3.5 w-3.5" /> },
            { key: 'cheapest', label: 'الأوفر', icon: <Tag className="h-3.5 w-3.5" /> },
            { key: 'fastest', label: 'الأسرع', icon: <Zap className="h-3.5 w-3.5" /> },
            { key: 'vip', label: 'VIP', icon: <Sparkles className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-all ${
                filter === item.key
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {isSearching ? (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <TripCardSkeleton key={index} />
          ))}
        </div>
      ) : !isDirect ? (
        <EmptyStateCard
          title="مفيش خط مباشر للمسار ده"
          text={`حالياً مفيش رحلة مباشرة من ${searchParams.from} إلى ${searchParams.to}. جرّب يوم مختلف أو عدّل نقطة التحرك والوصول.`}
        />
      ) : displayedTrips.length === 0 ? (
        <EmptyStateCard
          title="مفيش رحلات متاحة في اليوم ده"
          text="جرب تغيّر اليوم أو عدد الركاب، وإن شاء الله تلاقي اختيارات أنسب."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {displayedTrips.map((trip) => (
            <TripCard
              key={trip.instanceId || trip.id}
              trip={trip}
              onSelect={(selectedTrip) => {
                const availableSeats = Number.isFinite(Number(selectedTrip.availableSeatsCount))
                  ? Number(selectedTrip.availableSeatsCount)
                  : selectedTrip.seats?.filter((seat) => seat.status === 'available').length || 0;

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
    </div>
  );
}

export default SearchResultsView;
