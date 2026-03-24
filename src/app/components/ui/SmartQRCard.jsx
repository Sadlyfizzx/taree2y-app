import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import { cx } from './AppPrimitives';

const accentClasses = {
  brand: 'from-[#10233f] via-[#163c98] to-[#2156d9]',
  emerald: 'from-[#0b3b39] via-[#0f9f8a] to-[#0f766e]',
};

export default function SmartQRCard({
  value,
  title,
  subtitle,
  code,
  accent = 'brand',
  className = '',
  qrBoxClassName = '',
}) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!value) {
      setDataUrl('');
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H',
      margin: 0,
      width: 520,
      color: {
        dark: '#10233f',
        light: '#ffffff',
      },
    })
      .then((nextUrl) => {
        if (active) setDataUrl(nextUrl);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [value]);

  const gradientClassName = useMemo(
    () => accentClasses[accent] || accentClasses.brand,
    [accent],
  );

  return (
    <section
      className={cx(
        `relative overflow-hidden rounded-[32px] bg-gradient-to-br ${gradientClassName} p-[1px] shadow-[0_24px_60px_-28px_rgba(16,35,63,0.45)]`,
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[31px] bg-white/96 p-5 dark:bg-slate-950/92">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at top right, rgba(33,86,217,0.10), transparent 26%), linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px)',
            backgroundSize: 'auto, 24px 24px, 24px 24px',
          }}
        />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
          <div className={cx('mx-auto w-full max-w-[230px] shrink-0', qrBoxClassName)}>
            <div className="rounded-[30px] bg-gradient-to-br from-slate-100 to-white p-3 shadow-inner ring-1 ring-slate-200 dark:from-slate-900 dark:to-slate-950 dark:ring-slate-800">
              <div className="rounded-[24px] bg-white p-4 shadow-[0_16px_34px_-20px_rgba(16,35,63,0.35)] dark:bg-slate-900">
                <div className="aspect-square overflow-hidden rounded-[18px] bg-white p-2">
                  {dataUrl ? (
                    <img src={dataUrl} alt={title || 'QR'} className="h-full w-full rounded-[14px] object-contain" />
                  ) : (
                    <div className="grid h-full w-full place-items-center rounded-[14px] border border-dashed border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      <QrCode className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-right">
            {title ? <h3 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h3> : null}
            {subtitle ? (
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
            {code ? (
              <div className="mt-4 inline-flex max-w-full rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span className="truncate" dir="ltr">{code}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
