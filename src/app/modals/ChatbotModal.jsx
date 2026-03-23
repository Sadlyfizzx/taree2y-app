import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { SecondaryButton } from '../components/ui/AppPrimitives';

const QUICK_ACTIONS = ['إلغاء تذكرة', 'رصيد المحفظة', 'العروض الحالية'];

function ChatbotModal({ closeModal, user }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `أهلاً بيك يا ${user.name.split(' ')[0]}، أنا مساعد طريقي. أقدر أوضحلك الإلغاء، الرصيد، أو أقولك تلاقي التذكرة فين.`,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    setMessages((currentValue) => [...currentValue, { sender: 'user', text }]);
    setInput('');
    window.setTimeout(() => {
      setMessages((currentValue) => [
        ...currentValue,
        {
          sender: 'bot',
          text: 'تمام، وصلتني الفكرة. النسخة الحالية بتشرح وتوجهك، وللتنفيذ الفعلي ارجع للرحلة أو المحفظة أو الدعم المباشر حسب الطلب.',
        },
      ]);
    }, 700);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ModalShell
      onClose={closeModal}
      title="الدعم والمساعدة"
      subtitle="استخدم الرسائل أو الاختيارات السريعة للوصول للمعلومة أسرع."
      icon={<Bot className="h-6 w-6" />}
      maxWidth="max-w-2xl"
      className="overflow-hidden"
      bodyClassName="flex h-[70vh] flex-col px-0 py-0"
    >
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {QUICK_ACTIONS.map((action) => (
            <SecondaryButton key={action} onClick={() => sendMessage(action)} className="shrink-0">
              {action}
            </SecondaryButton>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((message, index) => (
          <div key={`${message.sender}-${index}`} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[86%] rounded-[24px] px-4 py-3 text-sm font-bold leading-6 ${message.sender === 'user' ? 'rounded-bl-md bg-indigo-600 text-white' : 'rounded-br-md border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200'}`}>
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage(input);
            }}
            placeholder="اكتب سؤالك هنا"
            className="h-14 flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button type="button" onClick={() => sendMessage(input)} className="grid h-14 w-14 place-items-center rounded-[22px] bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default ChatbotModal;
