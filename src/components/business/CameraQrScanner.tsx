"use client";

import { useEffect, useRef, useState } from "react";

// Tarayıcıdan okunan QR verisine GÜVENİLMEZ — sadece metni çıkarıp parent'a
// iletir. Gerçek doğrulama (token geçerli mi, süresi dolmuş mu, hangi
// işletmeye ait, daha önce kullanılmış mı) her zaman sunucuda
// (redeem_checkin_token RPC) yapılır; bkz. CheckinScanner.tsx.
export function CameraQrScanner({ onDetected, onCancel }: { onDetected: (text: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Bu tarayıcı kamera erişimini desteklemiyor.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanLoop();
        }
      } catch {
        setError("Kameraya erişim izni verilmedi. Kod ile check-in yapabilirsin.");
      }
    }

    async function scanLoop() {
      const jsQR = (await import("jsqr")).default;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      function tick() {
        if (cancelled || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas!.width = video.videoWidth;
        canvas!.height = video.videoHeight;
        ctx!.drawImage(video, 0, 0, canvas!.width, canvas!.height);
        const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code && code.data) {
          setDetected(true);
          stopCamera();
          onDetected(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      tick();
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function handleCancel() {
    stopCamera();
    onCancel();
  }

  return (
    <div className="rounded-xl2 border border-stone-200 bg-black p-2">
      {error ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-white">{error}</p>
          <button onClick={handleCancel} className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink">
            Kod ile Check-in&apos;e Dön
          </button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg">
          <video ref={videoRef} className="w-full" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-8 rounded-xl2 border-2 border-white/70" />
          {!detected && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
              QR kodu kare içine hizala
            </p>
          )}
        </div>
      )}
      {!error && (
        <button onClick={handleCancel} className="focus-ring mt-2 w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          İptal
        </button>
      )}
    </div>
  );
}
