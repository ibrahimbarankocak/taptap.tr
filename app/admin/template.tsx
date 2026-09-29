// Admin sayfaları arasında geçişte yumuşak giriş animasyonu (template her gezinmede yeniden oluşur)
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
