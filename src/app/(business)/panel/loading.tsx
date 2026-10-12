export default function Loading() {
  return (
    <div>
      <div className="h-7 w-48 animate-pulse rounded bg-stone-100" />
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl2 border border-stone-200 bg-stone-50" />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl2 border border-stone-200 bg-stone-50" />
    </div>
  );
}
