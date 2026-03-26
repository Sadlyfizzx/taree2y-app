export const APP_TOKENS = {
  colors: {
    brand: '#2156D9',
    brandStrong: '#163C98',
    brandInk: '#10233F',
    accent: '#0F9F8A',
    success: '#0D7F5F',
    warning: '#B86A0E',
    danger: '#C53652',
    light: {
      bg: '#F5F7FB',
      bgMuted: '#EDF2FB',
      surface: '#FFFFFF',
      surfaceSoft: '#F7FAFF',
      text: '#101828',
      textMuted: '#546179',
      line: 'rgba(15, 23, 42, 0.08)',
    },
    dark: {
      bg: '#050B15',
      bgMuted: '#08111D',
      surface: '#0F1726',
      surfaceSoft: '#111C2E',
      text: '#EEF3FF',
      textMuted: '#B7C3D8',
      line: 'rgba(148, 163, 184, 0.16)',
    },
  },
  radii: {
    card: '28px',
    panel: '34px',
    sheet: '32px',
    pill: '999px',
  },
  shadows: {
    surface: '0 24px 60px -38px rgba(16,35,63,0.18), 0 10px 24px -18px rgba(16,35,63,0.12)',
    elevated: '0 34px 80px -44px rgba(16,35,63,0.24), 0 18px 38px -24px rgba(16,35,63,0.18)',
    floating: '0 42px 90px -48px rgba(16,35,63,0.44), 0 18px 40px -24px rgba(16,35,63,0.24)',
  },
  motion: {
    fast: 160,
    base: 220,
    slow: 320,
  },
  tap: {
    minimum: 48,
    comfortable: 56,
  },
};

export const BOOKING_FLOW_STEPS = [
  { key: 'results', label: 'اختيار الرحلة' },
  { key: 'seats', label: 'اختيار المقاعد' },
  { key: 'checkout', label: 'المراجعة والدفع' },
  { key: 'confirmation', label: 'التذكرة' },
];

export const STATUS_META = {
  upcoming: { label: 'مؤكدة', tone: 'success' },
  refund_pending: { label: 'استرداد جاري', tone: 'warning' },
  cancelled: { label: 'ملغية', tone: 'danger' },
  past: { label: 'منتهية', tone: 'neutral' },
};

export const MAIN_NAV_ITEMS = [
  { key: 'home', label: 'الرئيسية' },
  { key: 'bookings', label: 'رحلاتي' },
  { key: 'tickets', label: 'التذاكر' },
  { key: 'wallet', label: 'المحفظة' },
  { key: 'profile', label: 'الحساب' },
];
