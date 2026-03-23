import React from 'react';
import { Award, X } from 'lucide-react';
import { getLocalDateInputValue } from '../utils/travel';

function PointsModal({ closeModal, wallet: _wallet, setWallet, setTransactions, points, setPoints, showToast }) {
  const handleRedeem = () => {
    if (points < 500) return showToast('محتاج 500 نقطة على الأقل عشان تبدلهم بفلوس', 'error');
    const pointsToRedeem = 500;
    const moneyGained = 50;

    setPoints(p => p - pointsToRedeem);
    setWallet(p => p + moneyGained);
    setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'credit', amount: moneyGained, date: getLocalDateInputValue(), desc: 'استبدال 500 نقطة ولاء' }, ...p]);
    
    showToast(`عاش! بدلت 500 نقطة بـ ${moneyGained} ج.م في محفظتك 💸`, 'success');
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2rem] p-8 shadow-2xl relative text-center">
        <button onClick={closeModal} className="absolute top-4 left-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
           <Award className="w-10 h-10"/>
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">نقاط ولاء طريقي</h3>
        <p className="text-sm font-bold text-slate-500 mb-6">رصيدك الحالي من النقاط اللي جمعتها من رحلاتك.</p>
        
        <div className="text-5xl font-black text-indigo-600 mb-8" dir="ltr">{points} <span className="text-sm text-slate-400">Pts</span></div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 text-sm font-bold text-slate-600 dark:text-slate-300">
           تقدر تبدل كل 500 نقطة بـ 50 ج.م رصيد في محفظتك.
        </div>

        <button onClick={handleRedeem} disabled={points < 500} className={`w-full font-black text-lg py-4 rounded-2xl transition shadow-lg ${points >= 500 ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}>
           استبدل 500 نقطة بـ 50 ج
        </button>
      </div>
    </div>
  );
}

export default PointsModal;
