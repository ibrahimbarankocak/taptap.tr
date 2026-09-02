'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, KeyRound, User, ShieldAlert } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        alert(data.error || 'Giriş başarısız!');
      }
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        
        <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner text-white">
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
              placeholder="Şifre" 
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3.5 text-white outline-none focus:border-neutral-600 transition-colors text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-neutral-200 transition-colors text-sm shadow-lg disabled:opacity-50 mt-2 cursor-pointer"
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