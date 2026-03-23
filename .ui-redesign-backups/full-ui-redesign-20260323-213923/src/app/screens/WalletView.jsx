import React from 'react';
import { ArrowDown, CreditCard, Phone, Plus, QrCode, Send, ShieldCheck, Ticket } from 'lucide-react';

function WalletView({ wallet, setWallet: _setWallet, transactions, setTransactions: _setTransactions, showToast, openTopUp }) {
  return (
    <div className="p-5 lg:px-16 space-y-6 flex-1 max-w-[1800px] mx-auto w-full relative">
      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">المحفظة التجريبية 💰</h2>

      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden max-w-4xl mx-auto">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-20 -mt-20 blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500 opacity-20 rounded-full -mr-10 -mb-10 blur-2xl"></div>
        <div className="relative z-10 flex justify-between items-start mb-8">
           <div><p className="text-indigo-200 text-sm font-bold mb-2 uppercase tracking-widest">Demo Wallet</p><div className="text-5xl font-black font-mono tracking-tight" dir="ltr">{wallet.toLocaleString()} EGP</div></div>
           <ShieldCheck className="w-10 h-10 text-indigo-300 opacity-80" />
        </div>
        <div className="relative z-10 flex gap-4 max-w-sm">
           <button onClick={openTopUp} className="flex-1 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-base font-bold backdrop-blur-sm transition flex items-center justify-center gap-2 active:scale-95"><Plus className="w-5 h-5" /> شحن تجريبي</button>
           <button onClick={() => showToast('الدفع بالـ QR غير متاح في النسخة التجريبية', 'error')} className="w-16 bg-white/10 hover:bg-white/20 py-4 rounded-2xl flex items-center justify-center backdrop-blur-sm transition active:scale-95"><QrCode className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
         {[{ i: CreditCard, l: 'فيزا' }, { i: Phone, l: 'فودافون كاش' }, { i: Send, l: 'إنستاباي' }].map((item, idx) => (
           <button key={idx} onClick={openTopUp} className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition active:scale-95">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center"><item.i className="w-6 h-6" /></div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.l}</span>
           </button>
         ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 max-w-4xl mx-auto">
         <h3 className="font-black text-slate-800 dark:text-slate-100 mb-2 text-lg">تحركات المحفظة</h3>
         <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">بيانات المحفظة والسجل متزامنة بين أجهزتك من خلال Supabase.</p>
         {transactions.length === 0 ? (
            <p className="text-center text-slate-500 py-10">مفيش أي حركات في المحفظة لسه.</p>
         ) : (
            <div className="space-y-4">
               {transactions.map((txn) => (
                  <div key={txn.id} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-4 last:border-0 last:pb-0">
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${txn.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'}`}>
                           {txn.type === 'credit' ? <ArrowDown className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                        </div>
                        <div><div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-0.5">{txn.desc}</div><div className="text-[10px] font-bold text-slate-400" dir="ltr">{txn.date}</div></div>
                     </div>
                     <div className={`font-black font-mono text-lg ${txn.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`} dir="ltr">{txn.type === 'credit' ? '+' : '-'}{txn.amount}</div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}

// ==========================================
// 5. Modals & Extra Services Components
// ==========================================

export default WalletView;
