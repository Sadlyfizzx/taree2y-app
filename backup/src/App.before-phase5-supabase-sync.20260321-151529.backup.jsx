import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import { readJSON, readNumber, demoKey } from './utils/storage';
import { 
  Home, Ticket, Wallet as WalletIcon, User, MapPin, Calendar, Users, 
  ArrowRightLeft, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  QrCode, CreditCard, Armchair, BusFront, ShieldCheck, Download,
  Filter, Star, Map, Moon, Sun, Languages, LogOut, 
  TrendingUp, Tag, Send, Phone, ArrowDown, Info as InfoIcon, Check, Zap, Copy, Plus, X, Smartphone, Receipt, Coffee, AlertTriangle, Package, Car, Bot, Crown, Award, Share2, ShieldAlert, Building, Menu, Clock, Accessibility, UserSquare
} from 'lucide-react';

// ==========================================
// 1. Data Generators & Config
// ==========================================
const CITIES = ["القاهرة", "الإسكندرية", "مرسى مطروح", "بورسعيد", "الإسماعيلية", "السويس", "دمياط", "شرم الشيخ", "الغردقة", "دهب", "طابا", "المنصورة", "سوهاج", "قنا", "الأقصر", "أسوان"];

const DIRECT_ROUTES = {
  'القاهرة-الإسكندرية': 150, 'الإسكندرية-القاهرة': 150, 'القاهرة-المنصورة': 120, 'المنصورة-القاهرة': 120,
  'القاهرة-بورسعيد': 140, 'بورسعيد-القاهرة': 140, 'القاهرة-الإسماعيلية': 100, 'الإسماعيلية-القاهرة': 100,
  'القاهرة-السويس': 110, 'السويس-القاهرة': 110, 'القاهرة-دمياط': 160, 'دمياط-القاهرة': 160,
  'القاهرة-مرسى مطروح': 300, 'مرسى مطروح-القاهرة': 300, 'الإسكندرية-مرسى مطروح': 180, 'مرسى مطروح-الإسكندرية': 180,
  'القاهرة-الغردقة': 350, 'الغردقة-القاهرة': 350, 'القاهرة-شرم الشيخ': 400, 'شرم الشيخ-القاهرة': 400,
  'القاهرة-دهب': 450, 'دهب-القاهرة': 450, 'القاهرة-سوهاج': 320, 'سوهاج-القاهرة': 320,
  'القاهرة-قنا': 400, 'قنا-القاهرة': 400, 'القاهرة-الأقصر': 500, 'الأقصر-القاهرة': 500,
  'القاهرة-أسوان': 600, 'أسوان-القاهرة': 600, 'الأقصر-أسوان': 150, 'أسوان-الأقصر': 150,
};

const COMPANY_FEES = { 'جو باص': 0.20, 'سوبر جيت': 0.15, 'بلو باص': 0.25 };

const DRIVERS = [
  { name: 'أسطى محمود سعيد', rating: 4.8, trips: 342, img: '👨🏽‍✈️' },
  { name: 'كابتن أحمد علي', rating: 4.6, trips: 156, img: '👨🏻‍✈️' },
  { name: 'كابتن سيد رمضان', rating: 4.9, trips: 520, img: '👨🏾‍✈️' }
];

const getLocalDateInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().split('T')[0];
};

const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
};

