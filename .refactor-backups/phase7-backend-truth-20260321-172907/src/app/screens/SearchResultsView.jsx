import React from 'react';
import { useMemo } from 'react';
import {
  ArrowRightLeft,
  Armchair,
  BusFront,
  Clock,
  Map,
  Star,
  Tag,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Badge, FilterChip } from '../components/ui/AppPrimitives';
import { getTripBookability } from '../utils/travel';

function SearchResultsView({ searchParams, searchResults, isSearching, onSelectTrip, showToast }) {
  const [filter, setFilter] = useState('all'); 
  const { trips, isDirect } = searchResults;

  const displayedTrips = useMemo(() => {
    let res = [...trips];
    if(filter === 'cheapest') res.sort((a,b) => a.price - b.price);
    if(filter === 'fastest') res.sort((a,b) => a.durationHour - b.durationHour);
    return res;
  }, [trips, filter]);

  const priceInsight = useMemo(() => {
     if (trips.length === 0) return null;
     const available = trips.reduce((sum, t) => sum + (t.seats?.filter(s => s.status === 'available').length || 0), 0);

     if (available <= 10) {
       return {
         text: 'المقاعد المتاحة قليلة على الرحلات دي، الأفضل تحجز بدري.',
         color: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300',
         iconColor: 'text-orange-500'
       };
     }

     if (available <= 30) {
       return {
         text: 'فيه إتاحة متوسطة على الرحلات دي حالياً.',
         color: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300',
         iconColor: 'text-indigo-500'
       };
     }

     return {
       text: 'الإتاحة كويسة جداً على الرحلات دي.',
       color: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300',
       iconColor: 'text-emerald-500'
     };
  }, [trips]);

  return (
    <div className="flex flex-col flex-1 pb-10 w-full">
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-20 px-5 lg:px-16 py-4 border-b border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                 {searchParams.from} <ArrowRightLeft className="w-4 h-4 text-slate-400" /> {searchParams.to}
               </h2>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                 {searchParams.date} • {searchParams.passengers} أفراد
               </p>
            </div>
            {!isSearching && isDirect && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-xl">{displayedTrips.length} رحلات</div>
            )}
         </div>
         
         {!isSearching && isDirect && displayedTrips.length > 0 && (
           <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
             <FilterChip active={filter==='all'} onClick={()=>setFilter('all')} label="كله شغال" icon={<Star className="w-3 h-3"/>} />
             <FilterChip active={filter==='cheapest'} onClick={()=>setFilter('cheapest')} label="الأرخص" icon={<Tag className="w-3 h-3"/>} />
             <FilterChip active={filter==='fastest'} onClick={()=>setFilter('fastest')} label="الأسرع" icon={<Zap className="w-3 h-3"/>} />
           </div>
         )}
      </div>

      <div className="p-5 lg:px-16 space-y-4 flex-1 shrink-0 w-full">
        {!isSearching && priceInsight && isDirect && displayedTrips.length > 0 && (
           <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold bg-gradient-to-r border shadow-sm ${priceInsight.color} lg:col-span-2 xl:col-span-3 2xl:col-span-4`}>
              <div className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 ${priceInsight.iconColor}`}><TrendingUp className="w-5 h-5"/></div>
              <div><span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">مؤشر الإتاحة</span>{priceInsight.text}</div>
           </div>
        )}

        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
             {Array.from({length: 4}).map((_, i) => (
               <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 animate-pulse">
                  <div className="flex justify-between mb-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div></div>
                  <div className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-2xl mb-4"></div>
                  <div className="flex justify-between"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/5"></div><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div></div>
               </div>
             ))}
          </div>
        ) : !isDirect ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-900/50 mt-4 max-w-2xl mx-auto w-full">
             <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-4"><Map className="w-8 h-8"/></div>
             <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 mb-2">مفيش طريق مباشر</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">للأسف مفيش رحلات مباشرة من {searchParams.from} لـ {searchParams.to}.</p>
             <p className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg">بنقترح تاخد ترانزيت في القاهرة 🚌</p>
          </div>
        ) : displayedTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 mt-4 max-w-2xl mx-auto w-full">
             <div className="text-6xl mb-4">🏜️</div>
             <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 mb-2">مفيش رحلات للمسار ده</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">مفيش رحلات في اليوم ده للأسف 😔 جرب يوم تاني.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
             {displayedTrips.map((trip) => {
               const availableSeats = trip.seats?.filter(s=>s.status==='available').length || 0;
               const almostFull = availableSeats > 0 && availableSeats <= 5;
               const bookability = getTripBookability(trip);
               const canBookTrip = bookability.canBook;
               
               return (
               <div
                 key={trip.id}
                 onClick={() => {
                   if (!canBookTrip) {
                     showToast(bookability.reason, 'error');
                     return;
                   }
                   if (availableSeats > 0) {
                     onSelectTrip(trip);
                     return;
                   }
                   showToast('سجلنا اسمك في قائمة الانتظار، هنبلغك لو في مكان فضي ⏳', 'success');
                 }}
                 className={`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-[0.98] relative overflow-hidden group ${!canBookTrip ? 'opacity-70 grayscale cursor-not-allowed border-slate-200 dark:border-slate-700' : availableSeats===0 ? 'cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600' : 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600'}`}
               >
                 
                 {trip.badge === 'cheapest' && <Badge color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" text="🔥 الأرخص" />}
                 {trip.badge === 'fastest' && <Badge color="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" text="⚡ الأسرع" />}
                 {trip.badge === 'vip' && <Badge color="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400" text="👑 كبار الزوار" />}

                 <div className="flex justify-between items-center mb-4 mt-2">
                   <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                     {trip.company} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">{trip.class}</span>
                   </div>
                 </div>

                 <div className={`flex items-center justify-between text-center relative py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-4 border border-slate-100 dark:border-slate-700/50 mb-4 transition-colors ${availableSeats===0?'opacity-60 grayscale':'group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20'}`}>
                   <div className="w-1/4"><p className="text-xl font-black text-slate-800 dark:text-slate-100" dir="ltr">{trip.departureTime}</p></div>
                   <div className="flex-1 flex flex-col items-center relative px-2">
                     <div className="w-full flex items-center text-slate-300 dark:text-slate-600">
                       <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-800 z-10"></div>
                       <div className="flex-1 border-t-2 border-dashed border-current mx-1"></div>
                       <BusFront className="w-5 h-5 text-indigo-400 mx-1 bg-slate-50 dark:bg-slate-900 px-0.5 rounded-full" />
                       <div className="flex-1 border-t-2 border-dashed border-current mx-1"></div>
                       <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800 z-10"></div>
                     </div>
                     <span className="text-[10px] font-bold text-slate-500 mt-2 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">{trip.durationHour} ساعات</span>
                   </div>
                   <div className="w-1/4"><p className="text-xl font-black text-slate-800 dark:text-slate-100" dir="ltr">{trip.arrivalTime}</p></div>
                 </div>

                 <div className="flex justify-between items-end">
                   <div className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${!canBookTrip ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : availableSeats === 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : almostFull ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
                      {!canBookTrip ? <><Clock className="w-4 h-4"/> {bookability.code === 'cutoff' ? 'قفل الحجز' : bookability.code === 'departed' ? 'اتحركت' : 'انتهت'}</> : availableSeats === 0 ? <><Clock className="w-4 h-4"/> انضم للانتظار</> : <><Armchair className="w-4 h-4"/> {`${availableSeats} كراسي فاضية`}</>}
                   </div>
                   <div className="text-left">
                      <span className="text-[10px] text-slate-400 block mb-0.5">التذكرة بـ</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{trip.price} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">ج.م</span></span>
                   </div>
                 </div>
               </div>
             )
           })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResultsView;
