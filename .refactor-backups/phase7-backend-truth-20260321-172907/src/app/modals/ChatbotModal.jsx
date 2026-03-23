import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';

function ChatbotModal({ closeModal, user }) {
  const [messages, setMessages] = useState([{sender: 'bot', text: `أهلاً بيك يا ${user.name.split(' ')[0]}! أنا طارق، المساعد الذكي لطريقي 🤖، أقدر أساعدك تلغي تذكرة أو تعرف عروضنا. تحب أساعدك في إيه؟`}]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const handleSend = () => {
     if(!input.trim()) return;
     setMessages(p => [...p, {sender: 'user', text: input}]);
     setInput('');
     setTimeout(() => {
       setMessages(p => [...p, {sender: 'bot', text: 'فهمتك! فريقنا شغال بيطور الذكاء الاصطناعي عشان ينفذ كل طلباتك هنا قريب جداً. في حاجة تانية محتاجها؟'}]);
     }, 1000);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in-down p-4">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-[500px] h-[85vh] rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden">
        <div className="bg-white dark:bg-slate-800 p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 shadow-sm z-10">
           <div className="flex items-center gap-3"><div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center"><Bot className="w-6 h-6"/></div><div><h3 className="font-black text-slate-800 dark:text-white text-base">طارق (المساعد الذكي)</h3><p className="text-xs text-emerald-500 font-bold">متصل الآن يجاوبك</p></div></div>
           <button onClick={closeModal} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:bg-slate-200 transition"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[80%] p-4 text-sm font-bold leading-relaxed ${m.sender==='user'?'bg-indigo-600 text-white rounded-2xl rounded-tl-sm shadow-md':'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tr-sm shadow-sm'}`}>{m.text}</div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-3 items-center z-10">
           <input type="text" placeholder="اكتب رسالتك لطارق..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSend()} className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-5 h-14 text-sm font-bold outline-none focus:border-indigo-500 dark:text-white" />
           <button onClick={handleSend} className="w-14 h-14 bg-indigo-600 text-white rounded-full flex justify-center items-center active:scale-95 shadow-md shadow-indigo-600/30 transition-transform"><Send className="w-5 h-5 rotate-180"/></button>
        </div>
      </div>
    </div>
  );
}

export default ChatbotModal;
