import type { NextConfig } from "next";

// Tüm sayfalara eklenen güvenlik başlıkları
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" }, // siteyi başka sitelerin iframe'ine gömme (clickjacking) engeli
  // Kamera, mikrofon, konum sitede kullanılmıyor; pano (kopyala butonları) sadece kendi sayfalarımızda
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-write=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Yönetim paneli arama motorlarında görünmesin
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/logo.jpeg", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
