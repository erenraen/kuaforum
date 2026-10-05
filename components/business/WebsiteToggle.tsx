"use client";

import { useState, useTransition } from "react";
import { toggleOwnWebsite } from "@/lib/business-actions";

export function WebsiteToggle({ enabled, slug }: { enabled: boolean; slug: string }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !isEnabled;
    startTransition(async () => {
      const result = await toggleOwnWebsite(next);
      if (result.ok) setIsEnabled(next);
    });
  }

  return (
    <div className="mt-5 rounded-xl2 border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-ink">Kendi web sitem {isEnabled ? "aktif" : "pasif"}</p>
          <p className="text-sm text-stone-500">
            {isEnabled ? "Siteniz yayında." : "Siteniz henüz yayınlanmadı."}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`focus-ring rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            isEnabled ? "bg-stone-600 hover:bg-stone-700" : "bg-ink hover:bg-moss-700"
          }`}
        >
          {isEnabled ? "Siteyi Kapat" : "Siteyi Yayınla"}
        </button>
      </div>

      {isEnabled && (
        <a
          href={`/site/${slug}`}
          target="_blank"
          className="focus-ring mt-4 inline-block rounded-lg bg-stone-50 px-4 py-2.5 text-sm text-moss-700 hover:underline"
        >
          kuaforum.com/site/{slug} → Siteyi görüntüle
        </a>
      )}
    </div>
  );
}
