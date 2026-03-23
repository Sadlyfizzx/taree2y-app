import { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AppLogo, GlassCard, SoftBadge } from '../components/ui/Taree2yUI';

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

  const InputWrap = ({ icon, children }) => (
    <div className="group relative">
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-500">
        {icon}
      </div>
      {children}
    </div>
  );

  return (
    <div className={`${isDark ? 'dark' : ''}`} dir="rtl">
      <div className="min-h-[100dvh] bg-transparent px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto grid min-h-[100dvh] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.16),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_36%)]" />
            <div className="relative z-10">
              <div className="mb-12 flex items-start justify-between">
                <AppLogo />
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>

              <div className="max-w-xl">
                <SoftBadge
                  tone="indigo"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  text="سوبر آب للنقل والسفر في مصر"
                />
                <h1 className="mt-5 text-5xl font-black leading-[1.15] tracking-tight text-slate-900 dark:text-white">
                  احجز،
                  <span className="text-indigo-600 dark:text-indigo-300"> ادفع، </span>
                  وتتبع رحلتك من مكان واحد.
                </h1>
                <p className="mt-5 max-w-lg text-lg font-bold leading-8 text-slate-500 dark:text-slate-400">
                  طريقي بيجمع حجز التذاكر، المحفظة، التتبع، والعروض في تجربة عربية ناعمة وسهلة على الموبايل والديسكتوب.
                </p>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-3">
              {[
                { icon: BusFront, title: 'حجز سريع', desc: 'نتايج واضحة ومقاعد مرئية.' },
                { icon: ShieldCheck, title: 'دفع آمن', desc: 'محفظة متزامنة وتجربة مرنة.' },
                { icon: Sparkles, title: 'عروض وخدمات', desc: 'باقات، طرود، نقاط، ومساعد ذكي.' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/65"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{item.title}</div>
                  <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="mx-auto flex w-full max-w-[520px] flex-col justify-center p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <AppLogo />
              <button
                onClick={() => setIsDark(!isDark)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-300"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <div className="mb-8">
              <SoftBadge
                tone={mode === 'signin' ? 'emerald' : 'amber'}
                text={mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              />
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {mode === 'signin' ? 'أهلاً بيك من جديد 👋' : 'يلا نجهز حسابك على طريقي'}
              </h2>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                استخدم الإيميل والباسورد للدخول، وكل بياناتك هتتزامن مع المحفظة والتذاكر.
              </p>
            </div>

            <div className="space-y-4">
              {error ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {message}
                </div>
              ) : null}

              {mode === 'signup' ? (
                <>
                  <InputWrap icon={<User className="h-5 w-5" />}>
                    <input
                      type="text"
                      placeholder="الاسم بالكامل"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-16 w-full rounded-[24px] border border-slate-200 bg-white pr-14 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </InputWrap>

                  <InputWrap icon={<Phone className="h-5 w-5" />}>
                    <input
                      type="tel"
                      placeholder="رقم الموبايل (اختياري)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-16 w-full rounded-[24px] border border-slate-200 bg-white pr-14 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      dir="ltr"
                    />
                  </InputWrap>
                </>
              ) : null}

              <InputWrap icon={<Mail className="h-5 w-5" />}>
                <input
                  type="email"
                  placeholder="الإيميل"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-16 w-full rounded-[24px] border border-slate-200 bg-white pr-14 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  dir="ltr"
                />
              </InputWrap>

              <InputWrap icon={<ShieldCheck className="h-5 w-5" />}>
                <input
                  type="password"
                  placeholder="الباسورد"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-16 w-full rounded-[24px] border border-slate-200 bg-white pr-14 pl-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  dir="ltr"
                />
              </InputWrap>

              <button
                onClick={handleAuth}
                disabled={loading}
                className="mt-3 flex h-16 w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-600 text-lg font-black text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'جاري التنفيذ...' : mode === 'signin' ? 'دخول على طريقي' : 'إنشاء الحساب'}
                <ArrowLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                  setMessage('');
                }}
                className="w-full rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-black text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-300 dark:hover:border-indigo-500/20 dark:hover:bg-indigo-500/10"
              >
                {mode === 'signin' ? 'ما عندكش حساب؟ اعمل حساب جديد' : 'عندك حساب بالفعل؟ سجل دخول'}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
