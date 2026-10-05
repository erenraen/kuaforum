export default function Loading() {
  return (
    <main className="pb-16">
      <div className="h-56 w-full animate-pulse bg-stone-200 sm:h-72" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          <div className="h-20 w-20 animate-pulse rounded-xl2 border-4 border-white bg-stone-200" />
          <div className="space-y-2 pb-1">
            <div className="h-6 w-48 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-5 w-40 animate-pulse rounded bg-stone-100" />
            <div className="h-24 w-full animate-pulse rounded-xl2 bg-stone-100" />
            <div className="h-24 w-full animate-pulse rounded-xl2 bg-stone-100" />
          </div>
          <div className="h-80 animate-pulse rounded-xl2 bg-stone-100" />
        </div>
      </div>
    </main>
  );
}
