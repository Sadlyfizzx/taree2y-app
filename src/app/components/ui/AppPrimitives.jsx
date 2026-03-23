import React from 'react';

function DesktopNavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} title={collapsed ? label : ''} className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-4 px-4 py-4'} rounded-2xl transition-all duration-300 font-bold ${active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6 shrink-0' })}
      {!collapsed && <span className="text-base truncate">{label}</span>}
    </button>
  );
}

function BottomNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-[72px] h-[56px] relative transition-all group">
      {active && <div className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-b-full transition-all"></div>}
      <div className={`transition-all duration-300 ${active ? 'text-indigo-600 dark:text-indigo-400 -translate-y-1' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{React.cloneElement(icon, { className: 'w-6 h-6 mb-1 mx-auto' })}</div>
      <span className={`text-[10px] font-bold transition-all ${active ? 'text-indigo-600 dark:text-indigo-400 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </button>
  );
}

function FilterChip({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${active ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
      {icon} {label}
    </button>
  );
}

function Badge({ color, text }) {
  return <div className={`absolute top-0 right-0 ${color} text-[10px] font-black px-3 py-1.5 rounded-bl-2xl shadow-sm z-10`}>{text}</div>;
}

export { DesktopNavItem, BottomNavItem, FilterChip, Badge };
