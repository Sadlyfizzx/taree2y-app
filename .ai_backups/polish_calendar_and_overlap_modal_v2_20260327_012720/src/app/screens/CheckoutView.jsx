import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accessibility,
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  Route,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { createLogger } from '../../lib/logger';
import { validatePromoCode } from '../../lib/promoEngine';
import BookingProgress from '../components/ui/BookingProgress';
import ModalShell from '../components/ui/ModalShell';
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

const defaultPromoState = {
  status: 'idle',
  resultCode: 'promo_empty',
  message: '',
  applied: false,
  code: '',
  campaignId: null,
  title: '',
  description: '',
  discountAmount: 0,
  discountType: null,
  discountValue: 0,
  minimumBookingAmount: 0,
  firstTripOnly: false,
  unavailable: false,
};

function getRemainingHoldMs(holdExpiresAt) {
  if (!holdExpiresAt) return null;
  const expiresAtMs = new Date(holdExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, expiresAtMs - Date.now());
}

function buildTripMeta(data, passengers) {
  return {
    from: data.from,
    to: data.to,
    date: data.date,
    company: data.company,
    travel_class: data.class,
    passengers,
  };
}

function buildTripDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const dateTime = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function getTripWindow(tripLike) {
  const start = buildTripDateTime(tripLike?.date, tripLike?.departureTime);
  const end = buildTripDateTime(tripLike?.date, tripLike?.arrivalTime);

  if (!start || !end) return null;

  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function isTripActiveForOverlap(tripLike) {
  const status = String(tripLike?.status || '').trim();
  if (['cancelled', 'past'].includes(status)) return false;

  const window = getTripWindow(tripLike);
  if (!window) return ['upcoming', 'refund_pending'].includes(status);

  return window.end.getTime() > Date.now();
}

function formatTripLabel(tripLike) {
  const from = String(tripLike?.from || '').trim() || 'غير محدد';
  const to = String(tripLike?.to || '').trim() || 'غير محدد';
  const date = String(tripLike?.date || '').trim() || 'بدون تاريخ';
  const departure = String(tripLike?.departureTime || '').trim() || '--:--';
  const arrival = String(tripLike?.arrivalTime || '').trim() || '--:--';
  return `${from} ← ${to} | ${date} | ${departure} - ${arrival}`;
}

function findOverlappingTrip(nextTrip, existingTrips = []) {
  const nextWindow = getTripWindow(nextTrip);
  if (!nextWindow) return null;

  const candidates = Array.isArray(existingTrips) ? existingTrips : [];

  return (
    candidates.find((tripLike) => {
      if (!tripLike) return false;
      if (!isTripActiveForOverlap(tripLike)) return false;

      const existingWindow = getTripWindow(tripLike);
      if (!existingWindow) return false;

      return (
        nextWindow.start.getTime() < existingWindow.end.getTime() &&
        existingWindow.start.getTime() < nextWindow.end.getTime()
      );
    }) || null
  );
}

function buildOverlapWarningMessage(nextTrip, existingTrip) {
  return [
    'تنبيه قبل تأكيد الحجز',
    '',
    'يبدو أن لديك رحلة أخرى يتداخل توقيتها مع الرحلة التي تحاول حجزها الآن.',
    '',
    `الرحلة الجديدة: ${formatTripLabel(nextTrip)}`,
    `الرحلة الحالية: ${formatTripLabel(existingTrip)}`,
    '',
    'قد يؤدي ذلك إلى تعارض في المواعيد أو صعوبة في اللحاق بإحدى الرحلتين.',
    'إذا كنت متأكدًا من خطتك، اضغط "موافق" للمتابعة.',
    'وإذا أردت المراجعة أولًا، اضغط "إلغاء".',
  ].join('\n');
}

function mapPromoResultToState(result, normalizedCode) {
  const applied = Boolean(result?.data?.applied);

  return {
    status: applied
      ? 'applied'
      : result?.data?.unavailable
      ? 'unavailable'
      : 'rejected',
    resultCode: result?.code || 'promo_unknown',
    message: result?.message || '',
    applied,
    code: result?.data?.promoCode || normalizedCode,
    campaignId: result?.data?.campaignId || null,
    title: result?.data?.title || '',
    description: result?.data?.description || '',
    discountAmount: Number(result?.data?.discountAmount || 0),
    discountType: result?.data?.discountType || null,
    discountValue: Number(result?.data?.discountValue || 0),
    minimumBookingAmount: Number(result?.data?.minimumBookingAmount || 0),
    firstTripOnly: Boolean(result?.data?.firstTripOnly),
    unavailable: Boolean(result?.data?.unavailable),
  };
}

function OptionCard({
  active,
  tone = 'brand',
  title,
  text,
  price,
  icon,
  onClick,
}) {
  const activeClassName =
    tone === 'success'
      ? active
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30'
        : 'border-[var(--line)] bg-[var(--surface-strong)]'
      : active
      ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/30'
      : 'border-[var(--line)] bg-[var(--surface-strong)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`interactive-press flex w-full items-start justify-between gap-3 rounded-[24px] border p-4 text-right transition ${activeClassName}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-6 w-6 place-items-center rounded-lg border ${
            active
              ? tone === 'success'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-[var(--line-strong)] bg-[var(--surface-strong)] text-transparent'
          }`}
        >
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-[var(--ink)]">
            {title}
            {icon}
          </p>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--ink-muted)]">{text}</p>
        </div>
      </div>
      <span className="shrink-0 text-sm font-black text-[var(--ink)]">{price}</span>
    </button>
  );
}

function CheckoutView({
  userId,
  trip,
  seats,
  passengers,
  wallet,
  subscription,
  currentTrips = [],
  onCreateBooking,
  onSuccess,
  showToast,
  openModal,
}) {
  const [promoInput, setPromoInput] = useState('');
  const [promoState, setPromoState] = useState(defaultPromoState);
  const [promoLoading, setPromoLoading] = useState(false);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState(null);
  const overlapApprovalRef = useRef('');
  const [remainingHoldMs, setRemainingHoldMs] = useState(() =>
    getRemainingHoldMs(trip?.holdExpiresAt),
  );

  const data = useMemo(
    () =>
      withStationNames(trip) || {
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
      },
    [trip],
  );

  const supportsRealPromo = Boolean(data?.instanceId);
  const subDiscountRate =
    subscription === 'student' ? 0.15 : subscription === 'vip' ? 0.25 : 0;
  const baseTotal = data.price * passengers;
  const autoDiscount = Math.floor(baseTotal * subDiscountRate);
  const luggageFee = hasLuggage ? 50 * passengers : 0;
  const promoDiscount = promoState.applied ? promoState.discountAmount : 0;
  const finalTotalPreview = Math.max(
    0,
    baseTotal + luggageFee - promoDiscount - autoDiscount,
  );
  const isWalletSufficient = wallet >= finalTotalPreview;
  const pointsToAwardLater = Math.max(
    0,
    Math.floor(Math.max(0, baseTotal - autoDiscount - promoDiscount) / 5),
  );
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

  useEffect(() => {
    const normalizedInput = String(promoInput || '').trim().toUpperCase();

    if (!normalizedInput && promoState.status !== 'idle') {
      setPromoState(defaultPromoState);
      return;
    }

    if (promoState.code && normalizedInput !== promoState.code) {
      setPromoState(defaultPromoState);
    }
  }, [promoInput, promoState.code, promoState.status]);

  const confirmOverlappingBooking = async () => {
    if (!overlapWarning) return;
    overlapApprovalRef.current = overlapWarning.key;
    setOverlapWarning(null);
    await handlePayment();
  };

  const cancelOverlappingBooking = () => {
    overlapApprovalRef.current = '';
    setOverlapWarning(null);
    showToast('تمام، راجع الرحلتين أولًا قبل تأكيد الحجز.', 'info');
  };

  if (!trip) return null;

  const applyPromo = async ({ silent = false } = {}) => {
    if (promoLoading) return promoState;

    const normalizedCode = String(promoInput || '').trim().toUpperCase();

    if (!supportsRealPromo) {
      const rejectedState = {
        ...defaultPromoState,
        status: 'rejected',
        resultCode: 'promo_backend_required',
        code: normalizedCode,
        message: 'كود الخصم غير متاح على الرحلة دي حالياً.',
      };
      setPromoState(rejectedState);
      if (!silent) showToast(rejectedState.message, 'error');
      return rejectedState;
    }

    if (!normalizedCode) {
      setPromoState(defaultPromoState);
      if (!silent) showToast('اكتب الكود الأول.', 'error');
      return defaultPromoState;
    }

    setPromoLoading(true);

    try {
      const result = await validatePromoCode({
        userId,
        code: normalizedCode,
        bookingAmount: baseTotal,
        tripMeta: buildTripMeta(data, passengers),
      });

      const nextState = mapPromoResultToState(result, normalizedCode);
      setPromoState(nextState);

      if (!silent) {
        showToast(
          nextState.applied
            ? nextState.message || 'تم تفعيل الكود بنجاح.'
            : nextState.message || 'الكود غير متاح حالياً.',
          nextState.applied ? 'success' : 'error',
        );
      }

      return nextState;
    } catch (error) {
      log.error('promo_validation_failed', { userId, code: normalizedCode, error });

      const failedState = {
        ...defaultPromoState,
        status: 'rejected',
        resultCode: 'promo_unavailable',
        code: normalizedCode,
        message: 'تعذر مراجعة الكود حالياً.',
      };

      setPromoState(failedState);
      if (!silent) showToast(failedState.message, 'error');
      return failedState;
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePayment = async () => {
    if (isProcessing || promoLoading) return;

    const bookability = getTripBookability(data);

    if (!bookability.canBook) {
      showToast(bookability.reason, 'error');
      return;
    }

    if (holdExpired) {
      showToast('مهلة تثبيت المقاعد انتهت. ارجع للمقاعد وثبّتها تاني.', 'error');
      return;
    }

    if (!Array.isArray(seats) || seats.length === 0) {
      showToast('اختار المقاعد الأول.', 'error');
      return;
    }

    if (seats.length !== passengers || new Set(seats).size !== passengers) {
      showToast('عدد المقاعد المختارة لازم يساوي عدد الركاب.', 'error');
      return;
    }

    const overlappingTrip = findOverlappingTrip(data, currentTrips);
    if (overlappingTrip) {
      const shouldContinue =
        typeof window === 'undefined'
          ? true
          : window.confirm(buildOverlapWarningMessage(data, overlappingTrip));

      if (!shouldContinue) {
        showToast('تمام، راجع الرحلتين أولًا قبل تأكيد الحجز.', 'info');
        return;
      }
    }

    const typedPromoCode = String(promoInput || '').trim().toUpperCase();
    let latestPromoState = promoState;

    if (typedPromoCode) {
      latestPromoState = await applyPromo({ silent: true });

      if (!latestPromoState.applied) {
        showToast(
          latestPromoState.message || 'راجع كود الخصم قبل التأكيد النهائي.',
          'error',
        );
        return;
      }
    }

    const backendFinalTotalPreview = Math.max(
      0,
      baseTotal +
        luggageFee -
        autoDiscount -
        (latestPromoState.applied ? latestPromoState.discountAmount : 0),
    );

    if (wallet < backendFinalTotalPreview) {
      showToast(
        `رصيد المحفظة الحالي ${formatCurrency(wallet)} أقل من المطلوب بعد المراجعة النهائية ${formatCurrency(backendFinalTotalPreview)}.`,
        'error',
      );
      return;
    }

    overlapApprovalRef.current = '';
    setIsProcessing(true);

    try {
      const result = await onCreateBooking({
        trip: data,
        seatNumbers: seats,
        passengers,
        promoCode: latestPromoState.applied ? latestPromoState.code : '',
        promoDiscountAmount: 0,
        hasLuggage,
        needsAccess,
      });

      if (!result?.ok) {
        log.warn('booking_rejected', {
          tripInstanceId: data.instanceId || null,
          message: result?.message || 'unknown',
          code: result?.code || null,
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

  return (
    <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
      <PageHeading
        eyebrow="الخطوة ٣ من ٤"
        title="راجع الدفع وأكد الحجز"
        subtitle="كل المعلومات المهمة قدامك: الرحلة، المقاعد، الخصومات، والمحفظة قبل ما يحصل أي خصم فعلي."
      />

      <AppSurface className="p-4 sm:p-5">
        <BookingProgress current="checkout" />
        <div className="mt-4">
          <RouteTimeline trip={data} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <MetaChip label={`المقاعد: ${seats.join('، ')}`} tone="brand" />
          <MetaChip
            label={`${passengers} ${passengers === 1 ? 'راكب' : 'ركاب'}`}
            tone="neutral"
          />
          <MetaChip
            label={`رصيدك ${formatCurrency(wallet)}`}
            tone={isWalletSufficient ? 'success' : 'warning'}
          />
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
        <InlineNotice
          tone="danger"
          title="الحجز غير متاح حالياً"
          text={tripBookability.reason}
          icon={Clock}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="app-page-frame min-w-0 overflow-x-clip space-y-5">
          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-[var(--ink)]">إضافات الرحلة</h3>
            <div className="mt-4 space-y-3">
              <OptionCard
                active={hasLuggage}
                title="وزن إضافي فوق 20 كجم"
                text="مناسب لو معاك شنط زيادة وعايز كل حاجة تبقى محسوبة من الأول."
                price="+50 ج.م"
                onClick={() => setHasLuggage((currentValue) => !currentValue)}
              />
              <OptionCard
                active={needsAccess}
                tone="success"
                title="مساعدة وقت الصعود"
                text="للمساعدة في الصعود أو تجهيز طلب وصول أسهل عند الحاجة."
                price="بدون رسوم"
                icon={<Accessibility className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />}
                onClick={() => setNeedsAccess((currentValue) => !currentValue)}
              />
            </div>
          </AppSurface>

          <AppSurface className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-black text-[var(--ink)]">
              <Tag className="h-5 w-5 text-[var(--brand-strong)] dark:text-[var(--brand)]" />
              كود خصم
            </h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                placeholder={supportsRealPromo ? 'اكتب الكود لو عندك' : 'الكود غير متاح على الرحلة دي'}
                disabled={!supportsRealPromo}
                className="app-input"
              />
              <SecondaryButton
                className="sm:min-w-[132px]"
                onClick={() => {
                  applyPromo();
                }}
                loading={promoLoading}
                loadingText="جاري التفعيل…"
                disabled={!supportsRealPromo}
              >
                تفعيل الكود
              </SecondaryButton>
            </div>
            <p className="mt-3 text-sm font-bold text-[var(--ink-muted)]">
              {supportsRealPromo
                ? 'لو الكود صالح، الخصم هيتطبق قبل التأكيد النهائي.'
                : 'الكود غير متاح على هذه الرحلة حالياً.'}
            </p>

            {promoState.status !== 'idle' ? (
              <div
                className={`mt-4 rounded-[24px] border px-4 py-4 text-sm font-bold ${
                  promoState.applied
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200'
                }`}
              >
                <p className="font-black">
                  {promoState.applied
                    ? promoState.title || `تم قبول الكود ${promoState.code}`
                    : promoState.message || 'الكود غير متاح حالياً.'}
                </p>
                {promoState.applied && promoState.description ? (
                  <p className="mt-2 leading-6">{promoState.description}</p>
                ) : null}
              </div>
            ) : null}
          </AppSurface>

          <InlineNotice
            tone="info"
            title="تأكيد من غير مفاجآت"
            text="السعر النهائي بيتراجع هنا بالكامل، ولو الرصيد مش كفاية أو الكود مش صالح، هتعرف قبل تأكيد الحجز."
            icon={ShieldCheck}
          />
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <AppSurface className="p-5">
            <h3 className="flex items-center gap-2 text-lg font-black text-[var(--ink)]">
              <CreditCard className="h-5 w-5 text-[var(--brand-strong)] dark:text-[var(--brand)]" />
              ملخص المبلغ
            </h3>
            <div className="mt-4 space-y-3">
              <KeyValueRow label={`تذاكر × ${passengers}`} value={formatCurrency(baseTotal)} />
              {luggageFee > 0 ? <KeyValueRow label="وزن إضافي" value={formatCurrency(luggageFee)} /> : null}
              {autoDiscount > 0 ? (
                <KeyValueRow
                  label="خصم الباقة"
                  value={`- ${formatCurrency(autoDiscount)}`}
                  valueClassName="text-emerald-700 dark:text-emerald-300"
                />
              ) : null}
              {promoDiscount > 0 ? (
                <KeyValueRow
                  label="خصم الكود"
                  value={`- ${formatCurrency(promoDiscount)}`}
                  valueClassName="text-emerald-700 dark:text-emerald-300"
                />
              ) : null}
              <div className="app-dashed-divider pt-3">
                <KeyValueRow
                  label="الإجمالي المطلوب"
                  value={formatCurrency(finalTotalPreview)}
                  valueClassName="text-lg font-black text-[var(--brand-strong)] dark:text-[var(--brand)]"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <MetaChip
                label={`رصيدك الحالي ${formatCurrency(wallet)}`}
                tone={isWalletSufficient ? 'success' : 'warning'}
              />
              <MetaChip label={`نقاط بعد الرحلة ${pointsToAwardLater}`} tone="brand" />
            </div>
          </AppSurface>

          <AppSurface className="p-5">
            <h3 className="text-lg font-black text-[var(--ink)]">الإلغاء والاسترداد</h3>
            <div className="mt-4 space-y-3">
              <KeyValueRow label="آخر ميعاد للإلغاء" value="قبل التحرك بساعتين على الأقل" />
              <KeyValueRow
                label="الرسوم المتوقعة"
                value={
                  cancellationPreview.allowed
                    ? `${Math.round(cancellationPreview.feeRatio * 100)}%`
                    : 'غير متاح'
                }
              />
              <KeyValueRow
                label="المبلغ المتوقع يرجع"
                value={
                  cancellationPreview.allowed
                    ? formatCurrency(cancellationPreview.refundAmount)
                    : 'غير متاح'
                }
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
            <p className="text-sm font-black text-[var(--ink)]">
              إجمالي الدفع الآن: {formatCurrency(finalTotalPreview)}
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-muted)]">
              الحجز بيتأكد بعد المراجعة النهائية فقط، ولو فيه مشكلة هتعرفها بوضوح.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
            <PrimaryButton
              onClick={handlePayment}
              disabled={!isWalletSufficient || !tripBookability.canBook || holdExpired || promoLoading}
              loading={isProcessing}
              loadingText="جاري تأكيد الحجز…"
              className="w-full"
            >
              ادفع وأكد الحجز
            </PrimaryButton>
            {!isWalletSufficient ? (
              <SecondaryButton onClick={() => openModal('topup')}>اشحن المحفظة الأول</SecondaryButton>
            ) : null}
          </div>
        </AppSurface>
      </StickyActionBar>
      {overlapWarning ? (
        <ModalShell
          onClose={cancelOverlappingBooking}
          title="تنبيه قبل تأكيد الحجز"
          subtitle="يوجد تداخل زمني مع رحلة أخرى مسجلة على حسابك. الحجز مسموح، لكن من الأفضل المراجعة قبل المتابعة."
          icon={<AlertTriangle className="h-6 w-6" />}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton onClick={cancelOverlappingBooking}>
                أراجع الرحلتين أولًا
              </SecondaryButton>
              <PrimaryButton onClick={confirmOverlappingBooking} icon={<Route className="h-4 w-4" />}>
                أكمل الحجز رغم التداخل
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4">
              <p className="text-sm font-black text-[var(--ink)]">قد يحدث تعارض في المواعيد أو صعوبة في اللحاق بإحدى الرحلتين.</p>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                إذا كنت متأكدًا من خطتك، يمكنك المتابعة. وإذا أردت المراجعة أولًا، ارجع وتأكد من مواعيد الرحلتين.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-indigo-200 bg-indigo-50/80 px-4 py-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex items-center gap-2">
                  <MetaChip label="الرحلة الجديدة" tone="brand" />
                </div>
                <p className="mt-3 text-base font-black text-[var(--ink)]">
                  {formatTripWindowLabel(overlapWarning.nextTrip)}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                  {formatTripTimeLabel(overlapWarning.nextTrip)}
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4">
                <div className="flex items-center gap-2">
                  <MetaChip label="رحلة حالية على الحساب" tone="warning" />
                </div>
                <p className="mt-3 text-base font-black text-[var(--ink)]">
                  {formatTripWindowLabel(overlapWarning.existingTrip)}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--ink-muted)]">
                  {formatTripTimeLabel(overlapWarning.existingTrip)}
                </p>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default CheckoutView;
