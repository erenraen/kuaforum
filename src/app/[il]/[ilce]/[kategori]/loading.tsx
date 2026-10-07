import { SiteHeader } from "@/components/customer/SiteHeader";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-4 w-40 animate-pulse rounded bg-stone-100" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded bg-stone-100" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-stone-100" />

        <div className="mt-6 h-10 w-full animate-pulse rounded-xl2 bg-stone-100" />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl2 border border-stone-200 bg-white">
              <div className="h-36 animate-pulse bg-stone-100" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
