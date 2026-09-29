"use client";

import { useState, useRef, useEffect } from "react";

interface InstaZoomImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Instagram tarzı: basılı tutunca profil fotoğrafı büyür
export default function InstaZoomImage({ src, alt, className = "" }: InstaZoomImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Basılı tutma başladığında (0.3 saniye sonra resmi büyüt)
  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      setIsZoomed(true);
      navigator.vibrate?.(50); // destekleyen cihazda ufak titreşim
    }, 300);
  };

  // Bırakıldığında iptal et
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setIsZoomed(false);
  };

  // Basılı tutarken sayfa kaydırılırsa zoom'u kapat
  useEffect(() => {
    if (!isZoomed) return;
    const handleScroll = () => setIsZoomed(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isZoomed]);

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  return (
    <>
      <div
        className={`relative cursor-pointer select-none ${className}`}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onTouchMove={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onContextMenu={(e) => e.preventDefault()} // mobildeki uzun basma menüsünü engeller
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- önbellekli /avatar rotası zaten optimize */}
        <img
          src={src}
          alt={alt}
          width={512}
          height={512}
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover rounded-full"
        />
      </div>

      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
          isZoomed ? "opacity-100 visible bg-black/80 backdrop-blur-md" : "opacity-0 invisible pointer-events-none"
        }`}
        aria-hidden={!isZoomed}
      >
        <div
          className={`relative w-72 h-72 sm:w-96 sm:h-96 transition-transform duration-300 ease-out ${
            isZoomed ? "scale-100" : "scale-75"
          }`}
        >
          {/* Aynı URL: tarayıcı önbellekten gösterir, ikinci indirme olmaz */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className="w-full h-full object-cover rounded-full shadow-2xl border-2 border-white/20" />
        </div>
      </div>
    </>
  );
}
