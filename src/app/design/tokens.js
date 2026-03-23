export const APP_TOKENS = {
  colors: {
    brand: '#2156D9',
    brandStrong: '#163C98',
    brandInk: '#10233F',
    accent: '#0F9F8A',
    sand: '#F8F4EC',
    paper: '#FFFFFF',
    soft: '#EEF4FF',
    success: '#047857',
    warning: '#B45309',
    danger: '#BE123C',
    line: 'rgba(15, 23, 42, 0.08)',
    lineStrong: 'rgba(15, 23, 42, 0.16)',
  },
  radii: {
    card: '28px',
    sheet: '32px',
    pill: '999px',
  },
  shadows: {
    card: '0 20px 45px -28px rgba(16, 35, 63, 0.35)',
    floating: '0 24px 60px -28px rgba(16, 35, 63, 0.4)',
  },
  motion: {
    fast: 180,
    base: 240,
    slow: 320,
  },
  tap: {
    minimum: 48,
    comfortable: 56,
  },
};

export const BOOKING_FLOW_STEPS = [
  { key: 'results', label: 'الرحلة' },
  { key: 'seats', label: 'المقاعد' },
  { key: 'checkout', label: 'الدفع' },
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
  { key: 'trips', label: 'رحلاتي' },
  { key: 'wallet', label: 'المحفظة' },
  { key: 'profile', label: 'حسابي' },
];
