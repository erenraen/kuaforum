"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

export function PanelMobileNav({
  items,
  businessName,
}: {
  items: { href: string; label: string }[];
  businessName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="sm:hidden">
      <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4">
        <div className="min-w-0">
          <Link href="/" className="font-display text-base text-ink">Kuaförüm</Link>
          {businessName && <p className="truncate text-xs text-stone-400">{businessName}</p>}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Panel menüsü"
          aria-expanded={open}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-lg text-ink"
        >
          {open ? (
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

      {open && (
        <nav className="max-h-[70vh] overflow-y-auto border-b border-stone-200 bg-white px-2 py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`focus-ring block rounded-lg px-3 py-3 text-base font-medium ${
                pathname === item.href ? "bg-stone-100 text-ink" : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-stone-200 px-3 pt-3">
            <LogoutButton />
          </div>
        </nav>
      )}
    </div>
  );
}
