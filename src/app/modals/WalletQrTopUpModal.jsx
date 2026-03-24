import { useEffect, useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import ModalShell from '../components/ui/ModalShell';
import SmartQRCard from '../components/ui/SmartQRCard';
import { PrimaryButton, SecondaryButton } from '../components/ui/AppPrimitives';
import { supabase } from '../../lib/supabase';
import { buildWalletTopupLink } from '../utils/publicLinks';

export default function WalletQrTopUpModal({ closeModal, showToast }) {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState('');
  const [requestMeta, setRequestMeta] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase.rpc('create_wallet_topup_request');

      if (!active) return;

      if (error) {
        setErrorMessage(error.message || 'تعذر تجهيز QR الشحن حالياً. طبق مياجريشن الـ Supabase ثم جرّب تاني.');
        setLoading(false);
        return;
      }

      const payload = Array.isArray(data) ? data[0] : data;
      const nextLink = buildWalletTopupLink(payload?.request_id, payload?.public_token);
      setRequestMeta(payload || null);
      setLink(nextLink);
      setLoading(false);
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast('تم نسخ رابط QR الشحن.', 'success');
    } catch {
      showToast('تعذر نسخ الرابط حالياً.', 'error');
    }
  };

  return (
    <ModalShell
      onClose={closeModal}
      title="QR شحن المحفظة"
      subtitle="افتحه من أي جهاز، اكتب المبلغ، وسيتم إضافة الرصيد لنفس الحساب المرتبط بطلب الشحن."
      icon={<QrCode className="h-6 w-6" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton onClick={closeModal}>إغلاق</SecondaryButton>
          <PrimaryButton onClick={copyLink} icon={<Copy className="h-4 w-4" />} disabled={!link || loading}>
            نسخ رابط الشحن
          </PrimaryButton>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-black text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          جاري تجهيز طلب الشحن وربط QR بالحساب الحالي…
        </div>
      ) : errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-8 text-center text-sm font-black text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {errorMessage}
        </div>
      ) : (
        <div className="space-y-5">
          <SmartQRCard
            value={link}
            accent="emerald"
            title="امسح QR من أي جهاز"
            subtitle="الرابط الناتج مربوط بنفس الحساب. الجهاز اللي هيفتح الصفحة يقدر يحدد مبلغ شحن تجريبي ويتم إضافته لهذا الحساب مباشرة."
            code={requestMeta?.request_id || ''}
          />

          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/60">
            <p className="text-sm font-black text-slate-900 dark:text-white">مهم</p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
              دي تجربة QR شحن مرتبطة بالحساب نفسه وليست بوابة دفع حقيقية. لكنها تعمل عبر أي جهاز عند فتح نفس الرابط، ثم تؤكد المبلغ على صفحة الشحن العامة.
            </p>
            <div className="mt-3 rounded-[20px] bg-white px-4 py-3 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              <span dir="ltr" className="break-all">{link}</span>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
