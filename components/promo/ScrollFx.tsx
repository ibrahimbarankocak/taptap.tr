'use client';
import { useEffect } from 'react';

// Tanıtım sayfasının kaydırma efektleri (tek bileşen, tüm sayfa için):
//  - [data-reveal]: ekrana girince yumuşakça belirir (IntersectionObserver)
//  - [data-speed="0.2"]: paralaks — kaydırdıkça farklı hızda hareket eder (rAF ile, sadece transform)
// JS çalışmazsa içerik zaten görünür (gizleme sadece html.fx-ready varken uygulanır).
export default function ScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Telefon/tablette paralaks yok: iPhone'da kaydırma sırasında sürekli katman güncellemek belleği zorluyor
    const smallOrTouch = window.matchMedia('(max-width: 767px), (hover: none)').matches;
    root.classList.add('fx-ready');

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    if (reduce || smallOrTouch) return () => io.disconnect();

    const layers = Array.from(document.querySelectorAll<HTMLElement>('[data-speed]'));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const r = el.parentElement?.getBoundingClientRect();
        if (!r || r.bottom < -200 || r.top > vh + 200) continue; // ekran dışındakileri hesaplama
        const speed = Number(el.dataset.speed) || 0;
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
      root.style.setProperty('--scroll', String(window.scrollY));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
