import React from 'react';
import { Award, CheckCircle2, ChevronRight, Crown, Languages, LogOut, Moon } from 'lucide-react';

function ProfileView({ user, points, subscription, isDark, setIsDark, onLogout, showToast, openModal }) {
  const isGold = points >= 1000;
  
  return (
    <div className="p-5 lg:px-16 space-y-6 flex-1 max-w-[1800px] mx-auto w-full">
       <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">حسابي 👤</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
         <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 flex items-center gap-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-500 text-white rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-lg shadow-indigo-500/30">{user.name.charAt(0)}</div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-1">{user.name}</h3>
              <p className="text-sm font-mono text-slate-400 mb-3" dir="ltr">{user.phone}</p>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-max ${isGold ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400'}`}>
                 {isGold ? <Crown className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                 {isGold ? 'عضو ذهبي' : 'عضو أساسي'}
              </span>
            </div>
         </div>

         <div onClick={()=>openModal('points')} className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center cursor-pointer hover:border-indigo-300 transition group">
            <div className="flex justify-between items-center mb-4">
               <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg"><Award className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform"/> نقاط ولاء طريقي</h4>
               <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors rotate-180" />
            </div>
            <div className="flex items-end justify-between">
               <p className="text-sm font-bold text-slate-500">جمع {1000 - points > 0 ? 1000 - points : 0} نقطة للترقية للذهبي</p>
               <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{points}</div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
               <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (points/1000)*100)}%` }}></div>
            </div>
         </div>
       </div>

       <div className="space-y-3 pt-4 max-w-4xl">
          <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase px-2">إعدادات التطبيق</h4>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             
             <div onClick={()=>openModal('subs')} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center"><Crown className="w-5 h-5 text-purple-600 dark:text-purple-400"/></div><span className="font-bold text-base dark:text-slate-200">باقات التوفير</span></div>
                {subscription !== 'none' ? <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold">باقة مفعلة</span> : <ChevronRight className="w-5 h-5 text-slate-400 rotate-180"/>}
             </div>
             <div className="h-px bg-slate-100 dark:bg-slate-700 mx-5"></div>
             
             <div onClick={()=>setIsDark(!isDark)} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center"><Moon className="w-5 h-5 text-slate-600 dark:text-slate-400"/></div><span className="font-bold text-base dark:text-slate-200">الوضع الليلي (Dark Mode)</span></div>
                <div className={`w-14 h-7 rounded-full relative transition-colors ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-transform ${isDark ? 'right-0.5 -translate-x-7' : 'left-0.5'}`}></div></div>
             </div>
             <div className="h-px bg-slate-100 dark:bg-slate-700 mx-5"></div>
             
             <div onClick={()=>showToast('اللغة الإنجليزية هتنزل في التحديث اللي جاي 🔜', 'success')} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center"><Languages className="w-5 h-5 text-slate-600 dark:text-slate-400"/></div><span className="font-bold text-base dark:text-slate-200">لغة التطبيق</span></div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg">عربي 🇪🇬</span>
             </div>
          </div>
       </div>

       <button onClick={onLogout} className="w-full md:max-w-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95 mt-8">
          <LogOut className="w-5 h-5"/> تسجيل الخروج
       </button>
    </div>
  );
}

export default ProfileView;
