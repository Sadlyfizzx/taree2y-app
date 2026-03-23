import React from 'react';
import { Coffee, X } from 'lucide-react';
import { getLocalDateInputValue } from '../utils/travel';

function FoodOrderModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const handleOrder = (price, item) => {
     if(wallet < price) return showToast('رصيدك مش مكفي، اشحن من المحفظة الأول', 'error');
     setWallet(p => p - price);
     setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: price, date: getLocalDateInputValue(), desc: `طلب ${item} في الريست` }, ...p]);
     showToast('طلبك اتسجل! هيستناك سخن لما الباص يقف في الريست ☕', 'success');
     closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Coffee className="w-8 h-8 text-orange-500"/> اطلب للريست</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">اطلب دلوقتي و استلم على طول لما الباص يقف من غير طوابير.</p>
        
        <div className="space-y-4">
           {[{name:'قهوة تركي مظبوط', p:30}, {name:'باتيه جبنة طازة', p:25}, {name:'وجبة مكس جريل خفيفة', p:95}].map((item, i) => (
             <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div><h4 className="font-bold text-base dark:text-white mb-1">{item.name}</h4><span className="text-sm font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{item.p} ج.م</span></div>
                <button onClick={()=>handleOrder(item.p, item.name)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition">اطلب</button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}


// ==========================================
// Login / Register Screen
// ==========================================

export default FoodOrderModal;
