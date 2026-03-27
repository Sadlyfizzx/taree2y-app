import React, { useEffect, useState } from 'react';
import { BusFront, CheckCircle2, ChevronLeft, Moon, Phone, Sun, User } from 'lucide-react';
import {
  consumeAccountAccessNotice,
  extractRateLimitSeconds,
  getFriendlyAuthError,
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '../../lib/auth';
import { createLogger } from '../../lib/logger';

const log = createLogger('login-screen');

function LoginScreen({ isDark, setIsDark }) {
  const [mode, setMode] = useState('signin');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!cooldownSeconds) return undefined;

    const timerId = window.setInterval(() => {
      setCooldownSeconds((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldownSeconds]);

  useEffect(() => {
    const notice = consumeAccountAccessNotice();
    if (notice) {
      setMessage(notice);
    }
  }, []);

  const handleAuth = async () => {
    if (loading || resetLoading || cooldownSeconds > 0) return;

    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('اكتب الإيميل الأول.');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('الباسورد لازم يبقى 6 حروف أو أكتر.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('اكتب اسمك بالكامل.');
          return;
        }

        const data = await signUpWithEmail({
          email,
          password,
          displayName,
          phone,
        });

        setPassword('');

        if (data.session?.user?.id) {
          setMessage('الحساب اتعمل واتسجل دخولك بنجاح.');
        } else {
          setMode('signin');
          setMessage('الحساب اتعمل. لو تفعيل الإيميل شغال، افتح الإيميل وبعدها سجّل دخول.');
        }
      } else {
        await signInWithEmail({
          email,
          password,
        });
      }
    } catch (authError) {
      log.warn('auth_submit_failed', {
        mode,
        error: authError,
      });

      const nextCooldown = extractRateLimitSeconds(authError?.message || '');

      if (nextCooldown > 0) {
        setCooldownSeconds(nextCooldown);
      }

      setError(getFriendlyAuthError(authError, mode === 'signup' ? 'signup' : 'signin'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (loading || resetLoading || cooldownSeconds > 0) return;

    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('اكتب الإيميل الأول عشان نبعت لك رابط الاسترجاع.');
      return;
    }

    setResetLoading(true);

    try {
      await requestPasswordReset(email);
      setMessage('لو الإيميل مسجل عندنا، بعتنالك رابط استرجاع الباسورد. افتح الرسالة من نفس الجهاز، وبعدها هتقدر تغيّر الباسورد من شاشة الحساب.');
    } catch (authError) {
      log.warn('password_reset_request_failed', { error: authError });

      const nextCooldown = extractRateLimitSeconds(authError?.message || '');
      if (nextCooldown > 0) {
        setCooldownSeconds(nextCooldown);
      }

      setError(getFriendlyAuthError(authError, 'reset_password'));
    } finally {
      setResetLoading(false);
    }
  };

  const actionText =
    loading
      ? 'جاري التنفيذ…'
      : cooldownSeconds > 0
      ? `استنى ${cooldownSeconds} ث`
      : mode === 'signin'
      ? 'سجّل الدخول'
      : 'اعمل الحساب';

  return (
    <div className={`min-h-[100svh] bg-[var(--bg)] px-0 py-0 sm:p-4 md:min-h-[100dvh] md:p-8 ${isDark ? 'dark' : ''}`} dir="rtl">
      <div className="mx-auto grid min-h-[100svh] max-w-6xl overflow-hidden rounded-none border-0 bg-white shadow-none sm:min-h-[calc(100svh-2rem)] sm:rounded-[40px] sm:border sm:border-slate-200 sm:shadow-[0_30px_60px_-36px_rgba(16,35,63,0.45)] dark:bg-slate-950 dark:sm:border-slate-800 md:min-h-[calc(100dvh-2rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] px-6 py-7 text-white md:px-8 md:py-9">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.28), transparent 28%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: 'auto, 24px 24px, 24px 24px' }} />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-white/12 text-white shadow-lg shadow-slate-950/10">
                  <BusFront className="h-7 w-7" />
                </span>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">طريقي</h1>
                  <p className="mt-1 text-sm font-bold text-white/70">رحلات مصر بشكل أوضح وأسهل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDark(!isDark)}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                aria-label="تبديل الوضع"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <div>
              <p className="text-xs font-black tracking-[0.18em] text-white/70">تجربة عربية مصممة صح</p>
              <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight md:text-5xl">
                احجز، راجع، ادفع، واطمّن على رحلتك من أول شاشة.
              </h2>
              <p className="mt-4 max-w-xl text-base font-bold leading-7 text-white/80">
                واجهة هادية ومفهومة، أسماء محطات واضحة، وتتبع للتذكرة والرحلة والمحفظة من غير ما تضيع بين الشاشات.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                'بحث واضح بالمحطات',
                'اختيار مقاعد سهل',
                'محفظة واسترداد مفهومين',
                'تذكرة جاهزة بعد الحجز',
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-white/15 bg-white/10 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span className="text-sm font-black">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-7 md:px-8 md:py-9">
          <div className="mx-auto max-w-md">
            <div className="rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setMessage('');
                  }}
                  className={`rounded-full px-4 py-3 text-sm font-black transition ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setMessage('');
                  }}
                  className={`rounded-full px-4 py-3 text-sm font-black transition ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  إنشاء حساب
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {mode === 'signin' ? 'أهلاً بيك من جديد' : 'خلّي أول رحلة أسهل'}
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                {mode === 'signin'
                  ? 'ادخل على حسابك عشان تكمّل الحجز وتشوف التذاكر والمحفظة.'
                  : 'اعمل حساب مرة واحدة وهتلاقي حجوزاتك ومحفظتك ورصيدك محفوظين على طول.'}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {error ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                  {message}
                </div>
              ) : null}

              {mode === 'signup' ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">الاسم بالكامل</span>
                    <div className="relative">
                      <User className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="اكتب اسمك زي ما تحب يظهر"
                        className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">رقم الموبايل (اختياري)</span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="مثال: 01000000000"
                        className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 pr-12 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        dir="ltr"
                      />
                    </div>
                  </label>
                </div>
              ) : null}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">الإيميل</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  dir="ltr"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">الباسورد</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="6 حروف أو أكتر"
                  className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  dir="ltr"
                />
              </label>

              {mode === 'signin' ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                    لو نسيت الباسورد، ابعت لنفسك رابط استرجاع وبعد فتحه من نفس الجهاز غيّر الباسورد من الحساب.
                  </p>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || resetLoading || cooldownSeconds > 0}
                    className="shrink-0 text-sm font-black text-indigo-700 transition hover:text-indigo-800 disabled:text-slate-400 dark:text-indigo-300 dark:hover:text-indigo-200 dark:disabled:text-slate-500"
                  >
                    {resetLoading ? 'جاري الإرسال…' : 'نسيت الباسورد؟'}
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleAuth}
              disabled={loading || resetLoading || cooldownSeconds > 0}
              aria-busy={loading || undefined}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-indigo-600 px-4 text-base font-black text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              {loading ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/90 border-t-transparent"
                />
              ) : null}
              <span>{actionText}</span>
              {!loading ? <ChevronLeft className="h-5 w-5" /> : null}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginScreen;
