'use client';
import { useState, useEffect } from 'react';
import { Users, UserPlus, ArrowLeft, ExternalLink, Copy, Check, Search, Edit3, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data);
        setFilteredCustomers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const results = customers.filter((c) => 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);

  const handleCopyLink = (slug: string, id: number) => {
    const fullUrl = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu müşteriyi ve NFC kart profilini tamamen silmek istediğine emin misin? Bu işlem geri alınamaz!')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        const updatedList = customers.filter(c => c.id !== id);
        setCustomers(updatedList);
        setFilteredCustomers(updatedList);
        setOpenMenuId(null);
      } else {
        alert(data.error || 'Silme işlemi başarısız oldu.');
      }
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Üst Navigasyon */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-900">
          <Link href="/admin" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Panele Dön
          </Link>
          <Link href="/admin/customers/new" className="flex items-center gap-2 bg-white text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-neutral-200 transition-colors shadow-lg">
            <UserPlus size={16} /> Yeni Müşteri Ekle
          </Link>
        </div>

        {/* Başlık ve Sayaç */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kayıtlı Müşteriler</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Sistemdeki tüm NFC kartvizit profillerini buradan yönetebilirsin.</p>
          </div>
          <span className="w-fit px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full text-xs font-semibold text-neutral-300">
            Toplam: {filteredCustomers.length}
          </span>
        </div>

        {/* SEARCHBOX */}
        <div className="relative mb-6">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-neutral-500">
            <Search size={18} />
          </span>
          <input 
            type="text"
            placeholder="İsim, şirket veya slug ile müşteri ara..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-neutral-600 transition-colors shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Müşteri Listesi */}
        {loading ? (
          <div className="text-center py-16 text-neutral-500 text-sm">Yükleniyor...</div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900/50 border border-neutral-800/80 rounded-3xl">
                <Users size={40} className="mx-auto text-neutral-600 mb-3" />
                <p className="text-sm font-medium text-neutral-400">Aradığınız kriterlere uygun müşteri bulunamadı.</p>
              </div>
            ) : (
              filteredCustomers.map((customer: any) => (
                <div key={customer.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-md hover:border-neutral-700 transition-all relative">
                  
                  <div className="flex items-center gap-4">
                    {customer.profile_image ? (
                      <img src={customer.profile_image} alt={customer.full_name} className="w-12 h-12 rounded-full object-cover border border-neutral-700 shadow" />
                    ) : (
                      <div className="w-12 h-12 bg-neutral-800 rounded-full border border-neutral-700 flex items-center justify-center font-bold text-lg text-white shadow-inner shrink-0">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-white">{customer.full_name}</h3>
                      <p className="text-xs text-neutral-400">
                        {customer.job_title || 'Unvan belirtilmemiş'} {customer.company ? `• ${customer.company}` : ''}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-mono bg-neutral-950 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">
                        /{customer.slug}
                      </span>
                    </div>
                  </div>

                  {/* Sadece Kopyala Butonu ve 3 Nokta Menüsü */}
                  <div className="flex items-center gap-2">
                    
                    <button 
                      onClick={() => handleCopyLink(customer.slug, customer.id)}
                      className="flex items-center justify-center w-10 h-10 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                      title="Linki Kopyala"
                    >
                      {copiedId === customer.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>

                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                        className={`flex items-center justify-center w-10 h-10 border rounded-xl transition-colors ${openMenuId === customer.id ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'}`}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {/* Açılır Menü (Dropdown) */}
                      {openMenuId === customer.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                          <div className="absolute right-0 top-full mt-2 w-36 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 flex flex-col overflow-hidden">
                            <Link 
                              href={`/admin/customers/edit/${customer.id}`} 
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                            >
                              <Edit3 size={14} /> Düzenle
                            </Link>
                            <a 
                              href={`/${customer.slug}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                            >
                              <ExternalLink size={14} /> İncele
                            </a>
                            <hr className="border-neutral-800 my-1 mx-2" />
                            <button 
                              onClick={() => handleDelete(customer.id)}
                              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                            >
                              <Trash2 size={14} /> Sil
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}