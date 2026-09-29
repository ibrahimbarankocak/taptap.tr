import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="grain relative min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-white/[0.06] blur-[120px] animate-aurora" />
      <div className="relative z-10 flex flex-col items-center text-center animate-scale-in">
        <div className="w-16 h-16 rounded-2xl gradient-border [--gb-bg:#0c0c0c] flex items-center justify-center mb-6 text-neutral-300">
          <SearchX size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Kart bulunamadı</h1>
        <p className="text-sm text-neutral-500 mt-2 max-w-xs">Bu adreste bir TapTap profili yok. Linki kontrol et ya da kartın sahibiyle iletişime geç.</p>
        <Link href="/" className="press mt-8 px-6 py-3 rounded-2xl bg-white text-black text-sm font-bold hover:bg-neutral-200">
          TapTap Ana Sayfa
        </Link>
      </div>
    </main>
  );
}
