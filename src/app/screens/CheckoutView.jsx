import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  Car,
  Check,
  Clock,
  CreditCard,
  Tag,
} from 'lucide-react';
import { createLogger } from '../../lib/logger';
import BookingProgress from '../components/ui/BookingProgress';
import RouteTimeline from '../components/ui/RouteTimeline';
import {
  AppSurface,
  KeyValueRow,
  MetaChip,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  StickyActionBar,
} from '../components/ui/AppPrimitives';
import { InlineNotice } from '../components/ui/StateBlocks';
import { formatCurrency, formatHoldCountdown } from '../utils/formatting';
import { getCancellationPolicy, getTripBookability } from '../utils/travel';
import { withStationNames } from '../utils/stations';

const log = createLogger('checkout');

function getRemainingHoldMs(holdExpiresAt) {
  if (!holdExpiresAt) return null;
  const expiresAtMs = new Date(holdExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, expiresAtMs - Date.now());
}

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
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [rideToStation, setRideToStation] = useState(false);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [remainingHoldMs, setRemainingHoldMs] = useState(() => getRemainingHoldMs(trip?.holdExpiresAt));

  const data = withStationNames(trip) || {
    from: '',
    to: '',
    date: '',
    departureTime: '23:59',
    arrivalTime: '23:59',
    durationHour: 0,
    price: 0,
    company: 'جو باص',
    class: 'اقتصادي مميز',
    status: 'upcoming',
  };
  const subDiscountRate = subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;
  const baseTotal = data.price * passengers;
  const autoDiscount = Math.floor(baseTotal * subDiscountRate);
  const luggageFee = hasLuggage ? 50 * passengers : 0;
  const rideFee = rideToStation ? 80 : 0;
  const finalTotalPreview = Math.max(0, baseTotal + luggageFee + rideFee - discount - autoDiscount);
  const isWalletSufficient = wallet >= finalTotalPreview;
  const pointsToAwardLater = Math.max(0, Math.floor(Math.max(0, baseTotal - autoDiscount - discount) / 5));
  const tripBookability = getTripBookability(data);
  const holdExpired = remainingHoldMs !== null && remainingHoldMs <= 0;

  const cancellationPreview = useMemo(
    () =>
      getCancellationPolicy({
        ...data,
        status: 'upcoming',
        finalTotal: finalTotalPreview,
      }),
    [data, finalTotalPreview],
  );

  useEffect(() => {
    if (!trip?.holdExpiresAt) return undefined;

    const intervalId = window.setInterval(() => {
      setRemainingHoldMs(getRemainingHoldMs(trip.holdExpiresAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [trip?.holdExpiresAt]);

  if (!trip) return null;

  const applyPromo = () => {
    if (!promo) return;

    if (promo.toUpperCase() === 'AHLAN50') {
      setDiscount(50);
      showToast('تم تفعيل خصم AHLAN50 بنجاح.', 'success');
      return;
    }

    if (promo.toUpperCase() === 'EID26') {
      setDiscount(Math.floor(baseTotal * 0.2));
      showToast('خصم EID26 اتفعل على الحجز.', 'success');
      return;
    }

    if (promo.toUpperCase() === 'SA3EED15') {
      setDiscount(Math.floor(baseTotal * 0.15));
      showToast('خصم رحلات الصعيد اتفعل.', 'success');
      return;
    }

    if (promo.toUpperCase() === 'STUDENT20') {
      setDiscount(Math.floor(baseTotal * 0.2));
      showToast('خصم الطلبة اتفعل.', 'success');
      return;
    }

    setDiscount(0);
    showToast('الكود ده غير متاح حالياً.', 'error');
  };

  const handlePayment = async () => {
    const bookability = getTripBookability(data);

    if (!bookability.canBook) {
      showToast(bookability.reason, 'error');
      return;
    }

    if (holdExpired) {
      showToast('مهلة تثبيت المقاعد انتهت. ارجع للمقاعد وثبّتها تاني.', 'error');
      return;
    }

    if (!isWalletSufficient) return;

    if (seats.length !== passengers || new Set(seats).size !== passengers) {
      showToast('عدد المقاعد المختارة لازم يساوي عدد الركاب.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onCreateBooking({
        trip: data,
        seatNumbers: seats,
        passengers,
        promoCode: promo,
        hasLuggage,
        rideToStation,
        needsAccess,
      });

      if (!result?.ok) {
        log.warn('booking_rejected', {
          tripInstanceId: data.instanceId || null,
          message: result?.message || 'unknown',
        });
        showToast(result?.message || 'حصلت مشكلة أثناء تأكيد الحجز.', 'error');
        return;
      }

      onSuccess(result.booking, result.invoice);
    } catch (error) {
      log.error('booking_submit_failed', {
        tripInstanceId: data.instanceId || null,
        error,
      });
      showToast('حصل خطأ أثناء تأكيد الحجز. جرّب تاني.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const optionCardClassName = (active, tone = 'indigo') => {
    if (tone === 'emerald') {
      return active
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
    }

    return active
      ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20'
      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="الخطوة ٣ من ٤"
        title="راجع الدفع وأكد الحجز"
        subtitle="هنا بتراجع الرحلة والمقاعد والإضافات، وتشوف السعر النهائي والخصومات قبل أي خصم فعلي."
      />

      <AppSurface className="p-4 sm:p-5">
        <BookingProgress current="checkout" />
        <div className="mt-4">
          <RouteTimeline trip={data} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaChip label={`المقاعد: ${seats.join('، ')}`} tone="brand" />
          <MetaChip label={`${passengers} ${passengers === 1 ? 'راكب' : 'ركاب'}`} tone="neutral" />
          <MetaChip label={formatCurrency(wallet)} tone={isWalletSufficient ? 'success' : 'warning'} />
        </div>
      </AppSurface>

      {remainingHoldMs !== null ? (
        <InlineNotice
          tone={holdExpired ? 'danger' : 'warning'}
          title={holdExpired ? 'مهلة تثبيت المقاعد انتهت' : 'المقاعد متثبتة مؤقتًا'}
          text={
            holdExpired
              ? 'ارجع خطوة للمقاعد وثبّت اختيارك تاني قبل الدفع.'
              : `${formatHoldCountdown(remainingHoldMs)} قبل ما التثبيت يخلص.`
          }
          icon={Clock}
        />
      ) : null}

      {!tripBookability.canBook ? (
        <InlineNotice tone="danger" title="الحجز غير متاح حالياً" text={tripBookability.reason} icon={Clock} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">إضافات الرحلة</h3>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setHasLuggage((currentValue) => !currentValue)}
                className={`flex w-full items-start justify-between gap-3 rounded-[24px] border p-4 text-right transition ${optionCardClassName(hasLuggage)}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border ${hasLuggage ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900'}`}>
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">وزن إضافي فوق 20 كجم</p>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">مناسب لو معاك شنط زيادة وعايز كل حاجة تبقى محسوبة من الأول.</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-indigo-700 dark:text-indigo-300">+50 ج.م</span>
              </button>

              <button
                type="button"
                onClick={() => setRideToStation((currentValue) => !currentValue)}
                className={`flex w-full items-start justify-between gap-3 rounded-[24px] border p-4 text-right transition ${optionCardClassName(rideToStation)}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border ${rideToStation ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900'}`}>
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                      توصيلة للمحطة
                      <Car className="h-4 w-4 text-slate-400" />
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">لو عايز تبقى الرحلة كلها في خطوة واحدة، فعّل التوصيلة من دلوقتي.</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-indigo-700 dark:text-indigo-300">+80 ج.م</span>
              </button>

              <button
                type="button"
                onClick={() => setNeedsAccess((currentValue) => !currentValue)}
                className={`flex w-full items-start justify-between gap-3 rounded-[24px] border p-4 text-right transition ${optionCardClassName(needsAccess, 'emerald')}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border ${needsAccess ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900'}`}>
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                      مساعدة وقت الصعود
                      <Accessibility className="h-4 w-4 text-emerald-500" />
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">للمساعدة في الصعود أو طلب تجهيز كرسي متحرك عند الحاجة.</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black text-emerald-700 dark:text-emerald-300">بدون رسوم</span>
              </button>
            </div>
          </AppSurface>

          <AppSurface className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              كود خصم
            </h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={promo}
                onChange={(event) => setPromo(event.target.value)}
                placeholder="اكتب الكود لو عندك"
                className="h-14 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <SecondaryButton className="sm:min-w-[120px]" onClick={applyPromo}>
                تفعيل الكود
              </SecondaryButton>
            </div>
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">الكود بيتراجع مرة أخيرة من السيرفر وقت التأكيد النهائي.</p>
          </AppSurface>
        </div>

        <div className="space-y-5">
          <AppSurface className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              ملخص الحساب
            </h3>
            <div className="mt-4 space-y-3">
              <KeyValueRow label={`تذاكر × ${passengers}`} value={formatCurrency(baseTotal)} />
              {luggageFee > 0 ? <KeyValueRow label="وزن إضافي" value={formatCurrency(luggageFee)} /> : null}
              {rideFee > 0 ? <KeyValueRow label="توصيلة للمحطة" value={formatCurrency(rideFee)} /> : null}
              {autoDiscount > 0 ? (
                <KeyValueRow label="خصم الباقة" value={`- ${formatCurrency(autoDiscount)}`} valueClassName="text-emerald-700 dark:text-emerald-300" />
              ) : null}
              {discount > 0 ? (
                <KeyValueRow label="خصم الكود" value={`- ${formatCurrency(discount)}`} valueClassName="text-emerald-700 dark:text-emerald-300" />
              ) : null}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <KeyValueRow label="الإجمالي المطلوب" value={formatCurrency(finalTotalPreview)} valueClassName="text-lg font-black text-indigo-700 dark:text-indigo-300" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <MetaChip label={`رصيدك الحالي ${formatCurrency(wallet)}`} tone={isWalletSufficient ? 'success' : 'warning'} />
              <MetaChip label={`نقاط بعد الرحلة: ${pointsToAwardLater}`} tone="brand" />
            </div>
          </AppSurface>

          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">سياسة الإلغاء والاسترداد</h3>
            <div className="mt-4 space-y-3">
              <KeyValueRow label="آخر ميعاد للإلغاء" value="قبل التحرك بساعتين على الأقل" />
              <KeyValueRow label="الرسوم المتوقعة" value={cancellationPreview.allowed ? `${Math.round(cancellationPreview.feeRatio * 100)}%` : 'غير متاح'} />
              <KeyValueRow
                label="المبلغ المتوقع يرجع"
                value={cancellationPreview.allowed ? formatCurrency(cancellationPreview.refundAmount) : 'غير متاح'}
                valueClassName="text-emerald-700 dark:text-emerald-300"
              />
            </div>
          </AppSurface>

          {!isWalletSufficient ? (
            <InlineNotice
              tone="danger"
              title="رصيد المحفظة غير كافٍ"
              text={`المتاح حالياً ${formatCurrency(wallet)} والمطلوب ${formatCurrency(finalTotalPreview)}.`}
              actionLabel="اشحن المحفظة"
              onAction={() => openModal('topup')}
              icon={CreditCard}
            />
          ) : null}
        </div>
      </div>

      <StickyActionBar>
        <AppSurface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">إجمالي الدفع الآن: {formatCurrency(finalTotalPreview)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              لو ظهر خطأ أثناء العملية، التطبيق بيرجع الحالة بدون تأكيد جزئي للحجز.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
            <PrimaryButton
              onClick={handlePayment}
              disabled={!isWalletSufficient || isProcessing || !tripBookability.canBook || holdExpired}
              className="w-full"
            >
              {isProcessing ? 'جاري تأكيد الحجز…' : 'ادفع وأكد الحجز'}
            </PrimaryButton>
            {!isWalletSufficient ? (
              <SecondaryButton onClick={() => openModal('topup')}>اشحن المحفظة الأول</SecondaryButton>
            ) : null}
          </div>
        </AppSurface>
      </StickyActionBar>
    </div>
  );
}

export default CheckoutView;
