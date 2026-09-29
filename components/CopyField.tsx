'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Herkese açık profilde tek dokunuşla kopyalanan alan (IBAN vb.)
export default function CopyField({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      navigator.vibrate?.(30);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* kopyalama engellendiyse sessizce geç */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="press group w-full text-left flex items-center justify-between gap-3 cursor-pointer"
      aria-label={`${label} kopyala`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-semibold uppercase tracking-widest mb-1">
          {icon} {label}
        </div>
        <p className={`text-neutral-100 ${mono ? 'font-mono text-[13px] tracking-tight break-words' : 'text-sm break-all'}`}>{value}</p>
      </div>
      <span
        className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-300 ${
          copied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pop' : 'border-white/10 text-neutral-400 group-hover:text-white group-hover:border-white/25'
        }`}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </span>
    </button>
  );
}
