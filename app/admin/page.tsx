import db from '@/lib/db';
import { Users, UserPlus, ArrowRight, ShieldCheck, ShoppingBag, Nfc, BarChart3, Star, Handshake } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const result = await db.execute("SELECT COUNT(*) as count FROM customers WHERE card_type IS NULL OR card_type != 'google'");
  const totalCustomers = (result.rows[0] as any)?.count || 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6 sm:p-8">
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
            className="press flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
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
            className="press flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
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

          <Link
            href="/admin/crm"
            className="press flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-orange-400 group-hover:scale-105 transition-transform">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">CRM / Shopier Siparişleri</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Sipariş notlarındaki kart bilgileri, müşteriler ve satışlar</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/nfc"
            className="press flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-emerald-400 group-hover:scale-105 transition-transform">
                <Nfc size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">NFC Kart Yönetimi</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Kartı oku, elle link yaz, kartı sil</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/google"
            className="press sm:col-span-2 flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sky-400 group-hover:scale-105 transition-transform">
                <Star size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">Google Yorum Kartları</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Dokununca direkt Google yorum ekranı açılan kartlar</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/ortaklik"
            className="press sm:col-span-2 flex items-center justify-between p-6 bg-gradient-to-br from-orange-500/10 to-neutral-900 border border-orange-500/30 rounded-3xl hover:border-orange-400/60 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(249,115,22,0.35)] group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-orange-500/30 rounded-2xl text-orange-400 group-hover:scale-105 transition-transform">
                <Handshake size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">IBAN Kartı Ortaklığı</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Basılan kart, alınan ödemeler ve bekleyen tutar</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/stats"
            className="press sm:col-span-2 flex items-center justify-between p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-600 hover:bg-neutral-900/80 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.15)] group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl text-sky-400 group-hover:scale-105 transition-transform">
                <BarChart3 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-200 group-hover:text-white">İstatistikler</h4>
                <p className="text-xs text-neutral-400 mt-0.5">Ciro, satışlar, ürünler, şehirler ve grafikler</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </Link>

        </div>

        {/* Çıkış Yap Butonu (Güvenli Bileşen) */}
        <LogoutButton />

      </div>
    </div>
  );
}