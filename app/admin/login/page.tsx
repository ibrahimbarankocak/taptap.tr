'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound, User, ShieldAlert } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Giriş başarısız!');
        setShakeKey((k) => k + 1);
      }
    } catch {
      setError('Sunucuya ulaşılamadı.');
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-white/[0.06] blur-[120px] animate-aurora" />
      <div key={shakeKey} className={`relative z-10 w-full max-w-sm gradient-border [--gb-bg:#101010] rounded-3xl p-8 shadow-2xl flex flex-col items-center ${shakeKey ? 'animate-shake' : 'animate-scale-in'}`}>
        
        <div className="shine w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner text-white">
          <Lock size={28} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Admin Girişi</h1>
        <p className="text-xs text-neutral-400 text-center mb-6">TapTap Yönetim Paneline erişmek için bilgilerinizi girin.</p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          
          {/* Kullanıcı Adı */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
              <User size={18} />
            </span>
            <input 
              type="text"
              required
              autoComplete="username"
              autoFocus
              placeholder="Kullanıcı Adı"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3.5 text-white outline-none focus:border-neutral-600 transition-colors text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Şifre */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
              <KeyRound size={18} />
            </span>
            <input 
              type="password"
              required
              autoComplete="current-password"
              placeholder="Şifre"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3.5 text-white outline-none focus:border-neutral-600 transition-colors text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="animate-fade-in text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="press shine w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-neutral-200 text-sm shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)] disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Bilgilendirme Alanı: Şifremi Unuttum Yerine Statik Uyarı */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 w-full text-center">
          <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5">
            <ShieldAlert size={14} className="text-neutral-500" />
            Şifrenizi unuttuysanız sistem yöneticisi ile iletişime geçin.
          </p>
        </div>

      </div>
    </div>
  );
}