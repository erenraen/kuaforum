"use client";

import { useState } from "react";
import Image from "next/image";
import { addBusinessPhoto, removeBusinessPhoto } from "@/lib/business-actions";
import { ImageUploader } from "@/components/business/ImageUploader";

export function GalleryManager({
  businessId,
  initialPhotos,
}: {
  businessId: string;
  initialPhotos: { id: string; url: string }[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploadKey, setUploadKey] = useState(0); // uploader'ı her ekleme sonrası sıfırlamak için
  const [error, setError] = useState<string | null>(null);

  async function handleUploaded(url: string) {
    setError(null);
    const result = await addBusinessPhoto(url);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), url }]);
    setUploadKey((k) => k + 1);
  }

  async function handleRemove(id: string) {
    setError(null);
    const result = await removeBusinessPhoto(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Galeri</h1>
      <p className="mt-1 text-sm text-stone-500">
        İşletme detay sayfanızda ve kendi web sitenizde gösterilecek fotoğraflar.
      </p>

      <div className="mt-5 rounded-xl2 border border-dashed border-stone-300 bg-white p-5">
        <ImageUploader
          key={uploadKey}
          businessId={businessId}
          filePath={`gallery/${crypto.randomUUID()}`}
          label="Yeni fotoğraf ekle"
          onUploaded={handleUploaded}
        />
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-stone-100">
            <Image src={p.url} alt="" fill className="object-cover" unoptimized />
            <button
              onClick={() => handleRemove(p.id)}
              className="focus-ring absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
            >
              Sil
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-stone-500">Henüz fotoğraf eklenmedi.</p>
        )}
      </div>
    </div>
  );
}
