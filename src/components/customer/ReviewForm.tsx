"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/lib/booking/actions";

export function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitReview({ appointmentId, customerPhone: phone, rating, comment: comment || undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="rounded-xl2 border border-moss-100 bg-moss-50 p-5 text-center">
        <p className="font-medium text-moss-700">Teşekkürler! Yorumunuz kaydedildi.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-stone-200 bg-white p-5">
      <div>
        <span className="text-xs font-medium text-stone-500">Puanınız</span>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`focus-ring text-2xl ${n <= rating ? "text-clay-500" : "text-stone-200"}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-stone-500">Telefon (kimlik doğrulama için)</span>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Randevu alırken kullandığınız numara"
          className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-stone-500">Yorumunuz (isteğe bağlı)</span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="focus-ring w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
      >
        {isPending ? "Gönderiliyor…" : "Yorumu Gönder"}
      </button>
    </form>
  );
}
