import React from 'react';
import { BusFront, CheckCircle2, Download, Map, QrCode, Ticket, Users } from 'lucide-react';

function TicketView({ ticket, user, onTrack, showToast }) {
  if (!ticket) return null;

  const downloadTicket = () => showToast('نزلنا نسخة تجريبية من التذكرة عندك يا غالي 🖼️', 'success');
  const shareFare = () => showToast('الميزة دي هتكون متاحة لما نظام الأصدقاء والمحفظة يبقوا حقيقيين', 'error');

  return (
    <div className="flex flex-col flex-1 p-5 pt-8 items-center w-full max-w-2xl mx-auto">
       <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative border border-slate-200 dark:border-slate-700 shrink-0 mb-6">
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-center relative">
             <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-slate-50 dark:bg-slate-950 rounded-full border-t border-l border-slate-200 dark:border-slate-700"></div>
             <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-slate-50 dark:bg-slate-950 rounded-full border-t border-r border-slate-200 dark:border-slate-700"></div>
             <div><span className="text-[10px] text-indigo-200 font-bold tracking-widest uppercase block mb-1">Booking Ref (PNR)</span><h2 className="text-2xl font-black font-mono tracking-widest" dir="ltr">{ticket.pnr?.replace('TRQ-','') || ''}</h2></div>
             <div className="text-left">
               <span className={`px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${ticket.status === 'past' ? 'bg-slate-800 text-slate-300' : 'bg-white/20 text-white'}`}>
                 {ticket.status === 'past' ? 'رحلة منتهية' : <><CheckCircle2 className="w-3 h-3"/> صالحة للركوب</>}
               </span>
             </div>
          </div>

          <div className="p-6 relative border-b-2 border-dashed border-slate-200 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                <div className="text-center w-1/3"><span className="text-3xl font-black text-slate-800 dark:text-white block leading-none mb-1">{ticket.from.substring(0,3)}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ticket.from}</span></div>
                <div className="flex-1 flex justify-center"><div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center"><BusFront className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /></div></div>
                <div className="text-center w-1/3"><span className="text-3xl font-black text-slate-800 dark:text-white block leading-none mb-1">{ticket.to.substring(0,3)}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ticket.to}</span></div>
             </div>

             <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">الراكب</span><span className="font-bold text-slate-800 dark:text-slate-200">{user.name}</span></div>
                <div className="text-left"><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">التاريخ</span><span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{ticket.date}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">التحرك</span><span className="font-black text-indigo-600 dark:text-indigo-400 text-lg" dir="ltr">{ticket.departureTime}</span></div>
                <div className="text-left"><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">كراسي</span><span className="font-black text-slate-800 dark:text-slate-200 text-lg" dir="ltr">{ticket.selectedSeats?.join(', ') || ''}</span></div>
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500">الشركة: <span className="text-slate-800 dark:text-slate-200">{ticket.company}</span></span>
                <span className="text-slate-500">الدرجة: <span className="text-slate-800 dark:text-slate-200">{ticket.class}</span></span>
             </div>
          </div>

          <div className={`p-6 bg-white dark:bg-slate-800 flex flex-col items-center ${ticket.status === 'past' ? 'opacity-50' : ''}`}>
             <p className="text-[10px] font-bold text-slate-400 mb-3 text-center">ده رمز صعود تجريبي لعرض شكل التذكرة فقط</p>
             <div className="p-2 border-2 border-slate-100 dark:border-slate-700 rounded-2xl bg-white"><QrCode className="w-28 h-28 text-slate-800" /></div>
          </div>
       </div>

       {ticket.selectedSeats?.length > 1 && ticket.status !== 'past' && (
         <button onClick={shareFare} className="w-full max-w-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 mb-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition active:scale-95 border border-emerald-200 dark:border-emerald-800">
            <Users className="w-5 h-5"/> الميزة دي هتتوفر لاحقاً مع الأصدقاء
         </button>
       )}

       <div className="sticky bottom-0 mt-auto w-full max-w-[400px] flex gap-3 py-4 pb-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pointer-events-none z-20">
          <button onClick={onTrack} className="flex-1 pointer-events-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"><Map className="w-5 h-5"/> تتبع الحافلة</button>
          <button onClick={downloadTicket} className="flex-1 pointer-events-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"><Download className="w-5 h-5"/> حفظ كصورة</button>
       </div>
    </div>
  );
}

export default TicketView;
