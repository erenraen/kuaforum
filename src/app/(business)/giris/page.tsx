"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function BusinessLoginPage() {
  return (
    <Suspense>
      <BusinessLoginForm />
    </Suspense>
  );
}

function BusinessLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError("E-posta veya şifre hatalı.");
      return;
    }

    router.push(searchParams.get("sonra") || "/panel");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <Link href="/" className="font-display text-xl text-ink">Kuaförüm</Link>
      <h1 className="mt-6 font-display text-2xl text-ink">İşletme Paneli Girişi</h1>
      <p className="mt-1 text-sm text-stone-500">
        İşletmenizi yönetmek için giriş yapın.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">E-posta</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Şifre</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Henüz işletmeniz platformda yok mu?{" "}
        <Link href="/isletmeniz-icin" className="focus-ring text-moss-700 hover:underline">
          Instagram&apos;dan bize yazın
        </Link>
        .
      </p>
    </main>
  );
}
