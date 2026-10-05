"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB (bucket ile aynı limit)

export function ImageUploader({
  businessId,
  filePath, // ör. "logo", "cover", "gallery/<uuid>", "employees/<uuid>"
  currentUrl,
  onUploaded,
  label,
  shape = "square",
}: {
  businessId: string;
  filePath: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label: string;
  shape?: "square" | "wide" | "circle";
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setError("Dosya 5MB'den küçük olmalı.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Sadece görsel dosyaları yüklenebilir.");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${businessId}/${filePath}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    const bustedUrl = `${data.publicUrl}?t=${Date.now()}`;
    setPreview(bustedUrl);
    onUploaded(bustedUrl);
  }

  const dims =
    shape === "wide" ? "aspect-[16/6] w-full" : shape === "circle" ? "h-16 w-16 rounded-full" : "h-24 w-24";

  return (
    <div>
      <span className="text-xs font-medium text-stone-500">{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <div
          className={`${dims} shrink-0 overflow-hidden ${shape === "circle" ? "rounded-full" : "rounded-lg"} border border-stone-200 bg-stone-50`}
        >
          {preview ? (
            <div className="relative h-full w-full">
              <Image src={preview} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-stone-300">Görsel yok</div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="focus-ring rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:border-stone-300 disabled:opacity-60"
          >
            {uploading ? "Yükleniyor…" : "Görsel Seç"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
