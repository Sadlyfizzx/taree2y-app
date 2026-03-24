import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { formatCurrency, formatSeatsText } from './formatting';
import { buildTripPublicTrackingUrl } from './share';

function normalizeCode(value, fallbackPrefix = 'TRQ') {
  const raw = String(value || '').trim();
  if (!raw) return `${fallbackPrefix}-PENDING`;
  if (raw.length <= 34) return raw;
  return `${raw.slice(0, 12)}…${raw.slice(-8)}`;
}


async function ensureCairoFontReady() {
  if (typeof document === 'undefined' || !document.fonts?.load) return;

  try {
    await Promise.all([
      document.fonts.load("400 16px Cairo"),
      document.fonts.load("600 16px Cairo"),
      document.fonts.load("700 16px Cairo"),
      document.fonts.load("800 16px Cairo"),
    ]);
  } catch {
    // fall back silently if the web font is unavailable
  }
}

async function buildQrDataUrl(value) {
  return QRCode.toDataURL(String(value || '').trim(), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#163C98',
      light: '#F8FBFF',
    },
  });
}

function buildTicketMarkup({ ticket, user, qrDataUrl, trackingUrl }) {
  const pnr = normalizeCode(ticket?.pnr, 'TRQ');
  const driverCode = normalizeCode(ticket?.driverTripCode || ticket?.tripPublicCode || ticket?.tripCode || ticket?.ticketToken, 'DRV');
  const travelTips = 'وصل المحطة قبل التحرك بـ 20 دقيقة على الأقل.';

  return `
    <div style="width:100%;background:#eef4ff;padding:24px;font-family:'Cairo','Segoe UI',Tahoma,Arial,system-ui,sans-serif;direction:rtl;box-sizing:border-box;">
      <div style="max-width:860px;margin:0 auto;background:#ffffff;border-radius:32px;overflow:hidden;box-shadow:0 24px 60px -32px rgba(16,35,63,.35);border:1px solid rgba(15,23,42,.08);">
        <div style="background:linear-gradient(135deg,#10233f 0%,#163c98 48%,#2156d9 100%);color:#fff;padding:28px 28px 24px;">
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
            <div>
              <div style="font-size:12px;font-weight:800;opacity:.72;">اسم الراكب</div>
              <div style="margin-top:8px;font-size:28px;font-weight:900;line-height:1.2;">${user?.name || 'راكب طريقي'}</div>
            </div>
            <div style="text-align:left;">
              <div style="font-size:34px;font-weight:900;line-height:1;">طريقي</div>
              <div style="margin-top:8px;font-size:13px;font-weight:700;opacity:.8;">تذكرة سفر رقمية حديثة وواضحة</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
            <span style="display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:900;">${driverCode}</span>
            <span style="display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:900;">${pnr}</span>
          </div>
        </div>

        <div style="padding:22px;">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:22px;border:1px solid rgba(15,23,42,.08);border-radius:24px;background:#fbfdff;">
            <div style="text-align:right;">
              <div style="font-size:13px;font-weight:800;color:#64748b;">من</div>
              <div style="margin-top:6px;font-size:36px;font-weight:900;color:#10233f;line-height:1.1;">${ticket?.from || '—'}</div>
              <div style="margin-top:6px;font-size:14px;font-weight:700;color:#475569;">${ticket?.fromStationName || 'المحطة الرئيسية'}</div>
            </div>
            <div style="display:flex;align-items:center;justify-content:center;">
              <div style="display:flex;align-items:center;gap:12px;min-width:120px;justify-content:center;">
                <span style="width:32px;height:2px;background:#dbe4f4;border-radius:999px;"></span>
                <span style="display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:#2156d9;color:#fff;font-size:20px;font-weight:900;">←</span>
                <span style="width:32px;height:2px;background:#dbe4f4;border-radius:999px;"></span>
              </div>
            </div>
            <div style="text-align:left;">
              <div style="font-size:13px;font-weight:800;color:#64748b;">إلى</div>
              <div style="margin-top:6px;font-size:36px;font-weight:900;color:#10233f;line-height:1.1;">${ticket?.to || '—'}</div>
              <div style="margin-top:6px;font-size:14px;font-weight:700;color:#475569;">${ticket?.toStationName || 'المحطة الرئيسية'}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px;">
            ${[
              ['تاريخ الرحلة', ticket?.date || '—'],
              ['ميعاد التحرك', ticket?.departureTime || '—'],
              ['ميعاد الوصول', ticket?.arrivalTime || '—'],
              ['مدة الرحلة', ticket?.durationHour ? `${ticket.durationHour} س` : '—'],
              ['المقاعد', formatSeatsText(ticket?.selectedSeats || [])],
              ['إجمالي الدفع', formatCurrency(ticket?.finalTotal || ticket?.price || 0)],
              ['الدرجة', ticket?.class || '—'],
              ['الشركة', ticket?.company || '—'],
              ['اسم الراكب', user?.name || '—'],
            ].map(([label, value]) => `
              <div style="border:1px solid rgba(15,23,42,.08);border-radius:20px;background:#fff;padding:16px;min-height:94px;box-sizing:border-box;">
                <div style="font-size:12px;font-weight:800;color:#64748b;">${label}</div>
                <div style="margin-top:10px;font-size:30px;font-weight:900;color:#10233f;line-height:1.2;word-break:break-word;overflow-wrap:anywhere;">${value}</div>
              </div>
            `).join('')}
          </div>

          <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;margin-top:18px;align-items:stretch;">
            <div style="display:grid;gap:14px;align-content:start;">
              <div style="border:1px solid rgba(15,23,42,.08);border-radius:24px;background:#fff;padding:18px;">
                <div style="font-size:24px;font-weight:900;color:#10233f;">ملاحظة مهمة</div>
                <div style="margin-top:12px;font-size:16px;font-weight:800;line-height:1.85;color:#334155;">${travelTips}</div>
              </div>

              <div style="border:1px solid rgba(15,23,42,.08);border-radius:24px;background:#fff;padding:18px;">
                <div style="font-size:18px;font-weight:900;color:#10233f;">أكواد الرحلة</div>
                <div style="margin-top:12px;display:grid;gap:10px;">
                  <div style="padding:12px 14px;border-radius:18px;background:#f7faff;font-size:13px;font-weight:800;color:#10233f;word-break:break-word;overflow-wrap:anywhere;">كود التذكرة: ${pnr}</div>
                  <div style="padding:12px 14px;border-radius:18px;background:#f7faff;font-size:13px;font-weight:800;color:#10233f;word-break:break-word;overflow-wrap:anywhere;">كود تشغيل السائق: ${driverCode}</div>
                </div>
              </div>
            </div>

            <div style="border-radius:28px;overflow:hidden;background:linear-gradient(160deg,#163c98 0%,#2156d9 56%,#0f9f8a 140%);color:#fff;padding:18px;box-sizing:border-box;min-height:100%;">
              <div style="font-size:34px;font-weight:900;line-height:1.1;">QR متابعة الرحلة</div>
              <div style="margin-top:8px;font-size:14px;font-weight:700;line-height:1.7;color:rgba(255,255,255,.86);">امسح الكود لفتح رابط المتابعة مباشرة.</div>
              <div style="margin-top:14px;display:inline-flex;align-items:center;padding:9px 13px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:900;">${driverCode}</div>
              <div style="margin-top:18px;border-radius:28px;background:#fff;padding:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.7);">
                <div style="border-radius:24px;background:radial-gradient(circle at top right,rgba(33,86,217,.10),transparent 28%),linear-gradient(180deg,#fff 0%,#f4f8ff 100%);padding:14px;">
                  <div style="margin:0 auto;max-width:240px;padding:10px;border-radius:22px;background:#fff;box-shadow:0 18px 40px -26px rgba(16,35,63,.28);">
                    <img src="${qrDataUrl}" alt="QR" style="display:block;width:100%;border-radius:16px;background:#f8fbff;" />
                  </div>
                </div>
              </div>
              <div style="margin-top:14px;padding:14px;border-radius:20px;background:rgba(255,255,255,.10);word-break:break-word;overflow-wrap:anywhere;">
                <div style="font-size:12px;font-weight:900;opacity:.72;">رابط المتابعة</div>
                <div style="margin-top:8px;font-size:12px;font-weight:800;line-height:1.9;">${trackingUrl}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderMarkupToCanvas(markup) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-20000px';
  container.style.width = '920px';
  container.style.zIndex = '-1';
  container.innerHTML = markup;
  document.body.appendChild(container);

  try {
    const { toPng } = await import('html-to-image');
    const dataUrl = await toPng(container.firstElementChild, {
      cacheBust: true,
      pixelRatio: 2,
      canvasWidth: 1840,
      canvasHeight: 2480,
      backgroundColor: '#eef4ff',
      style: {
        margin: '0',
      },
    });
    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportTicketPng({ ticket, user }) {
  await ensureCairoFontReady();
  const trackingUrl = buildTripPublicTrackingUrl(ticket);
  const qrDataUrl = await buildQrDataUrl(trackingUrl || ticket?.qrPayload || ticket?.ticketToken || ticket?.pnr || '');
  const markup = buildTicketMarkup({ ticket, user, qrDataUrl, trackingUrl: trackingUrl || '—' });
  const pngDataUrl = await renderMarkupToCanvas(markup);
  const anchor = document.createElement('a');
  anchor.href = pngDataUrl;
  anchor.download = `${ticket?.pnr || 'taree2y-ticket'}.png`;
  anchor.click();
}

export async function exportTicketPdf({ ticket, user }) {
  await ensureCairoFontReady();
  const trackingUrl = buildTripPublicTrackingUrl(ticket);
  const qrDataUrl = await buildQrDataUrl(trackingUrl || ticket?.qrPayload || ticket?.ticketToken || ticket?.pnr || '');
  const markup = buildTicketMarkup({ ticket, user, qrDataUrl, trackingUrl: trackingUrl || '—' });
  const pngDataUrl = await renderMarkupToCanvas(markup);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  pdf.addImage(pngDataUrl, 'PNG', margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, undefined, 'FAST');
  pdf.save(`${ticket?.pnr || 'taree2y-ticket'}.pdf`);
}