const createSeededRandom = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const addMinutesToTime = (timeStr, minutesToAdd) => {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  const normalized = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const getDateAtLocalMidnight = (dateStr) => new Date(`${dateStr}T00:00:00`);

const getDaysUntilTrip = (tripDate) => {
  const today = getDateAtLocalMidnight(getLocalDateInputValue());
  const tripDay = getDateAtLocalMidnight(tripDate);
  return Math.round((tripDay - today) / (1000 * 60 * 60 * 24));
};

const ROUTE_META = {
  'القاهرة-الإسكندرية': { durationMin: 180, popularity: 0.95, hasRestStop: false },
  'الإسكندرية-القاهرة': { durationMin: 180, popularity: 0.95, hasRestStop: false },
  'القاهرة-المنصورة': { durationMin: 150, popularity: 0.78, hasRestStop: false },
  'المنصورة-القاهرة': { durationMin: 150, popularity: 0.78, hasRestStop: false },
  'القاهرة-بورسعيد': { durationMin: 210, popularity: 0.72, hasRestStop: false },
  'بورسعيد-القاهرة': { durationMin: 210, popularity: 0.72, hasRestStop: false },
  'القاهرة-الإسماعيلية': { durationMin: 120, popularity: 0.70, hasRestStop: false },
  'الإسماعيلية-القاهرة': { durationMin: 120, popularity: 0.70, hasRestStop: false },
  'القاهرة-السويس': { durationMin: 135, popularity: 0.68, hasRestStop: false },
  'السويس-القاهرة': { durationMin: 135, popularity: 0.68, hasRestStop: false },
  'القاهرة-دمياط': { durationMin: 210, popularity: 0.60, hasRestStop: false },
  'دمياط-القاهرة': { durationMin: 210, popularity: 0.60, hasRestStop: false },
  'القاهرة-مرسى مطروح': { durationMin: 360, popularity: 0.75, hasRestStop: true },
  'مرسى مطروح-القاهرة': { durationMin: 360, popularity: 0.75, hasRestStop: true },
  'الإسكندرية-مرسى مطروح': { durationMin: 240, popularity: 0.70, hasRestStop: false },
  'مرسى مطروح-الإسكندرية': { durationMin: 240, popularity: 0.70, hasRestStop: false },
  'القاهرة-الغردقة': { durationMin: 390, popularity: 0.76, hasRestStop: true },
  'الغردقة-القاهرة': { durationMin: 390, popularity: 0.76, hasRestStop: true },
  'القاهرة-شرم الشيخ': { durationMin: 480, popularity: 0.82, hasRestStop: true },
  'شرم الشيخ-القاهرة': { durationMin: 480, popularity: 0.82, hasRestStop: true },
  'القاهرة-دهب': { durationMin: 540, popularity: 0.74, hasRestStop: true },
  'دهب-القاهرة': { durationMin: 540, popularity: 0.74, hasRestStop: true },
  'القاهرة-سوهاج': { durationMin: 480, popularity: 0.72, hasRestStop: true },
  'سوهاج-القاهرة': { durationMin: 480, popularity: 0.72, hasRestStop: true },
  'القاهرة-قنا': { durationMin: 570, popularity: 0.70, hasRestStop: true },
  'قنا-القاهرة': { durationMin: 570, popularity: 0.70, hasRestStop: true },
  'القاهرة-الأقصر': { durationMin: 660, popularity: 0.82, hasRestStop: true },
  'الأقصر-القاهرة': { durationMin: 660, popularity: 0.82, hasRestStop: true },
  'القاهرة-أسوان': { durationMin: 840, popularity: 0.78, hasRestStop: true },
  'أسوان-القاهرة': { durationMin: 840, popularity: 0.78, hasRestStop: true },
  'الأقصر-أسوان': { durationMin: 210, popularity: 0.65, hasRestStop: false },
  'أسوان-الأقصر': { durationMin: 210, popularity: 0.65, hasRestStop: false },
};

const SHORT_ROUTE_TEMPLATES = [
  { departureTime: '06:00', company: 'جو باص', class: 'اقتصادي مميز' },
  { departureTime: '08:00', company: 'سوبر جيت', class: 'اقتصادي مميز' },
  { departureTime: '10:00', company: 'بلو باص', class: 'اقتصادي مميز' },
  { departureTime: '12:30', company: 'جو باص', class: 'VIP رجال أعمال' },
  { departureTime: '15:00', company: 'سوبر جيت', class: 'اقتصادي مميز' },
  { departureTime: '18:00', company: 'بلو باص', class: 'اقتصادي مميز' },
  { departureTime: '21:00', company: 'جو باص', class: 'VIP رجال أعمال' },
];

const MEDIUM_ROUTE_TEMPLATES = [
  { departureTime: '06:00', company: 'جو باص', class: 'اقتصادي مميز' },
  { departureTime: '08:30', company: 'سوبر جيت', class: 'VIP رجال أعمال' },
  { departureTime: '11:00', company: 'بلو باص', class: 'اقتصادي مميز' },
  { departureTime: '14:00', company: 'جو باص', class: 'VIP رجال أعمال' },
  { departureTime: '17:30', company: 'سوبر جيت', class: 'اقتصادي مميز' },
  { departureTime: '21:00', company: 'بلو باص', class: 'اقتصادي مميز' },
];

const LONG_ROUTE_TEMPLATES = [
  { departureTime: '07:00', company: 'جو باص', class: 'اقتصادي مميز' },
  { departureTime: '10:00', company: 'سوبر جيت', class: 'VIP رجال أعمال' },
  { departureTime: '19:30', company: 'جو باص', class: 'اقتصادي مميز' },
  { departureTime: '22:00', company: 'سوبر جيت', class: 'VIP رجال أعمال' },
];

const getScheduleTemplatesForRoute = (routeKey) => {
  const meta = ROUTE_META[routeKey];
  if (!meta) return MEDIUM_ROUTE_TEMPLATES;
  if (meta.durationMin <= 210) return SHORT_ROUTE_TEMPLATES;
  if (meta.durationMin >= 480) return LONG_ROUTE_TEMPLATES;
  return MEDIUM_ROUTE_TEMPLATES;
};

const getTripDepartureDateTime = (trip) => new Date(`${trip.date}T${trip.departureTime}:00`);

const getTripArrivalDateTime = (trip) => {
  const departure = getTripDepartureDateTime(trip);
  const arrival = new Date(`${trip.date}T${trip.arrivalTime}:00`);
  if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
  return arrival;
};

const getTripLifecycleStatus = (trip, now = new Date()) => {
  const departure = getTripDepartureDateTime(trip);
  const arrival = getTripArrivalDateTime(trip);
  const totalMs = Math.max(1, arrival - departure);
  const elapsedPct = clamp(((now - departure) / totalMs) * 100, 0, 100);
  const routeMeta = ROUTE_META[`${trip.from}-${trip.to}`] || { hasRestStop: trip.durationHour >= 4.5 };

  if (now < new Date(departure.getTime() - 30 * 60 * 1000)) {
    return { key: 'scheduled', progress: 0, statusText: 'لسه متحركتش (في الانتظار)' };
  }

  if (now < departure) {
    return { key: 'boarding', progress: 0, statusText: 'بدأ تجهيز الرحلة والصعود' };
  }

  if (now >= arrival) {
    return { key: 'arrived', progress: 100, statusText: 'وصلت بالسلامة حمدالله على السلامة!' };
  }

  if (routeMeta.hasRestStop && elapsedPct >= 45 && elapsedPct <= 60) {
    return { key: 'rest_stop', progress: elapsedPct, statusText: 'الرحلة في استراحة قصيرة' };
  }

  if (elapsedPct >= 85) {
    return { key: 'final_approach', progress: elapsedPct, statusText: 'الرحلة قربت توصل' };
  }

  return { key: 'en_route', progress: elapsedPct, statusText: 'الرحلة شغالة حسب الجدول' };
};

const getCancellationPolicy = (trip, now = new Date()) => {
  const departure = getTripDepartureDateTime(trip);
  const hoursToDeparture = (departure - now) / (1000 * 60 * 60);
  const baseFee = COMPANY_FEES[trip.company] || 0.20;

  if (trip.status !== 'upcoming') {
    return {
      allowed: false,
      feeRatio: 1,
      refundAmount: 0,
      message: 'الرحلة دي غير قابلة للإلغاء الآن',
      label: 'غير قابل للإلغاء',
    };
  }

  if (hoursToDeparture <= 2) {
    return {
      allowed: false,
      feeRatio: 1,
      refundAmount: 0,
      message: 'فات وقت الإلغاء المسموح (أقل من ساعتين على التحرك)',
      label: 'فات وقت الإلغاء',
    };
  }

  let feeRatio = baseFee;
  let label = 'رسوم الإلغاء الأساسية';

  if (hoursToDeparture > 24) {
    feeRatio = Math.max(0.10, baseFee - 0.05);
    label = 'إلغاء مبكر';
  } else if (hoursToDeparture <= 6) {
    feeRatio = clamp(baseFee + 0.15, baseFee, 0.75);
    label = 'إلغاء متأخر';
  }

  const refundAmount = Math.max(0, Math.round((trip.finalTotal || 0) * (1 - feeRatio)));

  return {
    allowed: true,
    feeRatio,
    refundAmount,
    message: label,
    label,
    hoursToDeparture,
  };
};

const MIN_BOOKING_LEAD_MINUTES = 120;

const getTripMinutesUntilDeparture = (trip, now = new Date()) => {
  return Math.floor((getTripDepartureDateTime(trip) - now) / 60000);
};

const getTripBookability = (trip, now = new Date()) => {
  const departure = getTripDepartureDateTime(trip);
  const arrival = getTripArrivalDateTime(trip);
  const minutesUntilDeparture = getTripMinutesUntilDeparture(trip, now);

  if (trip.status && ['cancelled', 'refund_pending'].includes(trip.status)) {
    return {
      canBook: false,
      code: 'inactive',
      reason: 'الحجز مقفول على الرحلة دي حالياً',
      minutesUntilDeparture,
    };
  }

  if (now >= arrival) {
    return {
      canBook: false,
      code: 'finished',
      reason: 'الرحلة دي خلصت بالفعل',
      minutesUntilDeparture,
    };
  }

  if (now >= departure) {
    return {
      canBook: false,
      code: 'departed',
      reason: 'الرحلة دي اتحركت بالفعل',
      minutesUntilDeparture,
    };
  }

  if (minutesUntilDeparture < MIN_BOOKING_LEAD_MINUTES) {
    return {
      canBook: false,
      code: 'cutoff',
      reason: 'الحجز بيقفل قبل التحرك بساعتين على الأقل',
      minutesUntilDeparture,
    };
  }

  return {
    canBook: true,
    code: 'bookable',
    reason: 'متاح للحجز',
    minutesUntilDeparture,
  };
};

const generateSeats = (tripId, tripDate, tripTime, routeKey, company, seatClass) => {
  const seed = hashString(`${tripId}-${tripDate}-${tripTime}`);
  const rand = createSeededRandom(seed);
  const daysUntilTrip = getDaysUntilTrip(tripDate);
  const meta = ROUTE_META[routeKey] || { popularity: 0.65 };

  let fillRatio;
  if (daysUntilTrip <= 0) fillRatio = 0.86;
  else if (daysUntilTrip <= 1) fillRatio = 0.74;
  else if (daysUntilTrip <= 3) fillRatio = 0.60;
  else if (daysUntilTrip <= 7) fillRatio = 0.47;
  else if (daysUntilTrip <= 14) fillRatio = 0.34;
  else fillRatio = 0.22;

  fillRatio += (meta.popularity - 0.5) * 0.25;
  if (seatClass.includes('VIP')) fillRatio += 0.05;
  if (company === 'سوبر جيت') fillRatio += 0.03;
  fillRatio = clamp(fillRatio, 0.10, 0.95);

  const seats = [];
  for (let idx = 0; idx < 40; idx++) {
    const row = Math.floor(idx / 4) + 1;
    const col = ['A', 'B', 'C', 'D'][idx % 4];
    const frontBias = row <= 3 ? 0.06 : row >= 9 ? -0.03 : 0;
    const isBooked = rand() < clamp(fillRatio + frontBias, 0.05, 0.98);

    seats.push({
      id: idx + 1,
      number: `${row}${col}`,
      status: isBooked ? 'booked' : 'available',
    });
  }

  return seats;
};

const generateTrips = (from, to, date) => {
  if (!from || !to || from === to) return { trips: [], isDirect: false };

  const routeKey = `${from}-${to}`;
  const basePrice = DIRECT_ROUTES[routeKey];
  if (!basePrice) return { trips: [], isDirect: false };

  const routeMeta = ROUTE_META[routeKey] || {
    durationMin: Math.max(120, Math.round(basePrice * 1.3)),
    popularity: 0.65,
    hasRestStop: basePrice >= 300,
  };

  const routeSeed = hashString(`${routeKey}-${date}`);
  const rand = createSeededRandom(routeSeed);
  const daysUntilTrip = getDaysUntilTrip(date);
  const scheduleTemplates = getScheduleTemplatesForRoute(routeKey);

  const trips = scheduleTemplates.map((schedule, i) => {
    const isVIP = schedule.class.includes('VIP');
    const companyMultiplier = schedule.company === 'بلو باص' ? 1.04 : schedule.company === 'سوبر جيت' ? 1.08 : 1.0;
    const classMultiplier = isVIP ? 1.42 : 1.0;
    const hour = Number(schedule.departureTime.split(':')[0]);
    const timeMultiplier = hour >= 19 || hour < 6 ? 1.06 : hour >= 7 && hour <= 9 ? 1.03 : 1.0;
    const bookingWindowMultiplier = daysUntilTrip <= 1 ? 1.10 : daysUntilTrip <= 3 ? 1.05 : daysUntilTrip >= 14 ? 0.98 : 1.0;
    const variabilityMultiplier = 0.97 + rand() * 0.07;

    const rawPrice = basePrice * companyMultiplier * classMultiplier * timeMultiplier * bookingWindowMultiplier * variabilityMultiplier;
    const price = Math.max(basePrice, Math.round(rawPrice / 10) * 10);

    const operatorDurationDelta = schedule.company === 'سوبر جيت' ? -12 : schedule.company === 'بلو باص' ? 8 : 0;
    const variance = Math.round(rand() * 24 - 12);
    const durationMin = Math.max(90, routeMeta.durationMin + operatorDurationDelta + variance);

    const routeCode = hashString(routeKey).toString(36).toUpperCase().slice(0, 4);
    const tripId = `TRP-${routeCode}-${date.replaceAll('-', '')}-${i + 1}`;

    return {
      id: tripId,
      from,
      to,
      date,
      departureTime: schedule.departureTime,
      arrivalTime: addMinutesToTime(schedule.departureTime, durationMin),
      durationHour: Number((durationMin / 60).toFixed(1)),
      price,
      company: schedule.company,
      class: schedule.class,
      rating: (4.1 + rand() * 0.8).toFixed(1),
      seats: generateSeats(tripId, date, schedule.departureTime, routeKey, schedule.company, schedule.class),
      driver: DRIVERS[i % DRIVERS.length],
      hasRestStop: routeMeta.hasRestStop,
    };
  });

  const cheapest = [...trips].sort((a, b) => a.price - b.price)[0];
  const fastest = [...trips].sort((a, b) => a.durationHour - b.durationHour)[0];

  return {
    trips: trips.map((t) => ({
      ...t,
      badge:
        t.id === cheapest?.id
          ? 'cheapest'
          : t.id === fastest?.id
          ? 'fastest'
          : t.class.includes('VIP')
          ? 'vip'
          : null,
    })),
    isDirect: true,
  };
};

// ==========================================
// 2. Main App Component
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('taree2y_v7_theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taree2y_v7_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taree2y_v7_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted) return;

      if (error) {
        console.error(error);
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session ?? null;

      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) setAuthLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        return;
      }

      setTimeout(() => {
        if (!mounted) return;
        loadProfile(nextSession.user.id);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-white">
        جاري تحميل الحساب...
      </div>
    );
  }

  if (!session || !profile) {
    return <LoginScreen isDark={isDark} setIsDark={setIsDark} />;
  }

  return (
    <div className={`min-h-[100dvh] font-sans transition-colors duration-300 flex justify-center w-full ${isDark ? 'dark bg-slate-900 text-slate-50' : 'bg-slate-200 text-slate-900'}`} dir="rtl">
      <div className="w-full bg-white dark:bg-slate-950 shadow-2xl relative flex flex-col md:flex-row h-[100dvh] overflow-hidden">
        <UserApp
          userId={session.user.id}
          profile={profile}
          onLogout={async () => {
            await supabase.auth.signOut();
          }}
          isDark={isDark}
          setIsDark={setIsDark}
        />
      </div>
    </div>
  );
}

