'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ImagePlus, Camera, X, Check, CreditCard, Wallet, Edit3 } from 'lucide-react';
import Link from 'next/link';
import Cropper from 'react-easy-crop';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  canvas.width = 512;
  canvas.height = 512;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 512, 512);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export default function EditCustomerPage({ params }: { params: any }) {
  const id = params?.id;
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    slug: '',
    card_type: 'premium',
    account_holder: '',
    job_title: '',
    company: '',
    phone: '',
    email: '',
    iban: '',
    address: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    website: '',
    profile_image: '',
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const c = data.customer;
          const s = data.socials || {};
          setFormData({
            full_name: c.full_name || '',
            slug: c.slug || '',
            card_type: c.card_type || 'premium',
            account_holder: c.account_holder || '',
            job_title: c.job_title || '',
            company: c.company || '',
            phone: c.phone || '',
            email: c.email || '',
            iban: c.iban || '',
            address: c.address || '',
            instagram: s.instagram || '',
            linkedin: s.linkedin || '',
            twitter: s.twitter || '',
            website: s.website || '',
            profile_image: c.profile_image || '',
          });
        } else {
          alert('Müşteri bulunamadı.');
          router.push('/admin/customers');
        }
      })
      .catch(() => alert('Veri çekme hatası!'))
      .finally(() => setDataLoading(false));
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropImage = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        setFormData({ ...formData, profile_image: croppedImage });
        setShowCropModal(false);
        setImageSrc(null);
        setZoom(1);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin/customers');
        router.refresh();
      } else {
        alert(data.error || 'Güncelleme başarısız oldu.');
      }
    } catch (err) {
      alert('Sunucuya ulaşılamadı.');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-neutral-500">Müşteri verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8 pb-4 border-b border-neutral-900">
          <Link href="/admin/customers" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group w-fit">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Müşteri Listesine Dön
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Edit3 className="text-neutral-400" /> Profili Düzenle
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          
          {formData.card_type === 'premium' && (
            <div className="flex flex-col items-center justify-center mb-6 pb-6 border-b border-neutral-800">
              <div className="relative group cursor-pointer">
                <input type="file" accept="image/*" className="hidden" id="profile-upload" onChange={handleFileChange} />
                <label htmlFor="profile-upload" className="block cursor-pointer">
                  {formData.profile_image ? (
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-neutral-800 shadow-xl group-hover:border-neutral-600 transition-all">
                      <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-neutral-950 border-4 border-neutral-800 border-dashed shadow-xl flex flex-col items-center justify-center text-neutral-500 group-hover:border-neutral-600 group-hover:text-neutral-300 transition-all">
                      <ImagePlus size={28} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Yükle</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Kart Tipi Seçimi</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, card_type: 'premium' })}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.card_type === 'premium'
                    ? 'bg-neutral-800 border-white text-white shadow-lg'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <CreditCard size={28} className="mb-2" />
                <span className="font-bold text-sm">Premium Profil</span>
                <span className="text-[10px] mt-1 text-center opacity-70">Tüm sosyal linkler ve detaylar</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, card_type: 'iban' })}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.card_type === 'iban'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <Wallet size={28} className="mb-2" />
                <span className="font-bold text-sm">IBAN Kartı</span>
                <span className="text-[10px] mt-1 text-center opacity-70">Turuncu konseptli anında IBAN kopyalama</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Temel Bilgiler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  {formData.card_type === 'iban' ? 'İşletme Adı / Başlık *' : 'Ad Soyad *'}
                </label>
                <input type="text" name="full_name" required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.full_name} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Profil URL Uzantısı (Slug) *</label>
                <input type="text" name="slug" required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors font-mono" value={formData.slug} onChange={handleChange} />
              </div>
              
              {formData.card_type === 'iban' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Hesap Sahibi Ad Soyad *</label>
                  <input type="text" name="account_holder" required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.account_holder} onChange={handleChange} />
                </div>
              )}

              {formData.card_type === 'premium' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Unvan / Pozisyon</label>
                    <input type="text" name="job_title" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.job_title} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Şirket / Kurum</label>
                    <input type="text" name="company" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.company} onChange={handleChange} />
                  </div>
                </>
              )}
            </div>
          </div>

          {formData.card_type === 'premium' && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">İletişim Bilgileri</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Telefon Numarası</label>
                    <input type="text" name="phone" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">E-posta Adresi</label>
                    <input type="email" name="email" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.email} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Sosyal Medya & Web</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Instagram URL</label>
                    <input type="url" name="instagram" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.instagram} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">LinkedIn URL</label>
                    <input type="url" name="linkedin" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.linkedin} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Twitter / X URL</label>
                    <input type="url" name="twitter" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.twitter} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">Website / Diğer URL</label>
                    <input type="url" name="website" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors" value={formData.website} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">
              {formData.card_type === 'iban' ? 'IBAN Bilgisi (Zorunlu)' : 'IBAN ve Adres'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">IBAN</label>
                <input 
                  type="text" 
                  name="iban" 
                  required={formData.card_type === 'iban'} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 font-mono transition-colors" 
                  value={formData.iban} 
                  onChange={handleChange} 
                />
              </div>
              
              {formData.card_type === 'premium' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Adres</label>
                  <textarea name="address" rows={2} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-neutral-600 transition-colors resize-none" value={formData.address} onChange={handleChange} />
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
            <Save size={18} />
            {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </form>

        {showCropModal && imageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-white">Fotoğrafı Ayarla</h3>
                <button type="button" onClick={() => setShowCropModal(false)} className="text-neutral-400 hover:text-white transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative w-full h-72 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 mb-6">
                <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-medium text-neutral-400 mb-3 text-center">Yakınlaştır (Zoom)</label>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-white h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
              </div>

              <button type="button" onClick={handleCropImage} className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-neutral-200 transition-colors text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                <Check size={18} />
                Kırp ve Uygula
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}