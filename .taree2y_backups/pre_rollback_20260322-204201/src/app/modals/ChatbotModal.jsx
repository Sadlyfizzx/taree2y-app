import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { ModalShell, SoftBadge } from '../components/ui/Taree2yUI';

function ChatbotModal({ closeModal, user }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `أهلاً بيك يا ${user.name.split(' ')[0]}! أنا طارق، المساعد الذكي لطريقي 🤖. أقدر أساعدك تلغي تذكرة أو تعرف عروضنا. تحب أساعدك في إيه؟`,
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'فهمتك! فريقنا شغال بيطور الذكاء الاصطناعي عشان ينفذ كل طلباتك هنا قريب جداً. في حاجة تانية محتاجها؟',
        },
      ]);
    }, 1000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ModalShell
      tone="indigo"
      title="طارق • المساعد الذكي"
      subtitle="دردشة تجريبية لعرض شكل المساعد داخل طريقي."
      icon={<Bot />}
      closeModal={closeModal}
      maxWidth="max-w-[560px]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SoftBadge tone="emerald" text="متصل الآن" />
          <SoftBadge tone="indigo" text="نسخة تجريبية" />
        </div>

        <div className="hide-scrollbar h-[50vh] space-y-4 overflow-y-auto rounded-[28px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm font-black leading-7 ${
                  message.sender === 'user'
                    ? 'rounded-tl-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white'
                    : 'rounded-tr-sm border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
          <input
            type="text"
            placeholder="اكتب رسالتك لطارق..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="h-12 flex-1 bg-transparent px-3 text-sm font-black text-slate-900 outline-none placeholder:font-bold placeholder:text-slate-400 dark:text-white"
          />
          <button
            onClick={handleSend}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white transition active:scale-95"
          >
            <Send className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default ChatbotModal;
