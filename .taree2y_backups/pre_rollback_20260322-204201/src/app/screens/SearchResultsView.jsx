import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Armchair,
  BusFront,
  Clock,
  Map,
  MapPin,
  Star,
  Tag,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Badge, FilterChip } from '../components/ui/AppPrimitives';
import { EmptyState, GlassCard, LoadingPulseCard, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';
import { getTripBookability } from '../utils/travel';

function SearchResultsView({ searchParams, searchResults, isSearching, onSelectTrip, showToast }) {
  const [filter, setFilter] = useState('all');
  const { trips, isDirect } = searchResults;

  const displayedTrips = useMemo(() => {
    const results = [...trips];
    if (filter === 'cheapest') results.sort((a, b) => a.price - b.price);
    if (filter === 'fastest') results.sort((a, b) => a.durationHour - b.durationHour);
    return results;
  }, [trips, filter]);

  const countAvailable = (trip) =>
    Number.isFinite(Number(trip.availableSeatsCount))
      ? Number(trip.availableSeatsCount)
      : trip.seats?.filter((seat) => seat.status === 'available').length || 0;

  const priceInsight = useMemo(() => {
    if (trips.length === 0) return null;
    const available = trips.reduce((sum, trip) => sum + countAvailable(trip), 0);

    if (available <= 10) {
      return {
        text: 'المقاعد المتاحة قليلة، الأفضل تختار بسرعة قبل ما الإتاحة تقل أكتر.',
        tone: 'amber',
      };
    }
    if (available <= 30) {
      return {
        text: 'الإتاحة متوسطة حالياً، عندك اختيارات كويسة لكن الحجز بدري أحسن.',
        tone: 'indigo',
      };
    }
    return {
      text: 'الإتاحة ممتازة على المسار ده، تقدر تقارن براحتك وتختار الأنسب.',
      tone: 'emerald',
    };
  }, [trips]);

  return (
    <div className="space-y-5 pb-4">
      <GlassCard className="sticky top-0 z-10 border-white/80 bg-white/80 p-5 backdrop-blur-xl dark:bg-slate-950/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <ScreenHeader
            eyebrow="نتايج الحجز"
            title={`${searchParams.from} → ${searchParams.to}`}
            description={`${searchParams.date} • ${searchParams.passengers} أفراد`}
          />

          {!isSearching && isDirect && displayedTrips.length > 0 ? (
            <SoftBadge
              tone="indigo"
              icon={<BusFront className="h-3.5 w-3.5" />}
              text={`${displayedTrips.length} رحلات متاحة`}
            />
          ) : null}
        </div>

        {!isSearching && isDirect && displayedTrips.length > 0 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <FilterChip
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="الكل"
              icon={<Star className="h-3.5 w-3.5" />}
            />
            <FilterChip
              active={filter === 'cheapest'}
              onClick={() => setFilter('cheapest')}
              label="الأرخص"
              icon={<Tag className="h-3.5 w-3.5" />}
            />
            <FilterChip
              active={filter === 'fastest'}
              onClick={() => setFilter('fastest')}
              label="الأسرع"
              icon={<Zap className="h-3.5 w-3.5" />}
            />
          </div>
        ) : null}
      </GlassCard>

      {!isSearching && priceInsight && isDirect && displayedTrips.length > 0 ? (
        <GlassCard className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
            priceInsight.tone === 'amber'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
              : priceInsight.tone === 'emerald'
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'
          }`}>
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              مؤشر الإتاحة
            </div>
            <div className="mt-1 text-sm font-black leading-6 text-slate-700 dark:text-slate-200">
              {priceInsight.text}
            </div>
          </div>
        </GlassCard>
      ) : null}

      {isSearching ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingPulseCard key={index} />
          ))}
        </div>
      ) : !isDirect ? (
        <EmptyState
          icon={<Map />}
          title="مفيش طريق مباشر"
          description={`للأسف مفيش رحلات مباشرة من ${searchParams.from} لـ ${searchParams.to}. جرّب مسار تاني أو عدّل اليوم.`}
          className="max-w-2xl"
        />
      ) : displayedTrips.length === 0 ? (
        <EmptyState
          icon={<BusFront />}
          title="مفيش رحلات في اليوم ده"
          description="جرّب تاريخ تاني أو قلّل عدد الركاب لو بتدور على إتاحة أسرع."
          className="max-w-2xl"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {displayedTrips.map((trip) => {
            const availableSeats = countAvailable(trip);
            const almostFull = availableSeats > 0 && availableSeats <= 5;
            const bookability = getTripBookability(trip);
            const canBookTrip = bookability.canBook;

            return (
              <button
                key={trip.instanceId || trip.id}
                onClick={() => {
                  if (!canBookTrip) return showToast(bookability.reason, 'error');
                  if (availableSeats > 0) return onSelectTrip(trip);
                  return showToast('سجلنا اسمك في قائمة الانتظار، هنبلغك لو في مكان فضي ⏳', 'success');
                }}
                className={`group relative overflow-hidden rounded-[30px] border bg-white p-5 text-right shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] transition dark:bg-slate-950 ${
                  !canBookTrip
                    ? 'cursor-not-allowed border-slate-200 opacity-70 grayscale dark:border-slate-800'
                    : availableSeats === 0
                    ? 'border-orange-200 hover:border-orange-300 dark:border-orange-500/20'
                    : 'border-slate-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_70px_-34px_rgba(79,70,229,0.24)] dark:border-slate-800 dark:hover:border-indigo-500/20'
                }`}
              >
                {trip.badge === 'cheapest' && (
                  <Badge
                    color="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    text="🔥 الأرخص"
                  />
                )}
                {trip.badge === 'fastest' && (
                  <Badge
                    color="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                    text="⚡ الأسرع"
                  />
                )}
                {trip.badge === 'vip' && (
                  <Badge
                    color="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                    text="👑 VIP"
                  />
                )}

                <div className="mb-4 flex items-start justify-between gap-3 pt-8">
                  <div>
                    <div className="text-xs font-black text-slate-500 dark:text-slate-400">
                      {trip.company}
                    </div>
                    <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      {trip.class}
                    </div>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {trip.rating} ★
                  </div>
                </div>

                {(trip.fromStationName || trip.toStationName) ? (
                  <div className="mb-4 rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      {trip.fromStationName || trip.from}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {trip.toStationName || trip.to}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between text-center">
                    <div className="w-[30%]">
                      <div className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
                        {trip.departureTime}
                      </div>
                      <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
                        التحرك
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col items-center px-3">
                      <div className="flex w-full items-center text-slate-300 dark:text-slate-600">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        <div className="mx-1 flex-1 border-t-2 border-dashed border-current" />
                        <BusFront className="h-5 w-5 text-indigo-400" />
                        <div className="mx-1 flex-1 border-t-2 border-dashed border-current" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="mt-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
                        {trip.durationHour} ساعات
                      </div>
                    </div>

                    <div className="w-[30%]">
                      <div className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
                        {trip.arrivalTime}
                      </div>
                      <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
                        الوصول
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black ${
                        !canBookTrip
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                          : availableSeats === 0
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300'
                          : almostFull
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {!canBookTrip ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          {bookability.code === 'cutoff'
                            ? 'الحجز قفل'
                            : bookability.code === 'departed'
                            ? 'الرحلة اتحركت'
                            : 'الرحلة انتهت'}
                        </>
                      ) : availableSeats === 0 ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          انضم للانتظار
                        </>
                      ) : (
                        <>
                          <Armchair className="h-3.5 w-3.5" />
                          {availableSeats} مقاعد
                        </>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-black text-slate-400">يبدأ من</div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-300" dir="ltr">
                        {trip.price} <span className="text-sm">ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchResultsView;
