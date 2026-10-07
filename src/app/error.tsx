"use client";

import { useEffect } from "react";
import Link from "next/link";

// Next.js App Router hata sınırı. Kullanıcıya ASLA ham stack trace/SQL hatası
// göstermez; geliştirici için konsola loglar (gerçek projede Sentry vb. bir
// loglama servisine bağlanabilir).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Beklenmeyen hata:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="font-display text-4xl text-stone-300">⚠</span>
      <h1 className="mt-4 font-display text-2xl text-ink">Bir şeyler ters gitti</h1>
      <p className="mt-2 text-sm text-stone-500">
        Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun devam ederse bizimle iletişime
        geçin.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="focus-ring rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-ink hover:border-stone-300"
        >
          Tekrar dene
        </button>
        <Link href="/" className="focus-ring rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-700">
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
