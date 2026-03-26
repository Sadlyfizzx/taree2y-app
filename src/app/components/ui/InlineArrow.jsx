import { ArrowLeft } from 'lucide-react';

export default function InlineArrow({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#163c98_0%,#2156d9_100%)] text-white shadow-[0_14px_30px_-16px_rgba(33,86,217,0.5)] ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
    </span>
  );
}
