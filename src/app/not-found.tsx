import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="font-display text-5xl italic text-stone-300">404</span>
      <h1 className="mt-4 font-display text-2xl text-ink">Bu sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-stone-500">
        Aradığın sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link
        href="/"
        className="focus-ring mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-700"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
