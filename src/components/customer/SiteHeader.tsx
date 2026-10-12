"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/istanbul/kadikoy/berberler", label: "İşletmeleri Keşfet" },
  { href: "/isletmeniz-icin", label: "İşletmenizi Ekleyin" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="focus-ring font-display text-xl text-ink" onClick={() => setMenuOpen(false)}>
          Kuaförüm
        </Link>

        {/* Masaüstü navigasyon */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href ? "text-ink" : "text-stone-500 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/isletmeniz-icin"
            className="focus-ring ml-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moss-700"
          >
            İşletmenizi Ekleyin
          </Link>
          <Link
            href="/giris"
            className="focus-ring ml-1 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:text-ink"
          >
            İşletme Girişi
          </Link>
        </nav>

        {/* Mobil hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menü"
          aria-expanded={menuOpen}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-ink sm:hidden"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobil menü paneli */}
      {menuOpen && (
        <nav className="border-t border-stone-200 bg-paper px-4 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="focus-ring block rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-stone-50"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/giris"
            onClick={() => setMenuOpen(false)}
            className="focus-ring block rounded-lg px-3 py-3 text-base font-medium text-stone-500 hover:bg-stone-50"
          >
            İşletme Girişi
          </Link>
        </nav>
      )}
    </header>
  );
}
