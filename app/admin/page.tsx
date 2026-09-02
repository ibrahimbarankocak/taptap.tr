import db from '@/lib/db';
import { Users, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const result = await db.execute('SELECT COUNT(*) as count FROM customers');
  const totalCustomers = (result.rows[0] as any)?.count || 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Üst Kısım: Yatay Logolu Kurumsal Başlık */}
        <div className="flex flex-col items-center gap-4 mb-10 border-b border-neutral-900 pb-8">
          <div className="w-full flex justify-center">
            <img 
              src="/logo.jpeg" 
              alt="TapTap Logo" 
              className="w-full max-w-xs h-auto object-contain rounded-2xl border border-neutral-800 shadow-xl bg-neutral-950 p-2" 
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-neutral-100 tracking-wide">TapTap Yönetim Paneli</h1>
            <p className="text-sm text-neutral-400 mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-500" /> Güvenli NFC Kartvizit Sistem Yönetimi
            </p>
          </div>
        </div>

        {/* İSTATİSTİK KUTULARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          
          {/* Toplam Müşteri Kartı */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">Kayıtlı Müşteriler</p>
              <h3 className="text-3xl font-extrabold text-white">{totalCustomers}</h3>
            </div>
            <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center text-neutral-300">
              <Users size={22} />
            </div>
          </div>

          {/* Sistem Durumu Kartı */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">Sistem Durumu</p>
              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Bulut Sunucu Aktif
              </h3>
            </div>
            <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
          </div>

        </div>

        {/* HIZLI YÖNLENDİRME MENÜSÜ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <Link 
            href="/admin/customers" 
            className="flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-700 hover:bg-neutral-900/80 transition-all group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-white group-hover:scale-105 transition-transform">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">Müşteri Listesi</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Kayıtlı profilleri görüntüle ve yönet</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link 
            href="/admin/customers/new" 
            className="flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 hover:bg-neutral-900/80 transition-all group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-white group-hover:scale-105 transition-transform">
                <UserPlus size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">Yeni Müşteri Ekle</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Sisteme yeni NFC kart tanımla</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

        </div>

      </div>
    </div>
  );
}
// Çıkış fonksiyonu
const handleLogout = async () => {
  const res = await fetch('/api/logout', { method: 'POST' });
  if (res.ok) {
    window.location.href = '/login'; // Çıkış yapınca login sayfasına atar
  }
};

<div className="w-full mt-12 pt-6 border-t border-neutral-800 flex justify-center">
  <button
    onClick={handleLogout}
className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm flex items-center gap-2"  >
    Çıkış Yap
  </button>
</div>