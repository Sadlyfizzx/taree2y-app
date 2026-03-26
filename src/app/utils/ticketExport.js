import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { formatCurrency, formatSeatsText } from './formatting';
import { buildTripPublicTrackingUrl } from './share';

function normalizeCode(value, fallbackPrefix = 'TRQ') {
  const raw = String(value || '').trim();
  if (!raw) return `${fallbackPrefix}-PENDING`;
  if (raw.length <= 20) return raw;
  return `${raw.slice(0, 8)}…${raw.slice(-6)}`;
}

function hasRenderableTrackingUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

async function ensureCairoFontReady() {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load('400 16px Cairo'),
      document.fonts.load('700 16px Cairo'),
      document.fonts.load('900 16px Cairo'),
    ]);
  } catch {
    // ignore font preload errors
  }
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx, text, x, y, options = {}) {
  const {
    font = '700 24px Cairo',
    color = '#10233f',
    align = 'right',
    baseline = 'alphabetic',
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.direction = 'rtl';
  ctx.fillText(String(text || ''), x, y);
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, options = {}) {
  const {
    font = '700 20px Cairo',
    color = '#334155',
    lineHeight = 30,
    maxLines = 3,
    align = 'right',
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'rtl';

  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = ctx.measureText(candidate).width;
    if (width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  const visible = lines.slice(0, maxLines);
  visible.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  ctx.restore();
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  return canvas;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadDataUrl(dataUrl, filename) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function drawInfoCard(ctx, x, y, width, height, label, value, options = {}) {
  const { align = 'right', valueFont = '900 34px Cairo' } = options;
  fillRoundRect(ctx, x, y, width, height, 22, '#ffffff');
  strokeRoundRect(ctx, x, y, width, height, 22, 'rgba(16,35,63,0.08)');
  const textX = align === 'left' ? x + 22 : x + width - 22;
  drawText(ctx, label, textX, y + 28, {
    font: '800 16px Cairo',
    color: '#64748b',
    align,
  });
  drawWrappedText(ctx, value, textX, y + 82, width - 44, {
    font: valueFont,
    color: '#10233f',
    lineHeight: 34,
    maxLines: 2,
    align,
  });
}

async function renderTicketCanvas({ ticket, user }) {
  await ensureCairoFontReady();

  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_not_supported');

  const trackingUrl = buildTripPublicTrackingUrl(ticket);
  const pnr = normalizeCode(ticket?.pnr, 'TRQ');
  const tripCode = normalizeCode(
    ticket?.driverRunCode || ticket?.driverTripCode || ticket?.tripPublicCode || ticket?.tripCode || ticket?.ticketToken,
    'DRV',
  );
  const qrValue = trackingUrl || ticket?.qrPayload || ticket?.ticketToken || ticket?.pnr || '';
  const qrDataUrl = await QRCode.toDataURL(String(qrValue || '').trim(), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#2156D9', light: '#F8FBFF' },
  });
  const qrImage = await loadImage(qrDataUrl);

  ctx.fillStyle = '#edf1f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const shellX = 56;
  const shellY = 70;
  const shellWidth = canvas.width - 112;
  const shellHeight = canvas.height - 140;

  fillRoundRect(ctx, shellX, shellY, shellWidth, shellHeight, 34, '#ffffff');
  strokeRoundRect(ctx, shellX, shellY, shellWidth, shellHeight, 34, 'rgba(16,35,63,0.06)', 2);

  const headerGradient = ctx.createLinearGradient(shellX, shellY, shellX + shellWidth, shellY);
  headerGradient.addColorStop(0, '#10233F');
  headerGradient.addColorStop(0.5, '#163C98');
  headerGradient.addColorStop(1, '#2156D9');
  fillRoundRect(ctx, shellX, shellY, shellWidth, 172, 34, headerGradient);
  fillRoundRect(ctx, shellX, shellY + 124, shellWidth, 48, 0, headerGradient);

  drawText(ctx, 'طريقي', shellX + 34, shellY + 66, {
    font: '900 58px Cairo',
    color: '#ffffff',
    align: 'left',
  });
  drawText(ctx, 'تذكرة سفر رقمية حديثة وواضحة', shellX + 34, shellY + 106, {
    font: '700 18px Cairo',
    color: 'rgba(255,255,255,0.82)',
    align: 'left',
  });

  drawText(ctx, 'اسم الراكب', shellX + shellWidth - 40, shellY + 34, {
    font: '800 16px Cairo',
    color: 'rgba(255,255,255,0.72)',
  });
  drawText(ctx, user?.name || 'راكب طريقي', shellX + shellWidth - 40, shellY + 86, {
    font: '900 40px Cairo',
    color: '#ffffff',
  });

  fillRoundRect(ctx, shellX + shellWidth - 248, shellY + 116, 214, 42, 20, 'rgba(255,255,255,0.16)');
  fillRoundRect(ctx, shellX + shellWidth - 470, shellY + 116, 190, 42, 20, 'rgba(255,255,255,0.16)');
  drawText(ctx, pnr, shellX + shellWidth - 52, shellY + 144, {
    font: '900 18px Cairo',
    color: '#ffffff',
  });
  drawText(ctx, tripCode, shellX + shellWidth - 300, shellY + 144, {
    font: '900 18px Cairo',
    color: '#ffffff',
  });

  const routeY = shellY + 204;
  fillRoundRect(ctx, shellX + 26, routeY, shellWidth - 52, 160, 26, '#ffffff');
  strokeRoundRect(ctx, shellX + 26, routeY, shellWidth - 52, 160, 26, 'rgba(16,35,63,0.08)');

  drawText(ctx, 'من', shellX + shellWidth - 90, routeY + 42, {
    font: '800 16px Cairo',
    color: '#475569',
  });
  drawText(ctx, ticket?.from || '—', shellX + shellWidth - 90, routeY + 98, {
    font: '900 42px Cairo',
    color: '#10233f',
  });
  drawText(ctx, ticket?.fromStationName || 'المحطة الرئيسية', shellX + shellWidth - 90, routeY + 132, {
    font: '700 18px Cairo',
    color: '#334155',
  });

  drawText(ctx, 'إلى', shellX + 90, routeY + 42, {
    font: '800 16px Cairo',
    color: '#475569',
    align: 'left',
  });
  drawText(ctx, ticket?.to || '—', shellX + 90, routeY + 98, {
    font: '900 42px Cairo',
    color: '#10233f',
    align: 'left',
  });
  drawText(ctx, ticket?.toStationName || 'المحطة الرئيسية', shellX + 90, routeY + 132, {
    font: '700 18px Cairo',
    color: '#334155',
    align: 'left',
  });

  ctx.save();
  ctx.strokeStyle = '#d6deef';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shellX + 420, routeY + 82);
  ctx.lineTo(shellX + shellWidth - 420, routeY + 82);
  ctx.stroke();
  ctx.restore();

  fillRoundRect(ctx, shellX + shellWidth / 2 - 26, routeY + 56, 52, 52, 26, '#2156D9');
  drawText(ctx, '←', shellX + shellWidth / 2, routeY + 92, {
    font: '900 24px Cairo',
    color: '#ffffff',
    align: 'center',
  });

  const details = [
    ['تاريخ الرحلة', ticket?.date || '—'],
    ['ميعاد التحرك', ticket?.departureTime || '—'],
    ['ميعاد الوصول', ticket?.arrivalTime || '—'],
    ['مدة الرحلة', ticket?.durationHour ? `${ticket.durationHour} س` : '—'],
    ['المقاعد', formatSeatsText(ticket?.selectedSeats || [])],
    ['إجمالي الدفع', formatCurrency(ticket?.finalTotal || ticket?.price || 0)],
    ['اسم الراكب', user?.name || 'راكب طريقي'],
    ['الشركة', ticket?.company || '—'],
    ['الدرجة', ticket?.class || '—'],
  ];

  const cardGap = 18;
  const cardWidth = (shellWidth - 52 - cardGap * 2) / 3;
  const infoTop = routeY + 188;
  details.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    drawInfoCard(ctx, shellX + 26 + col * (cardWidth + cardGap), infoTop + row * 104, cardWidth, 84, label, value, {
      valueFont: '900 24px Cairo',
    });
  });

  const bottomTop = infoTop + 3 * 104 + 24;
  const qrPanelX = shellX + 26;
  const qrPanelWidth = 380;
  const noteX = qrPanelX + qrPanelWidth + 18;
  const noteWidth = shellWidth - 52 - qrPanelWidth - 18;

  const qrGradient = ctx.createLinearGradient(qrPanelX, bottomTop, qrPanelX + qrPanelWidth, bottomTop + 320);
  qrGradient.addColorStop(0, '#163C98');
  qrGradient.addColorStop(1, '#2156D9');
  fillRoundRect(ctx, qrPanelX, bottomTop, qrPanelWidth, 388, 26, qrGradient);
  drawText(ctx, 'QR متابعة الرحلة', qrPanelX + qrPanelWidth - 28, bottomTop + 48, {
    font: '900 30px Cairo',
    color: '#ffffff',
  });
  drawText(ctx, 'امسح الكود لفتح رابط المتابعة مباشرة.', qrPanelX + qrPanelWidth - 28, bottomTop + 82, {
    font: '700 16px Cairo',
    color: 'rgba(255,255,255,0.84)',
  });
  fillRoundRect(ctx, qrPanelX + 42, bottomTop + 118, 296, 220, 24, '#ffffff');
  fillRoundRect(ctx, qrPanelX + 64, bottomTop + 140, 252, 176, 22, '#f8fbff');
  ctx.drawImage(qrImage, qrPanelX + 94, bottomTop + 150, 192, 192);

  fillRoundRect(ctx, noteX, bottomTop, noteWidth, 164, 24, '#ffffff');
  strokeRoundRect(ctx, noteX, bottomTop, noteWidth, 164, 24, 'rgba(16,35,63,0.08)');
  drawText(ctx, 'ملاحظة مهمة', noteX + noteWidth - 24, bottomTop + 42, {
    font: '900 28px Cairo',
    color: '#10233f',
  });
  drawWrappedText(
    ctx,
    'وصل المحطة قبل التحرك بـ 20 دقيقة على الأقل وتأكد من اسم المحطة الظاهر على التذكرة.',
    noteX + noteWidth - 24,
    bottomTop + 90,
    noteWidth - 48,
    { font: '700 18px Cairo', color: '#334155', lineHeight: 28, maxLines: 3 },
  );

  fillRoundRect(ctx, noteX, bottomTop + 184, noteWidth, 204, 24, '#ffffff');
  strokeRoundRect(ctx, noteX, bottomTop + 184, noteWidth, 204, 24, 'rgba(16,35,63,0.08)');
  drawText(ctx, 'أكواد الرحلة', noteX + noteWidth - 24, bottomTop + 226, {
    font: '900 28px Cairo',
    color: '#10233f',
  });
  fillRoundRect(ctx, noteX + 24, bottomTop + 252, noteWidth - 48, 40, 18, '#f4f7fb');
  fillRoundRect(ctx, noteX + 24, bottomTop + 308, noteWidth - 48, 40, 18, '#f4f7fb');
  drawText(ctx, `كود التذكرة: ${pnr}`, noteX + noteWidth - 40, bottomTop + 280, {
    font: '800 16px Cairo',
    color: '#10233f',
  });
  drawText(ctx, `كود تشغيل الرحلة: ${tripCode}`, noteX + noteWidth - 40, bottomTop + 336, {
    font: '800 16px Cairo',
    color: '#10233f',
  });

  return { canvas, trackingUrl };
}

export async function exportTicketPng({ ticket, user }) {
  const { canvas } = await renderTicketCanvas({ ticket, user });
  const pngDataUrl = canvas.toDataURL('image/png');
  downloadDataUrl(pngDataUrl, `${ticket?.pnr || 'taree2y-ticket'}.png`);
}

export async function exportTicketPdf({ ticket, user }) {
  const { canvas, trackingUrl } = await renderTicketCanvas({ ticket, user });
  const pngDataUrl = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height / canvas.width) * imageWidth;
  const offsetY = Math.max(margin, (pageHeight - imageHeight) / 2);

  pdf.addImage(pngDataUrl, 'PNG', margin, offsetY, imageWidth, imageHeight, undefined, 'FAST');

  if (hasRenderableTrackingUrl(trackingUrl)) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(33, 86, 217);
    pdf.textWithLink('فتح رابط المتابعة', pageWidth - 92, pageHeight - 10, { url: trackingUrl });
  }

  pdf.save(`${ticket?.pnr || 'taree2y-ticket'}.pdf`);
}
