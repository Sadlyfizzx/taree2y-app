import { ArrowLeft } from 'lucide-react';

export default function InlineArrow({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
    </span>
  );
}
