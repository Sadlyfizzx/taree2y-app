import React from 'react';
import { Check, Receipt, Ticket } from 'lucide-react';

function InvoiceView({ invoice, onContinue }) {
  return (
    <div className="flex flex-col flex-1 p-5 items-center pt-10 w-full max-w-2xl mx-auto">
       <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 shrink-0">
          <Check className="w-10 h-10" />
       </div>
       <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 shrink-0">تم الدفع بنجاح!</h2>
       <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 shrink-0">جهز شنطتك، رحلتك اتأكدت.</p>

       <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700 relative shrink-0 mb-6">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
             <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             <h3 className="font-bold text-slate-800 dark:text-white">فاتورة الدفع</h3>
          </div>
          
          <div className="space-y-4 text-sm font-bold">
             {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
                   <span>{item.name}</span>
                   <span dir="ltr" className={item.price < 0 ? 'text-emerald-500' : ''}>{item.price} ج.م</span>
                </div>
             ))}
             <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between font-black text-lg text-slate-900 dark:text-white">
                <span>الإجمالي</span>
                <span className="text-indigo-600 dark:text-indigo-400" dir="ltr">{invoice.total} ج.م</span>
             </div>
             
             <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>طريقة الدفع:</span><span className="text-slate-800 dark:text-slate-300">{invoice.method}</span></div>
                <div className="flex justify-between"><span>رقم العملية:</span><span className="font-mono text-slate-800 dark:text-slate-300">{invoice.pnr}</span></div>
                <div className="flex justify-between"><span>التاريخ:</span><span className="text-slate-800 dark:text-slate-300" dir="ltr">{invoice.date}</span></div>
             </div>
          </div>
       </div>

       <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 w-full py-4 pb-8 z-20 pointer-events-none">
         <button onClick={onContinue} className="w-full max-w-[400px] mx-auto bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform flex justify-center items-center gap-2 pointer-events-auto">
            عرض التذكرة <Ticket className="w-5 h-5"/>
         </button>
       </div>
    </div>
  );
}

export default InvoiceView;
