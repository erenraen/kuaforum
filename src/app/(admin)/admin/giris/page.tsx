"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      setError("E-posta veya şifre hatalı.");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    setLoading(false);

    if (profile?.role !== "admin") {
      setError("Bu hesap admin yetkisine sahip değil.");
      await supabase.auth.signOut();
      return;
    }

    router.push(searchParams.get("sonra") || "/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-2xl text-ink">Platform Admin Girişi</h1>
      <p className="mt-1 text-sm text-stone-500">Sadece yetkili platform yöneticileri.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>
    </main>
  );
}
