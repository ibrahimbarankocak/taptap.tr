"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface InstaZoomImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function InstaZoomImage({ src, alt, className = "" }: InstaZoomImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  // Basılı tutma işlemi başladığında (0.3 saniye sonra resmi büyüt)
  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      setIsZoomed(true);
      // Cihaz destekliyorsa ufak bir titreşim (haptic feedback) ver
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 300);
  };

  // Basma işlemi bırakıldığında iptal et
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setIsZoomed(false);
  };

  // Kullanıcı basılı tutarken sayfayı kaydırırsa zoom'u kapat
  useEffect(() => {
    const handleScroll = () => {
      if (isZoomed) setIsZoomed(false);
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isZoomed]);

  return (
    <>
      {/* 1. Müşterinin Normal Profil Resmi */}
      <div
        className={`relative cursor-pointer select-none ${className}`}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchMove={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onContextMenu={(e) => e.preventDefault()} // Mobildeki sinir bozucu sağ tık menüsünü engeller
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover rounded-full"
          unoptimized // Eğer URL dışarıdan (örneğin AWS veya Turso'dan) geliyorsa Next.js hata vermesin diye
        />
      </div>

      {/* 2. Basılı Tutunca Çıkan Arka Plan ve Büyümüş Resim */}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
          isZoomed ? "opacity-100 visible bg-black/80 backdrop-blur-md" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        {/* Büyüyen Resim Çerçevesi */}
        <div
          className={`relative w-72 h-72 sm:w-96 sm:h-96 transition-transform duration-300 ease-out ${
            isZoomed ? "scale-100" : "scale-75"
          }`}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover rounded-full shadow-2xl border-2 border-white/20"
            unoptimized
          />
        </div>
      </div>
    </>
  );
}