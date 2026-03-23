import React from 'react';
import { useState } from 'react';
import { BusFront, ChevronLeft, Moon, Phone, Sun, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function LoginScreen({ isDark, setIsDark }) {
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) return setError('اكتب الإيميل');
    if (!password.trim() || password.length < 6) {
      return setError('الباسورد لازم يكون 6 حروف أو أكتر');
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setLoading(false);
          return setError('اكتب اسمك');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        const userId = data.user?.id;
        if (userId) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            display_name: displayName.trim(),
            phone: phone.trim() || null,
          });

          if (profileError) throw profileError;
        }

        if (data.session) {
          setMessage('تم إنشاء الحساب وتسجيل الدخول بنجاح');
        } else {
          setMessage('تم إنشاء الحساب. لو تأكيد الإيميل شغال، افتح الإيميل وبعدها سجّل دخول.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || 'حصل خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-[100dvh] w-full flex items-center justify-center p-5 transition-colors duration-300 ${isDark ? 'dark bg-slate-950' : 'bg-slate-100'}`} dir="rtl">
      <div className="w-full max-w-[428px] md:max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <button onClick={() => setIsDark(!isDark)} className="absolute top-6 left-6 w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 transition z-20">
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>

        <div className="text-center mt-10 mb-12 relative z-10">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30 transform rotate-6 hover:rotate-0 transition-transform duration-500">
            <BusFront className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">طريقي</h1>
          <p className="text-base font-bold text-slate-500 dark:text-slate-400">
            {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </p>
        </div>

        <div className="space-y-5 relative z-10">
          {error && <p className="text-rose-500 text-sm font-bold text-center bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg">{error}</p>}
          {message && <p className="text-emerald-600 text-sm font-bold text-center bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">{message}</p>}

          {mode === 'signup' && (
            <>
              <div className="relative group">
                <User className="w-6 h-6 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="الاسم بالكامل..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-16 pr-14 pl-4 text-base font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition placeholder:font-normal"
                />
              </div>

              <div className="relative group">
                <Phone className="w-6 h-6 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="رقم الموبايل (اختياري)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-16 pr-14 pl-4 text-base font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition placeholder:font-normal text-right"
                  dir="ltr"
                />
              </div>
            </>
          )}

          <div className="relative group">
            <input
              type="email"
              placeholder="الإيميل"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-16 px-4 text-base font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition placeholder:font-normal"
              dir="ltr"
            />
          </div>

          <div className="relative group">
            <input
              type="password"
              placeholder="الباسورد"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl h-16 px-4 text-base font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition placeholder:font-normal"
              dir="ltr"
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 text-white font-black text-xl py-5 rounded-2xl shadow-lg shadow-slate-900/20 dark:shadow-indigo-600/30 transition-all active:scale-95 flex justify-center items-center gap-2 mt-6"
          >
            {loading ? '...' : mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setMessage('');
            }}
            className="w-full text-indigo-600 dark:text-indigo-400 font-bold text-sm"
          >
            {mode === 'signin' ? 'ما عندكش حساب؟ اعمل حساب جديد' : 'عندك حساب بالفعل؟ سجل دخول'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
