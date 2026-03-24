import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, QrCode } from 'lucide-react';
import { MetaChip, cx } from './AppPrimitives';

function normalizeDisplayValue(value = '') {
  const text = String(value || '').trim();
  if (!text) return '—';
  if (text.length <= 28) return text;
  return `${text.slice(0, 12)}…${text.slice(-8)}`;
}

function isProbablyUrl(value = '') {
  return /^https?:\/\//i.test(String(value || '').trim());
}

export default function PrettyQrCard({
  value,
  title = 'رمز المتابعة',
  subtitle = 'اعرض الكود أو افتح الرابط مباشرة.',
  chipLabel,
  codeLabel = 'الرمز',
  compact = false,
  className = '',
}) {
  const [qrDataUrl, setQrDataUrl] = React.useState('');

  const safeValue = String(value || '').trim();
  const displayValue = useMemo(() => normalizeDisplayValue(safeValue), [safeValue]);
  const openable = useMemo(() => isProbablyUrl(safeValue), [safeValue]);

  React.useEffect(() => {
    let active = true;
    if (!safeValue) {
      setQrDataUrl('');
      return undefined;
    }

    QRCode.toDataURL(safeValue, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: compact ? 220 : 280,
      color: {
        dark: '#163C98',
        light: '#F8FBFF',
      },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [compact, safeValue]);

  return (
    <section
      className={cx(
        'overflow-hidden rounded-[28px] border border-indigo-100 bg-[linear-gradient(160deg,#163c98_0%,#2156d9_56%,#0f9f8a_140%)] p-4 text-white shadow-[0_24px_60px_-28px_rgba(16,35,63,0.38)] dark:border-indigo-900/50',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">{title}</p>
          <p className="mt-1 text-sm font-bold text-white/80">{subtitle}</p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 text-white">
          <QrCode className="h-5 w-5" />
        </span>
      </div>

      {chipLabel ? <MetaChip label={chipLabel} className="mt-4 border-white/10 bg-white/10 text-white" /> : null}

      <div className="mt-4 rounded-[30px] bg-white p-4 shadow-inner">
        <div className="relative overflow-hidden rounded-[26px] border border-slate-100 bg-[radial-gradient(circle_at_top_right,rgba(33,86,217,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-4">
          <div className="pointer-events-none absolute inset-x-6 top-6 h-20 rounded-full bg-[radial-gradient(circle,rgba(33,86,217,0.12),transparent_70%)]" />
          {qrDataUrl ? (
            <div className="relative mx-auto w-full max-w-[260px] rounded-[24px] border border-slate-100 bg-white p-3 shadow-[0_18px_40px_-26px_rgba(16,35,63,0.28)]">
              <div className="overflow-hidden rounded-[18px] bg-[#F8FBFF] p-2">
                <img src={qrDataUrl} alt={title} className="mx-auto block w-full max-w-[220px] rounded-[14px]" />
              </div>
            </div>
          ) : (
            <div className="mx-auto grid h-[240px] max-w-[260px] place-items-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-slate-400">
              جاري تجهيز الكود…
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[22px] bg-white/10 px-4 py-3">
        <p className="text-xs font-black tracking-[0.14em] text-white/65">{codeLabel}</p>
        <p className="mt-1 break-words text-sm font-black leading-6">{displayValue}</p>
      </div>

      {openable ? (
        <a
          href={safeValue}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/14"
        >
          افتح الرابط
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </section>
  );
}
