import { useState } from 'react';
import {
  Accessibility,
  ArrowRightLeft,
  Award,
  Car,
  Check,
  CreditCard,
  Sparkles,
  Tag,
} from 'lucide-react';
import { GlassCard, KeyValueRow, ScreenHeader, SoftBadge } from '../components/ui/Taree2yUI';
import { getTripBookability } from '../utils/travel';

function CheckoutView({
  trip,
  seats,
  passengers,
  wallet,
  subscription,
  onCreateBooking,
  onSuccess,
  showToast,
  openModal,
}) {
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
  const luggageFee = hasLuggage ? 50 * passengers : 0;
  const rideFee = rideToStation ? 80 : 0;
  const finalTotalPreview = baseTotal + luggageFee + rideFee - discount - autoDiscount;
  const isWalletSufficient = wallet >= finalTotalPreview;
  const pointsToAwardLater = Math.max(0, Math.floor(Math.max(0, baseTotal - autoDiscount - discount) / 5));
  const tripBookability = getTripBookability(trip);

  const applyPromo = () => {
    if (!promo) return;
    if (promo.toUpperCase() === 'AHLAN50') {
      setDiscount(50);
      showToast('تم تفعيل الخصم يا نجم 🎉', 'success');
    } else if (promo.toUpperCase() === 'EID26') {
      setDiscount(Math.floor(baseTotal * 0.2));
      showToast('عيدية طريقي اتفعلت (خصم 20%) 🌙', 'success');
    } else if (promo.toUpperCase() === 'SA3EED15') {
      setDiscount(Math.floor(baseTotal * 0.15));
      showToast('أجدع ناس! اتفعل خصم الصعيد 🌴', 'success');
    } else if (promo.toUpperCase() === 'STUDENT20') {
      setDiscount(Math.floor(baseTotal * 0.2));
      showToast('خصم الطلبة شغال 🎓', 'success');
    } else {
      showToast('الكود ده مش شغال أو منتهي', 'error');
      setDiscount(0);
    }
  };

  const handlePayment = async () => {
    const bookability = getTripBookability(trip);
    if (!bookability.canBook) return showToast(bookability.reason, 'error');
    if (!isWalletSufficient) return;
    if (seats.length !== passengers || new Set(seats).size !== passengers) {
      return showToast('عدد المقاعد المختارة لازم يساوي عدد الركاب', 'error');
    }

    setIsProcessing(true);
    try {
      const result = await onCreateBooking({
        trip,
        seatNumbers: seats,
        passengers,
        promoCode: promo,
        hasLuggage,
        rideToStation,
        needsAccess,
      });
      if (!result?.ok) return showToast(result?.message || 'حصل خطأ أثناء تأكيد الحجز', 'error');
      onSuccess(result.booking, result.invoice);
    } catch (error) {
      console.error('handlePayment error', error);
      showToast('حصل خطأ أثناء تأكيد الحجز. حاول تاني.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCard = (active, setActive, label, price, tone, icon) => (
    <button
      onClick={() => setActive(!active)}
      className={`w-full rounded-[26px] border p-4 text-right transition ${
        active
          ? tone.active
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-white ${
              active
                ? tone.checkbox
                : 'border-slate-300 bg-transparent text-transparent dark:border-slate-600'
            }`}
          >
            <Check className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-white">{label}</div>
            <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
              {icon}
            </div>
          </div>
        </div>
        <div className={`text-sm font-black ${tone.price}`} dir="ltr">
          {price}
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-5 pb-4">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-5 md:p-6">
          <ScreenHeader
            eyebrow="مراجعة الرحلة"
            title="قبل ما تدفع"
            description="راجع بيانات الرحلة والإضافات قبل تأكيد الحجز."
          />

          <div className="mt-5 rounded-[30px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-500 dark:text-slate-400">{trip.company}</div>
                <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{trip.class}</div>
              </div>
              <SoftBadge tone="indigo" text={`المقاعد: ${seats.join('، ')}`} />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between text-center">
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
                    {trip.departureTime}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
                    {trip.from}
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-center px-4">
                  <ArrowRightLeft className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  <div className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {trip.durationHour} ساعات
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white" dir="ltr">
                    {trip.arrivalTime}
                  </div>
                  <div className="mt-1 text-[11px] font-black text-slate-500 dark:text-slate-400">
                    {trip.to}
                  </div>
                </div>
              </div>

              <div className="text-xs font-black text-slate-500 dark:text-slate-400" dir="ltr">
                {trip.date} • {passengers} ركاب
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {toggleCard(
              hasLuggage,
              setHasLuggage,
              'وزن إضافي (أكثر من 20 كجم) 📦',
              '+50 ج.م',
              {
                active: 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/10',
                checkbox: 'border-indigo-500 bg-indigo-500',
                price: 'text-indigo-600 dark:text-indigo-300',
              },
              'هنضيف الرسوم على كل راكب في الحجز.',
            )}

            {toggleCard(
              rideToStation,
              setRideToStation,
              'احجزلي أوبر للمحطة',
              '+80 ج.م',
              {
                active: 'border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10',
                checkbox: 'border-sky-500 bg-sky-500',
                price: 'text-sky-600 dark:text-sky-300',
              },
              <span className="inline-flex items-center gap-1">خدمة تنقلك للمحطة <Car className="h-3.5 w-3.5" /></span>,
            )}

            {toggleCard(
              needsAccess,
              setNeedsAccess,
              'طلب مساعدة بالصعود / كرسي متحرك',
              'مجاناً',
              {
                active: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10',
                checkbox: 'border-emerald-500 bg-emerald-500',
                price: 'text-emerald-600 dark:text-emerald-300',
              },
              <span className="inline-flex items-center gap-1">
                خدمة دعم الوصول <Accessibility className="h-3.5 w-3.5" />
              </span>,
            )}
          </div>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="p-5 md:p-6">
            <ScreenHeader
              eyebrow="كود خصم"
              title="طب عندك عرض؟"
              description="لو معاك كود خصم فعّله دلوقتي، والسعر النهائي بيتأكد من السيرفر وقت الدفع."
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="اكتب كود الخصم"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  className="h-14 w-full rounded-[24px] border border-slate-200 bg-white pr-12 pl-4 text-base font-black uppercase text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <button
                onClick={applyPromo}
                className="h-14 rounded-[24px] bg-slate-900 px-5 text-sm font-black text-white transition hover:opacity-95 dark:bg-indigo-500"
              >
                تفعيل الخصم
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SoftBadge tone="amber" text="AHLAN50" />
              <SoftBadge tone="emerald" text="SA3EED15" />
              <SoftBadge tone="indigo" text="EID26" />
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:p-6">
            <ScreenHeader
              eyebrow="ملخص الدفع"
              title="هتدفع كام؟"
              description="المبلغ هيتخصم من محفظة طريقي بعد التأكيد مباشرة."
              actions={
                <SoftBadge
                  tone={isWalletSufficient ? 'emerald' : 'rose'}
                  text={isWalletSufficient ? 'الرصيد كافي' : 'الرصيد غير كافي'}
                />
              }
            />

            <div className="mt-5 space-y-3">
              <KeyValueRow label={`تذاكر × ${passengers}`} value={`${baseTotal} ج.م`} />
              {luggageFee > 0 ? <KeyValueRow label="وزن إضافي" value={`${luggageFee} ج.م`} /> : null}
              {rideFee > 0 ? <KeyValueRow label="أوبر للمحطة" value={`${rideFee} ج.م`} /> : null}
              {autoDiscount > 0 ? (
                <KeyValueRow
                  label={`خصم الباقة (${subscription === 'vip' ? 'VIP' : 'طالب'})`}
                  value={`-${autoDiscount} ج.م`}
                  valueClassName="text-emerald-600 dark:text-emerald-300"
                />
              ) : null}
              {discount > 0 ? (
                <KeyValueRow
                  label="كود خصم"
                  value={`-${discount} ج.م`}
                  valueClassName="text-emerald-600 dark:text-emerald-300"
                />
              ) : null}

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />

              <KeyValueRow
                label="الإجمالي المطلوب"
                value={`${finalTotalPreview} ج.م`}
                valueClassName="text-xl font-black text-indigo-600 dark:text-indigo-300"
              />

              <div className="rounded-[22px] border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <div className="flex items-center gap-2 text-sm font-black text-indigo-700 dark:text-indigo-300">
                  <Award className="h-4 w-4" />
                  هتاخد {pointsToAwardLater} نقطة بعد نهاية الرحلة
                </div>
                <div className="mt-2 text-xs font-bold leading-6 text-indigo-700/80 dark:text-indigo-300/80">
                  النقاط بتتحسب على قيمة التذاكر بعد الخصومات.
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                رصيدك الحالي:
                <span className="mr-2 text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                  {wallet} ج.م
                </span>
              </div>
            </div>

            {!tripBookability.canBook ? (
              <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {tripBookability.reason}
              </div>
            ) : null}

            {!isWalletSufficient ? (
              <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <div className="text-sm font-black text-rose-600 dark:text-rose-300">
                  رصيد محفظتك مش مكفي لإتمام الحجز.
                </div>
                <button
                  onClick={() => openModal('topup')}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-indigo-600 shadow-sm transition hover:text-indigo-700 dark:bg-slate-950 dark:text-indigo-300"
                >
                  <CreditCard className="h-4 w-4" />
                  اشحن المحفظة دلوقتي
                </button>
              </div>
            ) : null}

            <div className="pointer-events-none sticky bottom-0 mt-6 bg-gradient-to-t from-white via-white to-transparent py-4 dark:from-slate-950 dark:via-slate-950">
              <button
                onClick={handlePayment}
                disabled={!isWalletSufficient || isProcessing || !tripBookability.canBook}
                className={`pointer-events-auto mx-auto flex h-14 w-full items-center justify-center gap-2 rounded-[24px] text-base font-black transition ${
                  isWalletSufficient && !isProcessing && tripBookability.canBook
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_24px_54px_-28px_rgba(79,70,229,0.8)] active:scale-[0.99]'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {isProcessing ? (
                  'جاري تأكيد الحجز...'
                ) : (
                  <>
                    ادفع من المحفظة وأكد الحجز
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export default CheckoutView;
