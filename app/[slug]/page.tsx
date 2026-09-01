import db from '@/lib/db';
import { notFound } from 'next/navigation';
// Arayüz ikonları Lucide'dan
import { Globe, MapPin, CreditCard, Phone, Mail } from 'lucide-react';
// Marka logoları React Icons'dan
import { FaInstagram, FaLinkedin, FaTwitter, FaYoutube } from 'react-icons/fa';

// Platforma göre doğru ikonu döndüren yardımcı fonksiyon
const getSocialIcon = (platform: string) => {
  switch (platform) {
    case 'instagram': return <FaInstagram size={24} />;
    case 'linkedin': return <FaLinkedin size={24} />;
    case 'twitter': return <FaTwitter size={24} />;
    case 'youtube': return <FaYoutube size={24} />;
    case 'website': return <Globe size={24} />;
    default: return <Globe size={24} />;
  }
};

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Müşteri verisini çek (Asenkron Turso)
  const customerResult = await db.execute({
    sql: 'SELECT * FROM customers WHERE slug = ?',
    args: [slug]
  });
  
  const customer = customerResult.rows[0] as any;

  if (!customer) {
    notFound();
  }

  // 2. Bu müşteriye ait sosyal medya linklerini çek (Asenkron Turso)
  const linksResult = await db.execute({
    sql: 'SELECT * FROM social_links WHERE customer_id = ?',
    args: [customer.id]
  });
  
  const socialLinks = linksResult.rows as any[];

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center py-12 px-4 font-sans">
      
      <div className="w-full max-w-sm bg-neutral-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center border border-neutral-800">
        
        {/* Profil Fotoğrafı */}
        {customer.profile_image ? (
          <img 
            src={customer.profile_image} 
            alt={customer.full_name} 
            className="w-32 h-32 rounded-full border-4 border-neutral-700 object-cover mb-6 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          />
        ) : (
          <div className="w-32 h-32 bg-neutral-800 rounded-full border-4 border-neutral-700 flex items-center justify-center text-5xl font-bold mb-6 shadow-inner">
            {customer.full_name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Kimlik Bilgileri */}
        <h1 className="text-2xl font-bold text-center mb-1">{customer.full_name}</h1>
        <p className="text-neutral-400 text-center font-medium">{customer.job_title}</p>
        {customer.company && <p className="text-neutral-500 text-sm text-center mb-6">{customer.company}</p>}
        {!customer.company && <div className="mb-6"></div>}
        
        {/* Hızlı İletişim Butonları */}
        <div className="w-full grid grid-cols-2 gap-3 mb-8">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 py-3 rounded-xl transition-colors font-medium">
              <Phone size={18} /> Ara
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 py-3 rounded-xl transition-colors font-medium">
              <Mail size={18} /> E-posta
            </a>
          )}
        </div>

        {/* Dinamik Sosyal Medya İkonları */}
        {socialLinks.length > 0 && (
          <div className="w-full mb-8 flex flex-wrap justify-center gap-4">
            {socialLinks.map((link) => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-neutral-800 p-4 rounded-full hover:bg-neutral-700 transition-all hover:scale-110 shadow-lg"
              >
                {getSocialIcon(link.platform)}
              </a>
            ))}
          </div>
        )}

        {/* IBAN ve Adres (Sadece girilmişse render olur) */}
        {(customer.iban || customer.address) && (
          <div className="w-full space-y-4 mb-8 bg-neutral-950 p-5 rounded-2xl border border-neutral-800">
            {customer.iban && (
              <div>
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <CreditCard size={16} /> IBAN
                </div>
                <p className="font-mono text-sm break-all text-neutral-200">{customer.iban}</p>
              </div>
            )}
            
            {customer.iban && customer.address && <div className="h-px bg-neutral-800 my-2"></div>}
            
            {customer.address && (
              <div>
                <div className="flex items-center gap-2 text-neutral-400 text-sm mb-1">
                  <MapPin size={16} /> Adres
                </div>
                <p className="text-sm text-neutral-200">{customer.address}</p>
              </div>
            )}
          </div>
        )}

        {/* Rehbere Ekle Butonu (Aktif) */}
        <a 
          href={`/${slug}/vcard`} 
          className="w-full flex justify-center bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)] mb-6"
        >
          Kişilere Ekle
        </a>

        {/* KART İÇİ TAM ORTALANMIŞ LOGO VE METİN */}
        <div className="w-full pt-5 border-t border-neutral-800/80 flex flex-col items-center">
          <a href="https://taptap.tr" target="_blank" className="flex flex-col items-center gap-1.5 group opacity-80 hover:opacity-100 transition-opacity w-fit">
            <img src="/logo.jpeg" alt="TapTap" className="w-28 h-auto object-contain rounded-xl border border-neutral-800 shadow-lg bg-neutral-950 p-1.5" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold">Powered by</span>
              <span className="text-xs font-bold text-neutral-300 tracking-wider group-hover:text-white transition-colors">TapTap</span>
            </div>
          </a>
        </div>

      </div>
      
    </div>
  );
}