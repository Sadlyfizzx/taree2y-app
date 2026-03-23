import { BusFront, CheckCircle2, Download, Map, MapPin, QrCode, Users } from 'lucide-react';
import { GlassCard, KeyValueRow, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';

function TicketView({ ticket, user, onTrack, showToast }) {
  if (!ticket) return null;

  const downloadTicket = () => showToast('نزلنا نسخة تجريبية من التذكرة عندك يا غالي 🖼️', 'success');
  const shareFare = () =>
    showToast('الميزة دي هتكون متاحة لما نظام الأصدقاء والمحفظة يبقوا حقيقيين', 'error');

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-4">
      <GlassCard className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-6 py-6 text-white md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-100">
                Booking Ref
              </div>
              <div className="mt-2 text-3xl font-black tracking-[0.2em]" dir="ltr">
                {ticket.pnr?.replace('TRQ-', '') || ''}
              </div>
            </div>

            <SoftBadge
              tone={ticket.status === 'past' ? 'amber' : 'emerald'}
              text={ticket.status === 'past' ? 'رحلة منتهية' : 'صالحة للركوب'}
              icon={
                ticket.status === 'past' ? undefined : <CheckCircle2 className="h-3.5 w-3.5" />
              }
              className="self-start border-white/20 bg-white/15 text-white"
            />
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {ticket.from.substring(0, 3)}
              </div>
              <div className="mt-1 text-sm font-black text-slate-500 dark:text-slate-400">
                {ticket.from}
              </div>
            </div>

            <div className="flex flex-1 items-center px-4 text-slate-300 dark:text-slate-600">
              <div className="h-3 w-3 rounded-full bg-indigo-500" />
              <div className="mx-2 flex-1 border-t-2 border-dashed border-current" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <BusFront className="h-6 w-6" />
              </div>
              <div className="mx-2 flex-1 border-t-2 border-dashed border-current" />
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {ticket.to.substring(0, 3)}
              </div>
              <div className="mt-1 text-sm font-black text-slate-500 dark:text-slate-400">
                {ticket.to}
              </div>
            </div>
          </div>

          {(ticket.fromStationName || ticket.toStationName) ? (
            <div className="mb-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  محطة القيام
                </div>
                <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                  {ticket.fromStationName || ticket.from}
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  محطة الوصول
                </div>
                <div className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                  {ticket.toStationName || ticket.to}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 text-sm font-black text-slate-900 dark:text-white">بيانات الرحلة</div>
              <div className="space-y-3">
                <KeyValueRow label="الراكب" value={user.name} />
                <KeyValueRow label="التاريخ" value={ticket.date} valueClassName="font-mono" />
                <KeyValueRow label="التحرك" value={ticket.departureTime} valueClassName="font-mono" />
                <KeyValueRow
                  label="المقاعد"
                  value={(ticket.selectedSeats || []).join('، ')}
                  valueClassName="text-indigo-600 dark:text-indigo-300"
                />
                <KeyValueRow label="الشركة" value={ticket.company} />
                <KeyValueRow label="الدرجة" value={ticket.class} />
              </div>
            </div>

            <div className={`rounded-[26px] border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950 ${ticket.status === 'past' ? 'opacity-60' : ''}`}>
              <div className="text-sm font-black text-slate-900 dark:text-white">رمز الصعود</div>
              <div className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                ده رمز تجريبي لعرض شكل التذكرة فقط
              </div>
              <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <QrCode className="h-28 w-28 text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {ticket.selectedSeats?.length > 1 && ticket.status !== 'past' ? (
        <button
          onClick={shareFare}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
        >
          <Users className="h-4 w-4" />
          مشاركة الأجرة هتتوفر لاحقًا
        </button>
      ) : null}

      <div className="pointer-events-none sticky bottom-0 flex gap-3 bg-gradient-to-t from-white via-white to-transparent py-4 dark:from-slate-950 dark:via-slate-950">
        <button
          onClick={onTrack}
          className="pointer-events-auto flex-1 rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-sm font-black text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] transition active:scale-[0.99]"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Map className="h-4 w-4" />
            تتبع الحافلة
          </span>
        </button>
        <button
          onClick={downloadTicket}
          className="pointer-events-auto flex-1 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            حفظ كصورة
          </span>
        </button>
      </div>
    </div>
  );
}

export default TicketView;
