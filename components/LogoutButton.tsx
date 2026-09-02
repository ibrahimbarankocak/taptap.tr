"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    const res = await fetch('/api/logout', { method: 'POST' });
    if (res.ok) {
      // Tam yönlendirme yolunu kök dizine göre netleştiriyoruz
      window.location.href = '/login'; 
    }
  };

  return (
    <div className="w-full mt-12 pt-6 border-t border-neutral-800 flex justify-center">
      <button
        onClick={handleLogout}
        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium px-6 py-3 rounded-xl transition-colors text-sm flex items-center gap-2 cursor-pointer"
      >
        Çıkış Yap
      </button>
    </div>
  );
}