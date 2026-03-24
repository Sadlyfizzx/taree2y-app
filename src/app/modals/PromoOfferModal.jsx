import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import { MetaChip, PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { copyTextWithFallback } from '../public/publicPortal';

function formatOfferWindow(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function PromoOfferModal({
  offer,
  closeModal,
  showToast,
  onDismiss,
}) {
  if (!offer) return null;

  const handleCopy = async () => {
    const copied = await copyTextWithFallback(offer.code, 'كود الخصم');

    showToast(
      copied
        ? `تم نسخ كود ${offer.code} وجاهز للاستخدام.`
        : 'تعذر نسخ الكود حالياً.',
      copied ? 'success' : 'error',
    );

    if (copied) {
      onDismiss?.();
      closeModal();
    }
  };

  const endsAtText = formatOfferWindow(offer.endsAt);

  return (
    <ModalShell
      onClose={() => {
        onDismiss?.();
        closeModal();
      }}
      title="عرض مناسب ليك"
      subtitle="العرض ده جاي من نظام الخصومات الحقيقي، وبيتراجع قبل الحجز النهائي."
      icon={<Gift className="h-6 w-6" />}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton
            onClick={() => {
              onDismiss?.();
              closeModal();
            }}
          >
            لاحقًا
          </SecondaryButton>
          {offer.code ? (
            <PrimaryButton onClick={handleCopy}>
              انسخ الكود
            </PrimaryButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#10233f_0%,#163c98_48%,#2156d9_100%)] p-5 text-white shadow-[0_24px_60px_-28px_rgba(16,35,63,0.38)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-white/70">
                حملة فعالة
              </p>
              <h3 className="mt-2 text-2xl font-black">{offer.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-white/80">
                {offer.description || offer.message || 'خصم جاهز للاستخدام على رحلتك الجاية.'}
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12">
              <Sparkles className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {offer.code ? (
              <MetaChip
                label={`الكود ${offer.code}`}
                tone="brand"
                className="border-white/10 bg-white/10 text-white"
              />
            ) : null}
            {endsAtText ? (
              <MetaChip
                label={`حتى ${endsAtText}`}
                tone="brand"
                className="border-white/10 bg-white/10 text-white"
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            قبل ما تستخدم العرض
          </p>
          <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            <li>• الكود بيتراجع حسب تاريخ الحملة، المستخدم الحالي، وقيمة الحجز.</li>
            <li>• لو الكود استخدامه مرة واحدة، هيتقفل تلقائيًا بعد أول حجز ناجح.</li>
            <li>• لو العرض خلص أو انتهى، هيظهرلك سبب واضح قبل التأكيد النهائي.</li>
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}
