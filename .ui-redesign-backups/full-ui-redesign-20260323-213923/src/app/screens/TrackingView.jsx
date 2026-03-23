import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BusFront, Coffee, Share2, ShieldAlert, Star } from 'lucide-react';
import { getTripLifecycleStatus, ROUTE_META } from '../utils/travel';

function TrackingView({ ticket, showToast, openModal }) {
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const lifecycle = useMemo(() => {
    if (!ticket) {
      return { key: 'scheduled', progress: 0, statusText: '' };
    }
    return getTripLifecycleStatus(ticket, now);
  }, [ticket, now]);
  const routeMeta = useMemo(() => {
    if (!ticket) {
      return { hasRestStop: false };
    }
    return ROUTE_META[`${ticket.from}-${ticket.to}`] || {
      hasRestStop: ticket.durationHour >= 4.5,
    };
  }, [ticket]);

  if (!ticket) return null;

  const progress = lifecycle.progress;
  const statusText = lifecycle.statusText;
  const isMoving = ['en_route', 'rest_stop', 'final_approach'].includes(lifecycle.key);
  const busTopPosition = `${progress}%`;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden w-full">
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 p-5 pt-8 flex-1 flex flex-col items-center justify-center pb-24 max-w-md mx-auto w-full">
         <div className="flex gap-2 w-full mb-4">
            <button onClick={() => showToast('مشاركة الرحلة هتكون متاحة لما يبقى فيه رابط فعلي للحالة', 'error')} className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-center items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300 active:scale-95 transition"><Share2 className="w-4 h-4" /> شارك الرحلة</button>
            <button onClick={() => showToast('زر الطوارئ ده تجريبي حالياً', 'error')} className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex justify-center items-center shadow-sm active:scale-95 transition"><ShieldAlert className="w-5 h-5" /></button>
         </div>

         {ticket.driver && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 w-full mb-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-2xl">{ticket.driver.img}</div>
                  <div>
                     <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{ticket.driver.name}</h4>
                     <p className="text-[10px] text-slate-500">كابتن الرحلة • {ticket.driver.trips} رحلة سابقة</p>
                  </div>
               </div>
               <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-xs"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {ticket.driver.rating}</div>
            </div>
         )}

         <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 w-full mb-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-indigo-500" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{progress === 100 ? 'وقت الوصول (وصلت)' : 'الوصول المتوقع حسب الجدول'}</p>
            <h2 className="text-4xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{ticket.arrivalTime}</h2>
            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${progress === 100 ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : lifecycle.key === 'rest_stop' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
               {progress < 100 && <span className={`w-2 h-2 rounded-full ${lifecycle.key === 'rest_stop' ? 'bg-orange-500' : 'bg-emerald-500'} ${isMoving ? 'animate-pulse' : ''}`} />}
               {statusText}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">دي متابعة تقديرية حسب الجدول وليست GPS مباشر.</p>
         </div>

         <div className="w-1.5 bg-slate-200 dark:bg-slate-700 h-[300px] relative rounded-full">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-5 h-5 bg-indigo-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-10" />
            <div className="absolute top-0 right-8 text-sm font-black dark:text-white w-24 whitespace-nowrap">{ticket.from}</div>
            <div className="absolute top-0 left-8 text-[10px] font-bold text-slate-400 w-24 text-left whitespace-nowrap" dir="ltr">{ticket.departureTime}</div>

            {routeMeta.hasRestStop && (
              <>
                <div className="absolute top-1/2 right-1/2 translate-x-1/2 w-4 h-4 bg-orange-400 rounded-full border-2 border-slate-50 dark:border-slate-900 z-10 flex items-center justify-center" />
                <div className="absolute top-1/2 right-8 text-xs font-bold text-slate-500 dark:text-slate-400 w-24 whitespace-nowrap -translate-y-1/2">استراحة ريست</div>
                <button onClick={() => openModal('food')} className="absolute top-1/2 left-8 bg-orange-50 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800 -translate-y-1/2 whitespace-nowrap flex items-center gap-1 active:scale-95 transition"><Coffee className="w-3 h-3" /> اطلب للريست</button>
              </>
            )}

            <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-10" />
            <div className="absolute bottom-0 right-8 text-sm font-black dark:text-white w-24 whitespace-nowrap">{ticket.to}</div>
            <div className="absolute bottom-0 left-8 text-[10px] font-bold text-slate-400 w-24 text-left whitespace-nowrap" dir="ltr">{ticket.arrivalTime}</div>

            <div className="absolute top-0 right-0 w-full bg-indigo-500 rounded-t-full transition-all duration-1000" style={{ height: busTopPosition }} />

            <div className={`absolute right-1/2 translate-x-1/2 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/40 z-20 transition-all duration-1000 ${isMoving ? 'animate-bounce' : ''}`} style={{ top: `calc(${busTopPosition} - 24px)` }}>
               <BusFront className="w-6 h-6" />
            </div>
         </div>
      </div>
    </div>
  );
}

export default TrackingView;
