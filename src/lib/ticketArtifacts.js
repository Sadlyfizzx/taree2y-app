import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const DEFAULT_BG = '#F4F7FB';

function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function makeSafeFileName(baseName) {
  return String(baseName || 'taree2y-ticket')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9\-_.]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'taree2y-ticket';
}

export function parseTicketQrPayload(qrPayload, ticket = {}) {
  if (qrPayload && typeof qrPayload === 'object') {
    return qrPayload;
  }

  if (typeof qrPayload === 'string' && qrPayload.trim()) {
    try {
      return JSON.parse(qrPayload);
    } catch {
      // ignore invalid JSON and build fallback payload
    }
  }

  return {
    v: 1,
    booking_id: ticket.bookingId || ticket.id || null,
    booking_ref: ticket.pnr || null,
    trip_code: ticket.tripCode || null,
    ticket_token: ticket.ticketToken || null,
    issued_at: ticket.bookingDate || new Date().toISOString(),
  };
}

export async function generateTicketQrDataUrl(payload) {
  return QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 640,
    color: {
      dark: '#10233F',
      light: '#FFFFFF',
    },
  });
}

async function buildPng(node) {
  if (!node) {
    throw new Error('Ticket node not found');
  }

  return toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: DEFAULT_BG,
  });
}

export async function downloadTicketPng({ node, fileName }) {
  const pngDataUrl = await buildPng(node);
  triggerDownload(pngDataUrl, fileName);
  return pngDataUrl;
}

export async function downloadTicketPdf({ node, fileName }) {
  const pngDataUrl = await buildPng(node);
  const image = new Image();

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = pngDataUrl;
  });

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const ratio = Math.min(usableWidth / image.width, usableHeight / image.height);
  const renderWidth = image.width * ratio;
  const renderHeight = image.height * ratio;
  const renderX = (pageWidth - renderWidth) / 2;
  const renderY = margin;

  pdf.addImage(pngDataUrl, 'PNG', renderX, renderY, renderWidth, renderHeight);
  pdf.save(fileName);
  return fileName;
}