// ==========================================
// 3. Global State Manager
// ==========================================
function UserApp({ userId, profile, onLogout, isDark, setIsDark }) {
  const todayDate = getLocalDateInputValue();
  const user = useMemo(() => ({
    name: profile?.display_name || 'مستخدم',
    phone: profile?.phone || '',
  }), [profile]);

  const [wallet, setWallet] = useState(() => readNumber(demoKey(userId, 'wallet'), 0));
  const [transactions, setTransactions] = useState(() => readJSON(demoKey(userId, 'txns'), []));
  const [myTrips, setMyTrips] = useState(() => readJSON(demoKey(userId, 'trips'), []));
  const [points, setPoints] = useState(() => readNumber(demoKey(userId, 'points'), 0));
  const [subscription, setSubscription] = useState(() => localStorage.getItem(demoKey(userId, 'sub')) || 'none');
  
  useEffect(() => {
    localStorage.setItem(demoKey(userId, 'wallet'), String(wallet));
    localStorage.setItem(demoKey(userId, 'txns'), JSON.stringify(transactions));
    localStorage.setItem(demoKey(userId, 'trips'), JSON.stringify(myTrips));
    localStorage.setItem(demoKey(userId, 'points'), String(points));
    localStorage.setItem(demoKey(userId, 'sub'), subscription);
  }, [userId, wallet, transactions, myTrips, points, subscription]);


  useEffect(() => {
    let changed = false;
    let awardedPoints = 0;

    const nextTrips = myTrips.map((trip) => {
      if (trip.status !== 'upcoming') return trip;

      const lifecycle = getTripLifecycleStatus(trip);
      if (lifecycle.key !== 'arrived') return trip;

      changed = true;
      if (!trip.pointsAwarded && trip.earnedPointsPending > 0) {
        awardedPoints += trip.earnedPointsPending;
      }

      return {
        ...trip,
        status: 'past',
        pointsAwarded: true,
      };
    });

    if (!changed) return;

    setMyTrips(nextTrips);
    if (awardedPoints > 0) {
      setPoints((p) => p + awardedPoints);
    }
  }, [myTrips]);


  const [activeTab, setActiveTab] = useState('home');
  const [activeView, setActiveView] = useState('main'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: todayDate, passengers: 1 });
  const [searchResults, setSearchResults] = useState({ trips: [], isDirect: true });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'courier', 'bot', 'food', 'subs', 'points', 'topup'

  const showToast = (msg, type = 'success') => { 
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000); 
  };

  const navigateTo = (view, tab = activeTab) => { setActiveView(view); setActiveTab(tab); window.scrollTo(0, 0); };
  const goBack = () => {
    if (activeView === 'invoice') navigateTo('main', 'home');
    else if (activeView === 'checkout') navigateTo('seats');
    else if (activeView === 'seats') navigateTo('search');
    else if (activeView === 'search') navigateTo('main', 'home');
    else if (['ticket', 'tracking'].includes(activeView)) navigateTo('main', 'trips');
    else navigateTo('main', 'home');
  };

  const handleSearch = (predefinedParams = null) => {
    const params = predefinedParams || searchParams;
    if(!params.from || !params.to || !params.date) return showToast('حدد مكان التحرك والوصول وتاريخ الرحلة الأول 📍', 'error');
    if(params.from === params.to) return showToast('مكان الانطلاق هو هو مكان الوصول!', 'error');
    if (predefinedParams) setSearchParams(params);
    setIsSearching(true); navigateTo('search');
    setTimeout(() => { setSearchResults(generateTrips(params.from, params.to, params.date)); setIsSearching(false); }, 1200);
  };

  const processDelayedRefund = (tripToCancel) => {
    const policy = getCancellationPolicy(tripToCancel);
    if (!policy.allowed) {
      showToast(policy.message, 'error');
      return;
    }

    const refundAmount = policy.refundAmount;

    setMyTrips((prev) => prev.map((t) => t.pnr === tripToCancel.pnr ? { ...t, status: 'refund_pending' } : t));
    showToast('جاري الإلغاء ومعالجة طلب الاسترداد ⏳', 'success');

    setTimeout(() => {
      setMyTrips((currentTrips) => {
        const exists = currentTrips.find((t) => t.pnr === tripToCancel.pnr);
        if (exists) {
          setWallet((p) => p + refundAmount);
          setTransactions((p) => [{ id: `REF-${Math.random().toString(36).substr(2,4).toUpperCase()}`, type: 'credit', amount: refundAmount, date: getLocalDateInputValue(), desc: `استرداد تذكرة ${tripToCancel.pnr}` }, ...p]);
          showToast(`تم الإلغاء! رجعلك ${refundAmount} ج.م للمحفظة 💸`, 'success');
          return currentTrips.map((t) => t.pnr === tripToCancel.pnr ? { ...t, status: 'cancelled', pointsAwarded: false } : t);
        }
        return currentTrips;
      });
    }, 1500);
  };

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-[400px] pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-down border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="font-bold text-sm leading-tight">{toast.msg}</span>
          </div>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col h-full sticky top-0 z-40 shadow-sm transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className={`p-6 flex items-center ${isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} cursor-pointer transition-all`} onClick={()=>navigateTo('main', 'home')}>
           <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <BusFront className="w-7 h-7" />
           </div>
           {isSidebarOpen && <div><h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">طريقي</h1><p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold whitespace-nowrap">رحلتك بتبدأ من هنا</p></div>}
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
           <DesktopNavItem icon={<Home />} label="الرئيسية" active={activeTab==='home'} onClick={()=>navigateTo('main', 'home')} collapsed={!isSidebarOpen} />
           <DesktopNavItem icon={<Ticket />} label="تذاكري" active={activeTab==='trips'} onClick={()=>navigateTo('main', 'trips')} collapsed={!isSidebarOpen} />
           <DesktopNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab==='wallet'} onClick={()=>navigateTo('main', 'wallet')} collapsed={!isSidebarOpen} />
           <DesktopNavItem icon={<User />} label="حسابي" active={activeTab==='profile'} onClick={()=>navigateTo('main', 'profile')} collapsed={!isSidebarOpen} />
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
           <div className={`bg-indigo-50 dark:bg-slate-800 rounded-2xl flex items-center ${isSidebarOpen ? 'p-4 gap-3' : 'p-2 justify-center'} transition-all`}>
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black shrink-0">{user.name.charAt(0)}</div>
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                   <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                   <p className="text-[10px] text-slate-500 dark:text-slate-400">{wallet} ج.م متاح</p>
                </div>
              )}
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden px-5 pt-10 pb-4 z-10 flex justify-between items-center transition-colors bg-indigo-600 dark:bg-slate-900 text-white border-none shadow-md shrink-0">
          {activeView !== 'main' ? (
            <button onClick={goBack} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition text-white font-bold text-sm"><ChevronRight className="w-5 h-5" /> رجوع</button>
          ) : (
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white/20 dark:bg-indigo-600/50 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div><BusFront className="w-6 h-6 text-white relative z-10" /></div>
               <div><h1 className="text-xl font-black tracking-tight text-white">طريقي</h1><div className="flex items-center gap-1"><p className="text-white/80 text-[10px] font-bold">الـ Super App 🇪🇬</p></div></div>
            </div>
          )}
          {(activeView === 'main') && (
            <div onClick={() => navigateTo('main', 'wallet')} className="bg-white/10 dark:bg-slate-800/50 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer border border-white/20 hover:bg-white/20 transition" dir="ltr"><WalletIcon className="w-4 h-4 text-emerald-300" /><span className="font-bold text-sm text-white">{wallet} ج</span></div>
          )}
        </header>

        {/* Desktop Top Bar */}
        <div className="hidden md:flex p-4 px-8 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
           <div className="flex gap-4 items-center">
             <button onClick={()=>setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"><Menu className="w-5 h-5"/></button>
             {activeView !== 'main' && <button onClick={goBack} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl transition text-slate-800 dark:text-white font-bold text-sm"><ChevronRight className="w-5 h-5" /> العودة للسابق</button>}
           </div>
           <div className="text-sm font-bold text-slate-500 dark:text-slate-400">رصيد المحفظة: <span className="text-indigo-600 dark:text-indigo-400">{wallet} ج.م</span></div>
        </div>

        {/* Scrollable Views */}
        <main className="flex-1 overflow-y-auto relative hide-scrollbar scroll-smooth flex flex-col w-full">
          <div className="w-full mx-auto max-w-[1800px] flex-1 flex flex-col pb-32 md:pb-8 px-0 lg:px-8">
            {activeView === 'main' && activeTab === 'home' && (
              <HomeView searchParams={searchParams} setSearchParams={setSearchParams} onSearch={() => handleSearch()} showToast={showToast} onPromoSearch={handleSearch} openModal={setActiveModal} />
            )}
            {activeView === 'search' && (
              <SearchResultsView searchParams={searchParams} searchResults={searchResults} isSearching={isSearching} onSelectTrip={(trip) => { setSelectedTrip(trip); setSelectedSeats([]); navigateTo('seats'); }} showToast={showToast} />
            )}
            {activeView === 'seats' && selectedTrip && (
              <SeatSelectionView trip={selectedTrip} passengers={searchParams.passengers} selectedSeats={selectedSeats} setSelectedSeats={setSelectedSeats} onConfirm={() => navigateTo('checkout')} showToast={showToast} />
            )}
            {activeView === 'checkout' && selectedTrip && (
              <CheckoutView trip={selectedTrip} seats={selectedSeats} passengers={searchParams.passengers} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} setPoints={setPoints} subscription={subscription}
                onSuccess={(ticket, invoice) => { setMyTrips([ticket, ...myTrips]); setCurrentInvoice(invoice); setViewedTicket(ticket); navigateTo('invoice'); }} showToast={showToast} openModal={setActiveModal} />
            )}
            {activeView === 'invoice' && currentInvoice && (
              <InvoiceView invoice={currentInvoice} onContinue={() => navigateTo('ticket')} />
            )}
            {activeView === 'main' && activeTab === 'trips' && (
              <TripsView trips={myTrips} setMyTrips={setMyTrips} processRefund={processDelayedRefund} onViewTicket={(ticket) => { setViewedTicket(ticket); navigateTo('ticket'); }} showToast={showToast} />
            )}
            {activeView === 'ticket' && viewedTicket && (
              <TicketView ticket={viewedTicket} user={user} onTrack={() => navigateTo('tracking')} showToast={showToast} />
            )}
            {activeView === 'tracking' && viewedTicket && (
              <TrackingView ticket={viewedTicket} showToast={showToast} openModal={setActiveModal} />
            )}
            {activeView === 'main' && activeTab === 'wallet' && (
              <WalletView wallet={wallet} setWallet={setWallet} transactions={transactions} setTransactions={setTransactions} showToast={showToast} openTopUp={()=>setActiveModal('topup')} />
            )}
            {activeView === 'main' && activeTab === 'profile' && (
              <ProfileView user={user} points={points} subscription={subscription} isDark={isDark} setIsDark={setIsDark} onLogout={onLogout} showToast={showToast} openModal={setActiveModal} />
            )}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        {activeView === 'main' && (
          <div className="md:hidden fixed bottom-4 w-[calc(100%-32px)] left-4 z-40">
            <nav className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl flex justify-around items-center p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
              <BottomNavItem icon={<Home />} label="الرئيسية" active={activeTab==='home'} onClick={()=>navigateTo('main', 'home')} />
              <BottomNavItem icon={<Ticket />} label="تذاكري" active={activeTab==='trips'} onClick={()=>navigateTo('main', 'trips')} />
              <BottomNavItem icon={<WalletIcon />} label="المحفظة" active={activeTab==='wallet'} onClick={()=>navigateTo('main', 'wallet')} />
              <BottomNavItem icon={<User />} label="حسابي" active={activeTab==='profile'} onClick={()=>navigateTo('main', 'profile')} />
            </nav>
          </div>
        )}

      </div>

      {/* Modals - Lower Z-Index than Toasts */}
      {activeModal === 'courier' && <CourierModal closeModal={()=>setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}
      {activeModal === 'bot' && <ChatbotModal closeModal={()=>setActiveModal(null)} user={user} />}
      {activeModal === 'subs' && <SubscriptionsModal closeModal={()=>setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} subscription={subscription} setSubscription={setSubscription} showToast={showToast} />}
      {activeModal === 'food' && <FoodOrderModal closeModal={()=>setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}
      {activeModal === 'points' && <PointsModal closeModal={()=>setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} points={points} setPoints={setPoints} showToast={showToast} />}
      {activeModal === 'topup' && <TopUpFlowModal closeModal={()=>setActiveModal(null)} wallet={wallet} setWallet={setWallet} setTransactions={setTransactions} showToast={showToast} />}

    </>
  );
}

// ==========================================
// 4. Functional Screens 
// ==========================================

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

function HomeView({ searchParams, setSearchParams, onSearch, showToast, onPromoSearch, openModal }) {
  const handleSwap = () => setSearchParams(p => ({ ...p, from: p.to, to: p.from }));
  const todayDate = getLocalDateInputValue();

  const copyPromo = (code) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
    } else {
      let ta = document.createElement("textarea");
      ta.value = code; ta.style.position = "fixed"; document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(ta);
    }
    showToast(`نسخنا كود الخصم (${code}) بنجاح! ✂️`, 'success');
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Hero Section */}
      <div className="bg-indigo-600 dark:bg-slate-900 md:rounded-[2.5rem] px-5 lg:px-16 pt-10 pb-24 md:m-6 rounded-b-[2.5rem] relative overflow-hidden shrink-0">
         <h2 className="text-3xl font-black text-white mb-2 leading-tight relative z-10">على فين <br/>يا بطل؟ 👋</h2>
         <p className="text-indigo-200 text-base relative z-10">طريقي معاك في كل مكان في مصر.</p>
         <div className="absolute left-0 bottom-0 opacity-10 pointer-events-none md:scale-150 transform origin-bottom-left scale-x-[-1]">
            <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,95.5,-2.9C94.2,12.2,85.6,26.9,75.3,39.6C65,52.3,53,63,39.4,70.5C25.8,78,10.6,82.3,-4.2,88.7C-19,95.1,-33.4,103.6,-45.3,98.1C-57.2,92.6,-66.6,73.1,-74.6,56.1C-82.6,39.1,-89.2,24.6,-91.1,9.4C-93,-5.8,-90.2,-21.7,-82.9,-35.1C-75.6,-48.5,-63.8,-59.4,-50.2,-66.8C-36.6,-74.2,-21.2,-78.1,-5.6,-70C10,-61.9,20.2,-62.4,30.6,-83.6L44.7,-76.4Z" transform="translate(100 100)" /></svg>
         </div>
      </div>

      {/* Main Search Card */}
      <div className="px-5 lg:px-16 -mt-16 relative z-10 shrink-0 w-full mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
             <div className="md:col-span-2 relative bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col md:flex-row p-1">
                <div className="relative flex-1">
                   <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"/>
                   <select value={searchParams.from} onChange={e=>setSearchParams(p=>({...p, from:e.target.value}))} className="w-full bg-transparent h-14 pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none appearance-none">
                     <option value="" disabled>هتتحرك منين؟</option>
                     {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                
                <div className="h-px md:h-10 md:w-px bg-slate-200 dark:bg-slate-700 mx-4 md:my-auto shrink-0"></div>
                
                <div className="relative flex-1">
                   <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5 pointer-events-none"/>
                   <select value={searchParams.to} onChange={e=>setSearchParams(p=>({...p, to:e.target.value}))} className="w-full bg-transparent h-14 pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none appearance-none">
                     <option value="" disabled>رايح فين؟</option>
                     {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>

                <button onClick={handleSwap} className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-full shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-transform z-10">
                   <ArrowRightLeft className="w-5 h-5 rotate-90 md:rotate-0" />
                </button>
             </div>

             <div className="relative group md:col-span-1">
                <Calendar className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <input type="date" value={searchParams.date} min={todayDate} onChange={e=>setSearchParams(p=>({...p, date:e.target.value}))} className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500 transition" />
             </div>
             
             <div className="relative group md:col-span-1">
                <Users className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none" />
                <select value={searchParams.passengers} onChange={e=>setSearchParams(p=>({...p, passengers:Number(e.target.value)}))} className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl pr-12 pl-4 text-base font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500 transition appearance-none">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} أفراد</option>)}
                </select>
             </div>
          </div>

          <button onClick={onSearch} className="w-full md:w-auto md:px-12 md:mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-4 rounded-2xl mt-6 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2">
            يلا بينا ندور 🚀
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="px-5 lg:px-16 mt-8 mb-4 w-full shrink-0">
        <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-4">خدمات السفر 💼</h3>
        <div className="flex md:grid md:grid-cols-5 xl:grid-cols-5 gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x w-full">
          {[ {i:Package, l:'إرسال طرد', m:'courier', c:'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}, 
             {i:Crown, l:'باقات التوفير', m:'subs', c:'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}, 
             {i:Car, l:'مشاركة سيارات', m:'carpool', c:'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'}, 
             {i:Users, l:'تأجير باص', m:'charter', c:'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'},
             {i:Bot, l:'مساعد و دعم', m:'bot', c:'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'} 
          ].map((s, idx) => (
            <div key={idx} onClick={()=> s.m === 'carpool' || s.m === 'charter' ? showToast('الخدمة دي هتنزل قريب جداً 🔜', 'success') : openModal(s.m)} className="min-w-[120px] w-full flex flex-col items-center gap-3 cursor-pointer group active:scale-95 transition-transform bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 snap-center">
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center ${s.c} shadow-inner`}>
                 <s.i className="w-7 h-7" />
              </div>
              <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 text-center leading-tight whitespace-nowrap">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Offers Slider */}
      <div className="px-5 lg:px-16 mt-2 mb-8 w-full shrink-0">
         <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-4">عروض لقطة 🎁</h3>
         <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-6 snap-x w-full">
            <div onClick={()=>copyPromo('AHLAN50')} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1"><Copy className="w-3 h-3"/> انسخ: AHLAN50</span>
                 <h4 className="font-black text-2xl mb-1">50 ج.م خصم!</h4>
                 <p className="text-sm font-medium text-orange-50">على أول رحلة تطلبها من طريقي</p>
               </div>
               <Tag className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform -rotate-12" />
            </div>
            
            <div onClick={()=>onPromoSearch({ from: 'القاهرة', to: 'مرسى مطروح', date: todayDate, passengers: 1 })} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1">احجز مطروح فوراً <ChevronLeft className="w-3 h-3"/></span>
                 <h4 className="font-black text-2xl mb-1">فورمة الساحل 🏖️</h4>
                 <p className="text-sm font-medium text-blue-50">صيفنا أحلى في مطروح بأسعار زمان</p>
               </div>
               <Sun className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform rotate-45" />
            </div>

            <div onClick={()=>copyPromo('SA3EED15')} className="cursor-pointer active:scale-95 transition-transform flex-1 min-w-[280px] md:min-w-[400px] xl:w-1/3 flex-shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden snap-center">
               <div className="relative z-10">
                 <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-lg mb-3 inline-flex items-center gap-1"><Copy className="w-3 h-3"/> انسخ: SA3EED15</span>
                 <h4 className="font-black text-2xl mb-1">أهالي الصعيد 🌴</h4>
                 <p className="text-sm font-medium text-emerald-50">خصم 15% على رحلات الصعيد</p>
               </div>
               <Star className="w-32 h-32 absolute -left-6 -bottom-6 text-white opacity-20 transform rotate-45" />
            </div>
         </div>
      </div>
    </div>
  );
}

function SearchResultsView({ searchParams, searchResults, isSearching, onSelectTrip, showToast }) {
  const [filter, setFilter] = useState('all'); 
  const { trips, isDirect } = searchResults;

  const displayedTrips = useMemo(() => {
    let res = [...trips];
    if(filter === 'cheapest') res.sort((a,b) => a.price - b.price);
    if(filter === 'fastest') res.sort((a,b) => a.durationHour - b.durationHour);
    return res;
  }, [trips, filter]);

  const priceInsight = useMemo(() => {
     if (trips.length === 0) return null;
     const available = trips.reduce((sum, t) => sum + (t.seats?.filter(s => s.status === 'available').length || 0), 0);

     if (available <= 10) {
       return {
         text: 'المقاعد المتاحة قليلة على الرحلات دي، الأفضل تحجز بدري.',
         color: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300',
         iconColor: 'text-orange-500'
       };
     }

     if (available <= 30) {
       return {
         text: 'فيه إتاحة متوسطة على الرحلات دي حالياً.',
         color: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-300',
         iconColor: 'text-indigo-500'
       };
     }

     return {
       text: 'الإتاحة كويسة جداً على الرحلات دي.',
       color: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300',
       iconColor: 'text-emerald-500'
     };
  }, [trips]);

  return (
    <div className="flex flex-col flex-1 pb-10 w-full">
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-20 px-5 lg:px-16 py-4 border-b border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                 {searchParams.from} <ArrowRightLeft className="w-4 h-4 text-slate-400" /> {searchParams.to}
               </h2>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                 {searchParams.date} • {searchParams.passengers} أفراد
               </p>
            </div>
            {!isSearching && isDirect && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-xl">{displayedTrips.length} رحلات</div>
            )}
         </div>
         
         {!isSearching && isDirect && displayedTrips.length > 0 && (
           <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
             <FilterChip active={filter==='all'} onClick={()=>setFilter('all')} label="كله شغال" icon={<Star className="w-3 h-3"/>} />
             <FilterChip active={filter==='cheapest'} onClick={()=>setFilter('cheapest')} label="الأرخص" icon={<Tag className="w-3 h-3"/>} />
             <FilterChip active={filter==='fastest'} onClick={()=>setFilter('fastest')} label="الأسرع" icon={<Zap className="w-3 h-3"/>} />
           </div>
         )}
      </div>

      <div className="p-5 lg:px-16 space-y-4 flex-1 shrink-0 w-full">
        {!isSearching && priceInsight && isDirect && displayedTrips.length > 0 && (
           <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold bg-gradient-to-r border shadow-sm ${priceInsight.color} lg:col-span-2 xl:col-span-3 2xl:col-span-4`}>
              <div className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0 ${priceInsight.iconColor}`}><TrendingUp className="w-5 h-5"/></div>
              <div><span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">مؤشر الإتاحة</span>{priceInsight.text}</div>
           </div>
        )}

        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
             {Array.from({length: 4}).map((_, i) => (
               <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 animate-pulse">
                  <div className="flex justify-between mb-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div></div>
                  <div className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-2xl mb-4"></div>
                  <div className="flex justify-between"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/5"></div><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div></div>
               </div>
             ))}
          </div>
        ) : !isDirect ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-900/50 mt-4 max-w-2xl mx-auto w-full">
             <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-4"><Map className="w-8 h-8"/></div>
             <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 mb-2">مفيش طريق مباشر</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">للأسف مفيش رحلات مباشرة من {searchParams.from} لـ {searchParams.to}.</p>
             <p className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg">بنقترح تاخد ترانزيت في القاهرة 🚌</p>
          </div>
        ) : displayedTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 mt-4 max-w-2xl mx-auto w-full">
             <div className="text-6xl mb-4">🏜️</div>
             <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 mb-2">مفيش رحلات للمسار ده</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">مفيش رحلات في اليوم ده للأسف 😔 جرب يوم تاني.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
             {displayedTrips.map((trip) => {
               const availableSeats = trip.seats?.filter(s=>s.status==='available').length || 0;
               const almostFull = availableSeats > 0 && availableSeats <= 5;
               const bookability = getTripBookability(trip);
               const canBookTrip = bookability.canBook;
               
               return (
               <div
                 key={trip.id}
                 onClick={() => {
                   if (!canBookTrip) {
                     showToast(bookability.reason, 'error');
                     return;
                   }
                   if (availableSeats > 0) {
                     onSelectTrip(trip);
                     return;
                   }
                   showToast('سجلنا اسمك في قائمة الانتظار، هنبلغك لو في مكان فضي ⏳', 'success');
                 }}
                 className={`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-[0.98] relative overflow-hidden group ${!canBookTrip ? 'opacity-70 grayscale cursor-not-allowed border-slate-200 dark:border-slate-700' : availableSeats===0 ? 'cursor-pointer hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600' : 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600'}`}
               >
                 
                 {trip.badge === 'cheapest' && <Badge color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" text="🔥 الأرخص" />}
                 {trip.badge === 'fastest' && <Badge color="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" text="⚡ الأسرع" />}
                 {trip.badge === 'vip' && <Badge color="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400" text="👑 كبار الزوار" />}

                 <div className="flex justify-between items-center mb-4 mt-2">
                   <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                     {trip.company} <span className="w-1 h-1 bg-slate-300 rounded-full"></span> <span className="text-slate-500 dark:text-slate-400 font-normal text-xs">{trip.class}</span>
                   </div>
                 </div>

                 <div className={`flex items-center justify-between text-center relative py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-4 border border-slate-100 dark:border-slate-700/50 mb-4 transition-colors ${availableSeats===0?'opacity-60 grayscale':'group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20'}`}>
                   <div className="w-1/4"><p className="text-xl font-black text-slate-800 dark:text-slate-100" dir="ltr">{trip.departureTime}</p></div>
                   <div className="flex-1 flex flex-col items-center relative px-2">
                     <div className="w-full flex items-center text-slate-300 dark:text-slate-600">
                       <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-800 z-10"></div>
                       <div className="flex-1 border-t-2 border-dashed border-current mx-1"></div>
                       <BusFront className="w-5 h-5 text-indigo-400 mx-1 bg-slate-50 dark:bg-slate-900 px-0.5 rounded-full" />
                       <div className="flex-1 border-t-2 border-dashed border-current mx-1"></div>
                       <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800 z-10"></div>
                     </div>
                     <span className="text-[10px] font-bold text-slate-500 mt-2 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">{trip.durationHour} ساعات</span>
                   </div>
                   <div className="w-1/4"><p className="text-xl font-black text-slate-800 dark:text-slate-100" dir="ltr">{trip.arrivalTime}</p></div>
                 </div>

                 <div className="flex justify-between items-end">
                   <div className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${!canBookTrip ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : availableSeats === 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : almostFull ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>
                      {!canBookTrip ? <><Clock className="w-4 h-4"/> {bookability.code === 'cutoff' ? 'قفل الحجز' : bookability.code === 'departed' ? 'اتحركت' : 'انتهت'}</> : availableSeats === 0 ? <><Clock className="w-4 h-4"/> انضم للانتظار</> : <><Armchair className="w-4 h-4"/> {`${availableSeats} كراسي فاضية`}</>}
                   </div>
                   <div className="text-left">
                      <span className="text-[10px] text-slate-400 block mb-0.5">التذكرة بـ</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{trip.price} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">ج.م</span></span>
                   </div>
                 </div>
               </div>
             )
           })}
          </div>
        )}
      </div>
    </div>
  );
}

function SeatSelectionView({ trip, passengers, selectedSeats, setSelectedSeats, onConfirm, showToast }) {
  if (!trip || !trip.seats) return null;

  const bookability = getTripBookability(trip);

  const toggleSeat = (seat) => {
    if (!bookability.canBook) {
      return showToast(bookability.reason, 'error');
    }
    if (seat.status === 'booked') {
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      return showToast('الكرسي ده محجوز يا ريس 😔', 'error');
    }

    if (selectedSeats.includes(seat.number)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seat.number));
    } else {
      if (selectedSeats.length >= passengers) {
        if (window.navigator?.vibrate) window.navigator.vibrate([50, 50, 50]);
        return showToast(`أنت طالب تحجز ${passengers} مقاعد بس ✌️`, 'error');
      }
      if (window.navigator?.vibrate) window.navigator.vibrate(20);
      setSelectedSeats((prev) => [...prev, seat.number]);
    }
  };

  const isReady = selectedSeats.length === passengers;
  const rows = Array.from({ length: Math.ceil(trip.seats.length / 4) }, (_, rowIndex) =>
    trip.seats.slice(rowIndex * 4, rowIndex * 4 + 4)
  );

  return (
    <div className="flex flex-col flex-1 pt-4 w-full h-full">
      <div className="text-center mb-6 px-5 shrink-0">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1">اختار كرسيك 💺</h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          مطلوب اختيار <span className="text-indigo-600 dark:text-indigo-400">{passengers}</span> مقاعد
        </p>
        {!bookability.canBook && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-2 text-xs font-black border border-rose-200 dark:border-rose-800/50">
            <Clock className="w-4 h-4" /> {bookability.reason}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-6 mb-8 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-indigo-600 shadow-md"></div> مختار</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700"></div> فاضي</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-lg bg-slate-200 dark:bg-slate-700"></div> محجوز</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 hide-scrollbar shrink-0 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-6 max-w-[320px] mx-auto border-4 border-slate-200 dark:border-slate-700 relative shadow-sm mb-6">
          <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-10 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
          </div>

          <div className="space-y-3" dir="ltr">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[1fr_1fr_24px_1fr_1fr] gap-3 items-center">
                {row.slice(0, 2).map((seat) => {
                  const isSelected = selectedSeats.includes(seat.number);
                  const isBooked = seat.status === 'booked';

                  return (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat)}
                      disabled={isBooked}
                      className={`w-12 h-12 flex items-center justify-center rounded-xl text-base font-bold transition-all duration-200
                        ${isSelected
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110 border-none'
                          : isBooked
                          ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border-none'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 border-2 border-slate-200 dark:border-slate-700 shadow-sm'}`}
                    >
                      {isSelected ? <Check className="w-5 h-5" /> : seat.number}
                    </button>
                  );
                })}

                <div />

                {row.slice(2, 4).map((seat) => {
                  const isSelected = selectedSeats.includes(seat.number);
                  const isBooked = seat.status === 'booked';

                  return (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat)}
                      disabled={isBooked}
                      className={`w-12 h-12 flex items-center justify-center rounded-xl text-base font-bold transition-all duration-200
                        ${isSelected
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110 border-none'
                          : isBooked
                          ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border-none'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 border-2 border-slate-200 dark:border-slate-700 shadow-sm'}`}
                    >
                      {isSelected ? <Check className="w-5 h-5" /> : seat.number}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto p-5 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pb-8 z-20 pointer-events-none">
        <button
          onClick={() => {
            if (!bookability.canBook) {
              showToast(bookability.reason, 'error');
              return;
            }
            onConfirm();
          }}
          disabled={!isReady || !bookability.canBook}
          className={`w-full max-w-[400px] mx-auto font-black text-lg py-4 rounded-2xl transition-all shadow-lg flex justify-between items-center px-6 pointer-events-auto
            ${isReady && bookability.canBook ? 'bg-indigo-600 text-white shadow-indigo-600/30 active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
        >
          <span>تأكيد الحجز</span>
          <span className={`px-3 py-1 rounded-lg text-sm ${isReady ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700'}`}>
            {selectedSeats.length} / {passengers}
          </span>
        </button>
      </div>
    </div>
  );
}

function CheckoutView({ trip, seats, passengers, wallet, setWallet, setTransactions, setPoints, subscription, onSuccess, showToast, openModal }) {
  if (!trip) return null;

  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [rideToStation, setRideToStation] = useState(false);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const subDiscountRate = subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;

  const baseTotal = trip.price * passengers;
  const autoDiscount = Math.floor(baseTotal * subDiscountRate);
  const luggageFee = hasLuggage ? (50 * passengers) : 0;
  const rideFee = rideToStation ? 80 : 0;
  const finalTotal = baseTotal + luggageFee + rideFee - discount - autoDiscount;
  const isWalletSufficient = wallet >= finalTotal;
  const pointsToAwardLater = Math.max(0, Math.floor(Math.max(0, baseTotal - autoDiscount - discount) / 5));
  const tripBookability = getTripBookability(trip);

  const applyPromo = () => {
    if (!promo) return;
    if (promo.toUpperCase() === 'AHLAN50') { setDiscount(50); showToast('تم تفعيل الخصم يا نجم 🎉', 'success'); }
    else if (promo.toUpperCase() === 'EID26') { setDiscount(Math.floor(baseTotal * 0.2)); showToast('عيدية طريقي اتفعلت (خصم 20%) 🌙', 'success'); }
    else if (promo.toUpperCase() === 'SA3EED15') { setDiscount(Math.floor(baseTotal * 0.15)); showToast('أجدع ناس! اتفعل خصم الصعيد 🌴', 'success'); }
    else if (promo.toUpperCase() === 'STUDENT20') { setDiscount(Math.floor(baseTotal * 0.2)); showToast('خصم الطلبة شغال 🎓', 'success'); }
    else { showToast('الكود ده مش شغال أو منتهي', 'error'); setDiscount(0); }
  };

  const handlePayment = () => {
    const bookability = getTripBookability(trip);
    if (!bookability.canBook) {
      showToast(bookability.reason, 'error');
      return;
    }
    if (!isWalletSufficient) return;
    if (seats.length !== passengers || new Set(seats).size !== passengers) {
      showToast('عدد المقاعد المختارة لازم يساوي عدد الركاب', 'error');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const pnr = `TRQ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      setWallet((p) => p - finalTotal);
      setTransactions((p) => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: finalTotal, date: getLocalDateInputValue(), desc: `تذكرة: ${trip.from} - ${trip.to}` }, ...p]);

      const ticket = {
        ...trip,
        pnr,
        bookingDate: getLocalDateInputValue(),
        selectedSeats: seats,
        finalTotal,
        luggage: hasLuggage,
        ride: rideToStation,
        access: needsAccess,
        paymentMethod: 'wallet',
        status: 'upcoming',
        earnedPointsPending: pointsToAwardLater,
        pointsAwarded: false,
      };

      const invoice = {
        pnr,
        total: finalTotal,
        method: 'محفظة طريقي',
        date: new Date().toLocaleString('ar-EG'),
        items: [
          { name: `تذاكر (${passengers})`, price: baseTotal },
          ...(hasLuggage ? [{ name: 'وزن إضافي', price: luggageFee }] : []),
          ...(rideToStation ? [{ name: 'أوبر للمحطة', price: rideFee }] : []),
          ...(autoDiscount ? [{ name: 'خصم الباقة', price: -autoDiscount }] : []),
          ...(discount ? [{ name: 'كود خصم', price: -discount }] : []),
        ],
      };

      setIsProcessing(false);
      onSuccess(ticket, invoice);
    }, 1200);
  };

  return (
    <div className="flex flex-col flex-1 p-5 space-y-5 max-w-xl mx-auto w-full">
      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 shrink-0">تأكيد ودفع 💳</h2>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden shrink-0">
        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2"></div>
        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-slate-50 dark:bg-slate-950 rounded-full -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-4 left-4 h-px border-t-2 border-dashed border-slate-100 dark:border-slate-700 -translate-y-1/2 z-0"></div>

        <div className="relative z-10 pb-6">
          <div className="flex justify-between font-black text-lg text-slate-800 dark:text-slate-100 mb-1">
            <span>{trip.from}</span><ArrowRightLeft className="w-5 h-5 text-slate-300" /><span>{trip.to}</span>
          </div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 text-left" dir="ltr">{trip.departureTime} • {trip.date}</div>
        </div>

        <div className="relative z-10 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="block text-[10px] text-slate-400 mb-1">الشركة والدرجة</span><span className="font-bold text-slate-700 dark:text-slate-200">{trip.company} - {trip.class}</span></div>
            <div className="text-left"><span className="block text-[10px] text-slate-400 mb-1">المقاعد ({passengers})</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{seats.join(', ')}</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-3 shrink-0">
        <div onClick={() => setHasLuggage(!hasLuggage)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${hasLuggage ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${hasLuggage ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{hasLuggage && <Check className="w-4 h-4" />}</div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">وزن إضافي (أكثر من 20 كجم) 📦</span>
          </div>
          <span className="font-black text-sm text-indigo-600 dark:text-indigo-400" dir="ltr">+50 ج.م</span>
        </div>

        <div onClick={() => setRideToStation(!rideToStation)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${rideToStation ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${rideToStation ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{rideToStation && <Check className="w-4 h-4" />}</div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">احجزلي أوبر للمحطة <Car className="w-4 h-4 text-slate-400" /></span>
          </div>
          <span className="font-black text-sm text-indigo-600 dark:text-indigo-400" dir="ltr">+80 ج.م</span>
        </div>

        <div onClick={() => setNeedsAccess(!needsAccess)} className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-colors ${needsAccess ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 ${needsAccess ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>{needsAccess && <Check className="w-4 h-4" />}</div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1">طلب مساعدة بالصعود / كرسي متحرك <Accessibility className="w-4 h-4 text-emerald-500" /></span>
          </div>
          <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">مجاناً</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 flex shrink-0">
        <div className="flex-1 relative">
          <Tag className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" placeholder="عندك كود خصم؟" value={promo} onChange={(e) => setPromo(e.target.value)} className="w-full bg-transparent h-12 pr-10 pl-3 text-base text-right font-bold outline-none dark:text-white uppercase" />
        </div>
        <button onClick={applyPromo} className="bg-slate-900 dark:bg-indigo-600 text-white px-5 rounded-xl font-bold text-sm hover:opacity-90 transition">تفعيل</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-slate-400" /> الحساب كام؟</h3>
        <div className="space-y-3 text-sm font-bold">
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>تذاكر x {passengers}</span><span dir="ltr">{baseTotal} ج.م</span></div>
          {luggageFee > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>وزن إضافي</span><span dir="ltr">{luggageFee} ج.م</span></div>}
          {rideFee > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>أوبر للمحطة</span><span dir="ltr">{rideFee} ج.م</span></div>}
          {autoDiscount > 0 && <div className="flex justify-between text-emerald-500"><span>خصم الباقة ({subscription === 'vip' ? 'VIP' : 'طالب'})</span><span dir="ltr">-{autoDiscount} ج.م</span></div>}
          {discount > 0 && <div className="flex justify-between text-emerald-500"><span>كود خصم</span><span dir="ltr">-{discount} ج.م</span></div>}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between font-black text-xl text-slate-900 dark:text-white">
            <span>المطلوب دفعه</span><span className="text-indigo-600 dark:text-indigo-400" dir="ltr">{finalTotal} ج.م</span>
          </div>
          <div className="text-[10px] text-center text-slate-400 bg-slate-50 dark:bg-slate-900 py-1.5 rounded-lg flex items-center justify-center gap-1">
            <Award className="w-3 h-3 text-indigo-500" /> هتاخد {pointsToAwardLater} نقطة ولاء بعد ما الرحلة تنتهي
          </div>
        </div>
      </div>

      {!tripBookability.canBook && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{tripBookability.reason}</p>
          <p className="text-[11px] text-rose-500/80 mt-2">اختر رحلة أبعد من موعد التحرك بساعتين على الأقل.</p>
        </div>
      )}

      {!isWalletSufficient && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">رصيد محفظتك ({wallet} ج.م) مش مكفي.</p>
          <button onClick={() => openModal('topup')} className="text-indigo-600 dark:text-indigo-400 font-black text-sm underline underline-offset-2">اشحن المحفظة دلوقتي من هنا 💳</button>
        </div>
      )}

      <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 py-4 pb-8 z-20 pointer-events-none">
        <button onClick={handlePayment} disabled={!isWalletSufficient || isProcessing || !tripBookability.canBook}
          className={`w-full max-w-[400px] mx-auto font-black text-lg py-4 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 pointer-events-auto
            ${isWalletSufficient && !isProcessing && tripBookability.canBook ? 'bg-indigo-600 text-white shadow-indigo-600/30 active:scale-95' : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'}`}
        >
          {isProcessing ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <>ادفع من المحفظة وأكد الحجز</>}
        </button>
      </div>
    </div>
  );
}

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

function TripsView({ trips, setMyTrips, processRefund, onViewTicket, showToast }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancelingTrip, setCancelingTrip] = useState(null);

  const computedTrips = useMemo(() => {
    return trips.map((t) => {
      if (t.status !== 'upcoming') return t;
      const lifecycle = getTripLifecycleStatus(t);
      if (lifecycle.key === 'arrived') return { ...t, status: 'past' };
      return t;
    });
  }, [trips]);

  const confirmCancel = () => {
    if (!cancelingTrip) return;
    processRefund(cancelingTrip);
    setCancelingTrip(null);
  };

  const cancelPolicy = cancelingTrip ? getCancellationPolicy(cancelingTrip) : null;

  const filteredTrips = computedTrips.filter((t) =>
    activeTab === 'upcoming'
      ? ['upcoming', 'refund_pending'].includes(t.status)
      : ['cancelled', 'past'].includes(t.status)
  );

  return (
    <div className="p-5 lg:px-16 space-y-5 flex-1 w-full">
      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">تذاكري 🎫</h2>

      <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl flex max-w-md mx-auto mb-8">
        <button onClick={() => setActiveTab('upcoming')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>تذاكر جاية</button>
        <button onClick={() => setActiveTab('past')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'past' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>سابقة وملغية</button>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 max-w-2xl mx-auto w-full">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600" /></div>
          <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 mb-1">مفيش تذاكر هنا</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">احجز أول رحلة ليك وعيش المغامرة يا بطل!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredTrips.map((trip) => {
            const policy = getCancellationPolicy(trip);

            return (
              <div key={trip.pnr} onClick={() => ['upcoming', 'past'].includes(trip.status) && onViewTicket(trip)}
                   className={`bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border ${['cancelled', 'refund_pending'].includes(trip.status) ? 'border-rose-100 dark:border-rose-900/30 opacity-80' : 'border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow'}`}>

                <div className="flex justify-between items-center mb-4">
                   <span className="font-mono font-bold text-slate-500 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">PNR: {trip.pnr?.replace('TRQ-','') || ''}</span>
                   {trip.status === 'cancelled' ? (
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg">ملغية</span>
                   ) : trip.status === 'refund_pending' ? (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3 animate-spin"/> جاري الإلغاء</span>
                   ) : trip.status === 'past' ? (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> انتهت</span>
                   ) : (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> مؤكدة</span>
                   )}
                </div>

                <div className="flex justify-between items-center font-black text-lg text-slate-800 dark:text-slate-100 mb-1">
                   <span>{trip.from}</span>
                   <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-slate-700 mx-4 relative"><BusFront className="w-4 h-4 text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 px-0.5"/></div>
                   <span>{trip.to}</span>
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 text-left" dir="ltr">{trip.date} • {trip.departureTime}</div>

                {trip.status === 'upcoming' && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                     <button onClick={(e) => { e.stopPropagation(); onViewTicket(trip); }} className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold py-2.5 rounded-xl text-sm transition-colors">التذكرة</button>
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (!policy.allowed) {
                           showToast(policy.message, 'error');
                           return;
                         }
                         setCancelingTrip(trip);
                       }}
                       className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors ${policy.allowed ? 'bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                     >
                       {policy.allowed ? 'إلغاء' : 'فات وقت الإلغاء'}
                     </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cancelingTrip && cancelPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[428px] rounded-[2rem] p-6 shadow-2xl relative">
            <button onClick={() => setCancelingTrip(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="w-7 h-7" /></div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">متأكد إنك عايز تلغي؟</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">{cancelPolicy.label} • {cancelingTrip.company}</p>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 space-y-3 text-sm font-bold">
               <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>قيمة التذكرة:</span> <span dir="ltr">{cancelingTrip.finalTotal} ج.م</span></div>
               <div className="flex justify-between text-rose-600 dark:text-rose-400"><span>رسوم الإلغاء ({(cancelPolicy.feeRatio * 100).toFixed(0)}%):</span> <span dir="ltr">-{Math.round(cancelingTrip.finalTotal * cancelPolicy.feeRatio)} ج.م</span></div>
               <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-lg text-emerald-600 dark:text-emerald-400"><span>المبلغ المسترد:</span> <span dir="ltr">{cancelPolicy.refundAmount} ج.م</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCancelingTrip(null)} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition">لا، خليها</button>
              <button onClick={confirmCancel} disabled={!cancelPolicy.allowed} className={`flex-1 py-4 rounded-2xl font-black transition shadow-lg ${cancelPolicy.allowed ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'}`}>أكد الإلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketView({ ticket, user, onTrack, showToast }) {
  if (!ticket) return null;

  const downloadTicket = () => showToast('نزلنا نسخة تجريبية من التذكرة عندك يا غالي 🖼️', 'success');
  const shareFare = () => showToast('الميزة دي هتكون متاحة لما نظام الأصدقاء والمحفظة يبقوا حقيقيين', 'error');

  return (
    <div className="flex flex-col flex-1 p-5 pt-8 items-center w-full max-w-2xl mx-auto">
       <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative border border-slate-200 dark:border-slate-700 shrink-0 mb-6">
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-center relative">
             <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-slate-50 dark:bg-slate-950 rounded-full border-t border-l border-slate-200 dark:border-slate-700"></div>
             <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-slate-50 dark:bg-slate-950 rounded-full border-t border-r border-slate-200 dark:border-slate-700"></div>
             <div><span className="text-[10px] text-indigo-200 font-bold tracking-widest uppercase block mb-1">Booking Ref (PNR)</span><h2 className="text-2xl font-black font-mono tracking-widest" dir="ltr">{ticket.pnr?.replace('TRQ-','') || ''}</h2></div>
             <div className="text-left">
               <span className={`px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${ticket.status === 'past' ? 'bg-slate-800 text-slate-300' : 'bg-white/20 text-white'}`}>
                 {ticket.status === 'past' ? 'رحلة منتهية' : <><CheckCircle2 className="w-3 h-3"/> صالحة للركوب</>}
               </span>
             </div>
          </div>

          <div className="p-6 relative border-b-2 border-dashed border-slate-200 dark:border-slate-700">
             <div className="flex justify-between items-center mb-6">
                <div className="text-center w-1/3"><span className="text-3xl font-black text-slate-800 dark:text-white block leading-none mb-1">{ticket.from.substring(0,3)}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ticket.from}</span></div>
                <div className="flex-1 flex justify-center"><div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center"><BusFront className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /></div></div>
                <div className="text-center w-1/3"><span className="text-3xl font-black text-slate-800 dark:text-white block leading-none mb-1">{ticket.to.substring(0,3)}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ticket.to}</span></div>
             </div>

             <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">الراكب</span><span className="font-bold text-slate-800 dark:text-slate-200">{user.name}</span></div>
                <div className="text-left"><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">التاريخ</span><span className="font-bold text-slate-800 dark:text-slate-200" dir="ltr">{ticket.date}</span></div>
                <div><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">التحرك</span><span className="font-black text-indigo-600 dark:text-indigo-400 text-lg" dir="ltr">{ticket.departureTime}</span></div>
                <div className="text-left"><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">كراسي</span><span className="font-black text-slate-800 dark:text-slate-200 text-lg" dir="ltr">{ticket.selectedSeats?.join(', ') || ''}</span></div>
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500">الشركة: <span className="text-slate-800 dark:text-slate-200">{ticket.company}</span></span>
                <span className="text-slate-500">الدرجة: <span className="text-slate-800 dark:text-slate-200">{ticket.class}</span></span>
             </div>
          </div>

          <div className={`p-6 bg-white dark:bg-slate-800 flex flex-col items-center ${ticket.status === 'past' ? 'opacity-50' : ''}`}>
             <p className="text-[10px] font-bold text-slate-400 mb-3 text-center">ده رمز صعود تجريبي لعرض شكل التذكرة فقط</p>
             <div className="p-2 border-2 border-slate-100 dark:border-slate-700 rounded-2xl bg-white"><QrCode className="w-28 h-28 text-slate-800" /></div>
          </div>
       </div>

       {ticket.selectedSeats?.length > 1 && ticket.status !== 'past' && (
         <button onClick={shareFare} className="w-full max-w-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 mb-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition active:scale-95 border border-emerald-200 dark:border-emerald-800">
            <Users className="w-5 h-5"/> الميزة دي هتتوفر لاحقاً مع الأصدقاء
         </button>
       )}

       <div className="sticky bottom-0 mt-auto w-full max-w-[400px] flex gap-3 py-4 pb-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pointer-events-none z-20">
          <button onClick={onTrack} className="flex-1 pointer-events-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"><Map className="w-5 h-5"/> تتبع الحافلة</button>
          <button onClick={downloadTicket} className="flex-1 pointer-events-auto bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"><Download className="w-5 h-5"/> حفظ كصورة</button>
       </div>
    </div>
  );
}

function TrackingView({ ticket, showToast, openModal }) {
  if (!ticket) return null;

  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const lifecycle = useMemo(() => getTripLifecycleStatus(ticket, now), [ticket, now]);
  const routeMeta = ROUTE_META[`${ticket.from}-${ticket.to}`] || { hasRestStop: ticket.durationHour >= 4.5 };
  const progress = lifecycle.progress;
  const statusText = lifecycle.statusText;
  const isMoving = ['en_route', 'rest_stop', 'final_approach'].includes(lifecycle.key);
  const busTopPosition = `${progress}%`;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden w-full">
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>

      <div className="relative z-10 p-5 pt-8 flex-1 flex flex-col items-center justify-center pb-24 max-w-md mx-auto w-full">
         <div className="flex gap-2 w-full mb-4">
            <button onClick={() => showToast('مشاركة الرحلة هتكون متاحة لما يبقى فيه رابط فعلي للحالة', 'error')} className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-center items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300 active:scale-95 transition"><Share2 className="w-4 h-4" /> شارك الرحلة</button>
            <button onClick={() => showToast('زر الطوارئ ده تجريبي حالياً', 'error')} className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex justify-center items-center shadow-sm active:scale-95 transition"><ShieldAlert className="w-5 h-5" /></button>
         </div>

         {ticket.driver && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 w-full mb-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-2xl">{ticket.driver.img}</div>
                  <div>
                     <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{ticket.driver.name}</h4>
                     <p className="text-[10px] text-slate-500">كابتن الرحلة • {ticket.driver.trips} رحلة سابقة</p>
                  </div>
               </div>
               <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-xs"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {ticket.driver.rating}</div>
            </div>
         )}

         <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 w-full mb-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-indigo-500"></div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{progress === 100 ? 'وقت الوصول (وصلت)' : 'الوصول المتوقع حسب الجدول'}</p>
            <h2 className="text-4xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{ticket.arrivalTime}</h2>
            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${progress === 100 ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : lifecycle.key === 'rest_stop' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
               {progress < 100 && <span className={`w-2 h-2 rounded-full ${lifecycle.key === 'rest_stop' ? 'bg-orange-500' : 'bg-emerald-500'} ${isMoving ? 'animate-pulse' : ''}`}></span>}
               {statusText}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">دي متابعة تقديرية حسب الجدول وليست GPS مباشر.</p>
         </div>

         <div className="w-1.5 bg-slate-200 dark:bg-slate-700 h-[300px] relative rounded-full">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-5 h-5 bg-indigo-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-10"></div>
            <div className="absolute top-0 right-8 text-sm font-black dark:text-white w-24 whitespace-nowrap">{ticket.from}</div>
            <div className="absolute top-0 left-8 text-[10px] font-bold text-slate-400 w-24 text-left whitespace-nowrap" dir="ltr">{ticket.departureTime}</div>

            {routeMeta.hasRestStop && (
              <>
                <div className="absolute top-1/2 right-1/2 translate-x-1/2 w-4 h-4 bg-orange-400 rounded-full border-2 border-slate-50 dark:border-slate-900 z-10 flex items-center justify-center"></div>
                <div className="absolute top-1/2 right-8 text-xs font-bold text-slate-500 dark:text-slate-400 w-24 whitespace-nowrap -translate-y-1/2">استراحة ريست</div>
                <button onClick={() => openModal('food')} className="absolute top-1/2 left-8 bg-orange-50 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800 -translate-y-1/2 whitespace-nowrap flex items-center gap-1 active:scale-95 transition"><Coffee className="w-3 h-3" /> اطلب للريست</button>
              </>
            )}

            <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-50 dark:border-slate-900 z-10"></div>
            <div className="absolute bottom-0 right-8 text-sm font-black dark:text-white w-24 whitespace-nowrap">{ticket.to}</div>
            <div className="absolute bottom-0 left-8 text-[10px] font-bold text-slate-400 w-24 text-left whitespace-nowrap" dir="ltr">{ticket.arrivalTime}</div>

            <div className="absolute top-0 right-0 w-full bg-indigo-500 rounded-t-full transition-all duration-1000" style={{ height: busTopPosition }}></div>

            <div className={`absolute right-1/2 translate-x-1/2 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/40 z-20 transition-all duration-1000 ${isMoving ? 'animate-bounce' : ''}`} style={{ top: `calc(${busTopPosition} - 24px)` }}>
               <BusFront className="w-6 h-6" />
            </div>
         </div>
      </div>
    </div>
  );
}

function WalletView({ wallet, setWallet, transactions, setTransactions, showToast, openTopUp }) {
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
         <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">دي بيانات تجريبية محلية على نفس الجهاز.</p>
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

function TopUpFlowModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    const val = parseInt(amount, 10);
    if (!val || val < 50) return showToast('أقل شحن 50 ج.م', 'error');

    setLoading(true);

    setTimeout(() => {
      setWallet((p) => p + val);
      setTransactions((p) => [
        {
          id: `DEMO-TOPUP-${Date.now()}`,
          type: 'credit',
          amount: val,
          date: getLocalDateInputValue(),
          desc: 'شحن رصيد تجريبي',
        },
        ...p,
      ]);
      setLoading(false);
      showToast(`تمت إضافة ${val} ج.م رصيد تجريبي`, 'success');
      closeModal();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[428px] rounded-[2rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white">
           <X className="w-5 h-5"/>
        </button>

        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 pt-2">شحن المحفظة</h3>
        <p className="text-sm font-bold text-slate-500 mb-6">دي محفظة تجريبية وليست وسيلة دفع حقيقية.</p>

        <div className="space-y-5">
          <input
            type="number"
            placeholder="المبلغ المراد إضافته"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-4 text-xl font-black text-center text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition"
          />

          <div className="flex gap-2 mb-2" dir="ltr">
            {[100, 200, 500].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 hover:border-indigo-300 transition-colors text-lg"
              >
                +{v}
              </button>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl mt-4 active:scale-95 transition-transform shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2"
          >
            {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : 'إضافة رصيد تجريبي'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, points, subscription, isDark, setIsDark, onLogout, showToast, openModal }) {
  const isGold = points >= 1000;
  
  return (
    <div className="p-5 lg:px-16 space-y-6 flex-1 max-w-[1800px] mx-auto w-full">
       <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">حسابي 👤</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
         <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 flex items-center gap-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-500 text-white rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-lg shadow-indigo-500/30">{user.name.charAt(0)}</div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-1">{user.name}</h3>
              <p className="text-sm font-mono text-slate-400 mb-3" dir="ltr">{user.phone}</p>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-max ${isGold ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400'}`}>
                 {isGold ? <Crown className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
                 {isGold ? 'عضو ذهبي' : 'عضو أساسي'}
              </span>
            </div>
         </div>

         <div onClick={()=>openModal('points')} className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center cursor-pointer hover:border-indigo-300 transition group">
            <div className="flex justify-between items-center mb-4">
               <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg"><Award className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform"/> نقاط ولاء طريقي</h4>
               <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors rotate-180" />
            </div>
            <div className="flex items-end justify-between">
               <p className="text-sm font-bold text-slate-500">جمع {1000 - points > 0 ? 1000 - points : 0} نقطة للترقية للذهبي</p>
               <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{points}</div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
               <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (points/1000)*100)}%` }}></div>
            </div>
         </div>
       </div>

       <div className="space-y-3 pt-4 max-w-4xl">
          <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase px-2">إعدادات التطبيق</h4>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
             
             <div onClick={()=>openModal('subs')} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center"><Crown className="w-5 h-5 text-purple-600 dark:text-purple-400"/></div><span className="font-bold text-base dark:text-slate-200">باقات التوفير</span></div>
                {subscription !== 'none' ? <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold">باقة مفعلة</span> : <ChevronRight className="w-5 h-5 text-slate-400 rotate-180"/>}
             </div>
             <div className="h-px bg-slate-100 dark:bg-slate-700 mx-5"></div>
             
             <div onClick={()=>setIsDark(!isDark)} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center"><Moon className="w-5 h-5 text-slate-600 dark:text-slate-400"/></div><span className="font-bold text-base dark:text-slate-200">الوضع الليلي (Dark Mode)</span></div>
                <div className={`w-14 h-7 rounded-full relative transition-colors ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 transition-transform ${isDark ? 'right-0.5 -translate-x-7' : 'left-0.5'}`}></div></div>
             </div>
             <div className="h-px bg-slate-100 dark:bg-slate-700 mx-5"></div>
             
             <div onClick={()=>showToast('اللغة الإنجليزية هتنزل في التحديث اللي جاي 🔜', 'success')} className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center"><Languages className="w-5 h-5 text-slate-600 dark:text-slate-400"/></div><span className="font-bold text-base dark:text-slate-200">لغة التطبيق</span></div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg">عربي 🇪🇬</span>
             </div>
          </div>
       </div>

       <button onClick={onLogout} className="w-full md:max-w-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition active:scale-95 mt-8">
          <LogOut className="w-5 h-5"/> تسجيل الخروج
       </button>
    </div>
  );
}

function PointsModal({ closeModal, wallet, setWallet, setTransactions, points, setPoints, showToast }) {
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

function CourierModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [provider, setProvider] = useState('taree2y');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');

  const calculatePrice = () => {
     if (!fromCity || !toCity || !weight) return 0;
     const baseDist = DIRECT_ROUTES[`${fromCity}-${toCity}`] || 150;
     const weightCost = Number(weight) * 5;
     const provCost = provider === 'super' ? 40 : 0;
     return Math.floor((baseDist * 0.4) + weightCost + provCost);
  };

  const finalPrice = calculatePrice();

  const handleSend = () => {
     if(!fromCity || !toCity || !weight) return showToast('أكمل البيانات الأول من فضلك', 'error');
     if(wallet < finalPrice) return showToast('الرصيد في المحفظة مش مكفي، اشحن الأول.', 'error');
     
     setLoading(true);
     setTimeout(() => {
        setWallet(p => p - finalPrice);
        setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: finalPrice, date: getLocalDateInputValue(), desc: `طرد من ${fromCity} لـ ${toCity}` }, ...p]);
        showToast(`تم تسجيل الطرد بنجاح! خصمنا ${finalPrice} ج.م 📦`, 'success');
        setLoading(false); closeModal();
     }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto hide-scrollbar">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6"><Package className="w-7 h-7"/></div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">طريقي إكسبريس 📦</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">ابعت طرودك لأي محافظة في مصر بسرعة وأمان وتكلفة على قد الإيد.</p>
        
        <div className="space-y-4 mb-8">
           <div className="flex gap-3">
             <select value={fromCity} onChange={e=>setFromCity(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none appearance-none dark:text-white focus:border-indigo-500">
                <option value="">من محافظة</option>{CITIES.map(c=><option key={c}>{c}</option>)}
             </select>
             <select value={toCity} onChange={e=>setToCity(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none appearance-none dark:text-white focus:border-indigo-500">
                <option value="">إلى محافظة</option>{CITIES.map(c=><option key={c}>{c}</option>)}
             </select>
           </div>
           
           <input type="number" placeholder="وزن الطرد بالتقريب (كجم)" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-14 px-4 text-base font-bold outline-none focus:border-indigo-500 dark:text-white placeholder:font-normal" />
           
           <div className="space-y-2 mt-4">
              <h4 className="font-bold text-sm text-slate-500 px-1 mb-2">اختار سرعة التوصيل</h4>
              <div onClick={()=>setProvider('taree2y')} className={`p-4 rounded-xl border-2 flex justify-between cursor-pointer transition-colors ${provider==='taree2y' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20':'border-slate-100 dark:border-slate-800'}`}>
                 <div><span className="font-bold block dark:text-white">توصيل عادي (يومين لـ 3 أيام)</span><span className="text-xs text-slate-500">سعر اقتصادي ومناسب</span></div>
                 {provider==='taree2y' && <CheckCircle2 className="w-5 h-5 text-indigo-600"/>}
              </div>
              <div onClick={()=>setProvider('super')} className={`p-4 rounded-xl border-2 flex justify-between cursor-pointer transition-colors ${provider==='super' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20':'border-slate-100 dark:border-slate-800'}`}>
                 <div><span className="font-bold block dark:text-white">توصيل سوبر (خلال 24 ساعة)</span><span className="text-xs text-amber-600 dark:text-amber-400">أسرع توصيل متاح (+40 ج.م)</span></div>
                 {provider==='super' && <CheckCircle2 className="w-5 h-5 text-amber-500"/>}
              </div>
           </div>
        </div>

        <button onClick={handleSend} disabled={loading || !finalPrice} className={`w-full text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-transform flex justify-center items-center gap-2 ${finalPrice ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/30' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}`}>
          {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : finalPrice ? `أكد الطلب وادفع (${finalPrice} ج.م)` : 'أكمل البيانات لمعرفة السعر'}
        </button>
      </div>
    </div>
  );
}

function SubscriptionsModal({ closeModal, wallet, setWallet, setTransactions, subscription, setSubscription, showToast }) {
  const handleBuy = (subType, price) => {
    if(wallet < price) return showToast('رصيدك مش مكفي، اشحن الأول.', 'error');
    setWallet(p => p - price);
    setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: price, date: getLocalDateInputValue(), desc: `اشتراك باقة ${subType==='student'?'الطالب':'VIP'}` }, ...p]);
    setSubscription(subType);
    showToast('تم تفعيل الباقة بنجاح! استمتع بالخصم الثابت 🎉', 'success');
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Crown className="w-8 h-8 text-amber-500"/> باقات التوفير</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">اشترك دلوقتي ووفر على كل رحلاتك خلال الشهر.</p>
        
        <div className="space-y-4">
           {/* Student Pass */}
           <div className={`p-5 rounded-2xl border-2 ${subscription === 'student' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div><h4 className="font-black text-slate-800 dark:text-white text-lg">باقة الطالب 🎓</h4><p className="text-xs text-slate-500 mt-1">خصم 15% على كل رحلاتك</p></div>
                 <div className="text-xl font-black text-indigo-600 dark:text-indigo-400" dir="ltr">100 ج.م</div>
              </div>
              {subscription === 'student' ? <span className="text-sm font-black text-indigo-600 bg-indigo-100 px-4 py-2 rounded-xl block text-center">باقة مفعلة 🟢</span> : <button onClick={()=>handleBuy('student', 100)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl text-sm transition active:scale-95">اشترك الآن</button>}
           </div>

           {/* VIP Pass */}
           <div className={`p-5 rounded-2xl border-2 ${subscription === 'vip' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-amber-100 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div><h4 className="font-black text-amber-900 dark:text-amber-400 text-lg">باقة كبار الزوار 👑</h4><p className="text-xs text-amber-700/70 dark:text-amber-500/70 mt-1">خصم 25% + تعديل مجاني</p></div>
                 <div className="text-xl font-black text-amber-600" dir="ltr">300 ج.م</div>
              </div>
              {subscription === 'vip' ? <span className="text-sm font-black text-amber-600 bg-amber-100 px-4 py-2 rounded-xl block text-center">باقة مفعلة 🟢</span> : <button onClick={()=>handleBuy('vip', 300)} className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-amber-500/30 transition active:scale-95">اشترك الآن</button>}
           </div>
        </div>
      </div>
    </div>
  );
}

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

function FoodOrderModal({ closeModal, wallet, setWallet, setTransactions, showToast }) {
  const handleOrder = (price, item) => {
     if(wallet < price) return showToast('رصيدك مش مكفي، اشحن من المحفظة الأول', 'error');
     setWallet(p => p - price);
     setTransactions(p => [{ id: `TXN-${Math.random().toString(36).substr(2,6).toUpperCase()}`, type: 'debit', amount: price, date: getLocalDateInputValue(), desc: `طلب ${item} في الريست` }, ...p]);
     showToast('طلبك اتسجل! هيستناك سخن لما الباص يقف في الريست ☕', 'success');
     closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in-down">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={closeModal} className="absolute top-6 left-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Coffee className="w-8 h-8 text-orange-500"/> اطلب للريست</h3>
        <p className="text-sm font-bold text-slate-500 mb-8">اطلب دلوقتي و استلم على طول لما الباص يقف من غير طوابير.</p>
        
        <div className="space-y-4">
           {[{name:'قهوة تركي مظبوط', p:30}, {name:'باتيه جبنة طازة', p:25}, {name:'وجبة مكس جريل خفيفة', p:95}].map((item, i) => (
             <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div><h4 className="font-bold text-base dark:text-white mb-1">{item.name}</h4><span className="text-sm font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{item.p} ج.م</span></div>
                <button onClick={()=>handleOrder(item.p, item.name)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition">اطلب</button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}


// ==========================================
// Login / Register Screen
// ==========================================
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