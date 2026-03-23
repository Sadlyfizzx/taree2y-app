import React from 'react';
import {
  ArrowRightLeft,
  Bot,
  BusFront,
  Calendar,
  Car,
  Copy,
  Crown,
  MapPin,
  Package,
  Star,
  Sun,
  Tag,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { CITIES, getLocalDateInputValue } from '../utils/travel';

function HomeView({ searchParams, setSearchParams, onSearch, showToast, onPromoSearch, openModal }) {
  const handleSwap = () => setSearchParams(p => ({ ...p, from: p.to, to: p.from }));
  const todayDate = getLocalDateInputValue();

  const copyPromo = (code) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
    } else {
      let ta = document.createElement("textarea");
      ta.value = code; ta.style.position = "fixed"; document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
    }
    showToast(`نسخنا كود الخصم (${code}) بنجاح! ✂️`, 'success');
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Hero Section */}
      <div className="bg-indigo-600 dark:bg-slate-900 md:rounded-[2.5rem] px-5 lg:px-16 pt-10 pb-24 md:m-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0">
         <h2 className="text-3xl font-black text-white mb-2 leading-tight relative z-10">على فين <br/>يا بطل؟ 👋</h2>
         <p className="text-indigo-200 text-base relative z-10">طريقي معاك في كل مكان في مصر.</p>
         <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none md:scale-150 transform origin-bottom-left scale-x-[-1]">
            <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,75.3,39.6C65,52.3,53,63,39.4,70.5C25.8,78,10.6,82.3,-4.2,88.7C-19,95.1,-33.4,103.6,-45.3,98.1C-57.2,92.6,-66.6,73.1,-74.6,56.1C-82.6,39.1,-89.2,24.6,-91.1,9.4C-93,-5.8,-90.2,-21.7,-82.9,-35.1C-75.6,-48.5,-63.8,-59.4,-50.2,-66.8C-36.6,-74.2,-21.2,-78.1,-5.6,-70C10,-61.9,20.2,-62.4,30.6,-83.6L44.7,-76.4Z" transform="translate(100 100)" /></svg>
         </div>
      </div>

      {/* Main Search Card */}
      <div className="px-5 lg:px-16 -mt-16 relative z-10 shrink-0 w-full mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
             <div className="md:col-span-2 relative bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col md:flex-row p-1">
                <div className="relative flex-1">
                   <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"/>
                   <select value={searchParams.from} onChange={e=>setSearchParams(p=>({...p, from:e.target.value}))} className="w-full bg-transparent h-14 pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none appearance-none">
                     <option value="" disabled>هتتحرك منين؟</option>
                     {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                
                <div className="h-px md:h-10 md:w-px bg-slate-200 dark:bg-slate-700 mx-4 md:my-auto shrink-0"></div>
                
                <div className="relative flex-1">
                   <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5 pointer-events-none"/>
                   <select value={searchParams.to} onChange={e=>setSearchParams(p=>({...p, to:e.target.value}))} className="w-full bg-transparent h-14 pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none appearance-none">
                     <option value="" disabled>رايح فين؟</option>
                     {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>

                <button onClick={handleSwap} className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-full shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-transform z-10">
                   <ArrowRightLeft className="w-5 h-5 rotate-90 md:rotate-0" />
                </button>
             </div>

             <div className="relative group md:col-span-1">
                <Calendar className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <input type="date" value={searchParams.date} min={todayDate} onChange={e=>setSearchParams(p=>({...p, date:e.target.value}))} className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500 transition" />
             </div>
             
             <div className="relative group md:col-span-1">
                <Users className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <select value={searchParams.passengers} onChange={e=>setSearchParams(p=>({...p, passengers:Number(e.target.value)}))} className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500 transition appearance-none">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} أفراد</option>)}
                </select>
             </div>
          </div>

          <button onClick={onSearch} className="w-full md:w-auto md:px-12 md:mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-4 rounded-2xl mt-6 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2">
            يلا بينا ندور 🚀
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-5 lg:px-16 mt-8 mb-4 w-full shrink-0">
        <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-4">خدمات السفر 💼</h3>
        <div className="flex md:grid md:grid-cols-5 xl:grid-cols-5 gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x w-full">
          {[ {i:Package, l:'إرسال طرد', m:'courier', c:'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}, 
             {i:Crown, l:'باقات التوفير', m:'subs', c:'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}, 
             {i:Car, l:'مشاركة سيارات', m:'carpool', c:'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'}, 
             {i:Users, l:'تأجير باص', m:'charter', c:'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'},
             {i:Bot, l:'مساعد و دعم', m:'bot', c:'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'} 
          ].map((s, idx) => (
            <div key={idx} onClick={()=> s.m === 'carpool' || s.m === 'charter' ? showToast('الخدمة دي هتنزل قريب جداً 🔜', 'success') : openModal(s.m)} className="min-w-[120px] w-full flex flex-col items-center gap-3 cursor-pointer group active:scale-95 transition-transform bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 snap-center">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center ${s.c} shadow-inner`}>
                 <s.i className="w-7 h-7" />
              </div>
              <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 text-center leading-tight whitespace-nowrap">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Offers Slider */}
      <div className="px-5 lg:px-16 mt-2 mb-8 w-full shrink-0">
         <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-4">عروض لقطة 🎁</h3>
         <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-6 snap-x w-full">
            <div onClick={()=>copyPromo('AHLAN50')} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1"><Copy className="w-3 h-3"/> انسخ: AHLAN50</span>
                 <h4 className="font-black text-2xl mb-1">50 ج.م خصم!</h4>
                 <p className="text-sm font-medium text-orange-50">على أول رحلة تطلبها من طريقي</p>
               </div>
               <Tag className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform -rotate-12" />
            </div>
            
            <div onClick={()=>onPromoSearch({ from: 'القاهرة', to: 'مرسى مطروح', date: todayDate, passengers: 1 })} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1">احجز مطروح فوراً <ChevronLeft className="w-3 h-3"/></span>
                 <h4 className="font-black text-2xl mb-1">فورمة الساحل 🏖️</h4>
                 <p className="text-sm font-medium text-blue-50">صيفنا أحلى في مطروح بأسعار زمان</p>
               </div>
               <Sun className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform rotate-45" />
            </div>

            <div onClick={()=>copyPromo('SA3EED15')} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1"><Copy className="w-3 h-3"/> انسخ: SA3EED15</span>
                 <h4 className="font-black text-2xl mb-1">أهالي الصعيد 🌴</h4>
                 <p className="text-sm font-medium text-emerald-50">خصم 15% على رحلات الصعيد</p>
               </div>
               <Star className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform rotate-45" />
            </div>
         </div>
      </div>
    </div>
  );
}

export default HomeView;
