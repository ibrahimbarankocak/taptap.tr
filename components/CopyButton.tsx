'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ value, label }: { value?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
        copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
      }`}
      title="Kopyala"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label}
    </button>
  );
}
