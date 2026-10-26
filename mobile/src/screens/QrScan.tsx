import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../i18n";

export function codeFromQr(text: string): string | null {
  const t = text.trim();
  try {
    const join = new URL(t).searchParams.get("join");
    if (join && /^[A-Z0-9]{5}$/i.test(join)) return join.toUpperCase();
  } catch {}
  return /^[A-Z0-9]{5}$/i.test(t) ? t.toUpperCase() : null;
}

export function QrScan({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [miss, setMiss] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    let raf = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError(t("Camera unavailable. Allow camera access for this site, or type the code."));
        return;
      }
      if (stop || !video.current) return stream.getTracks().forEach((t) => t.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      const Detector = (window as any).BarcodeDetector;
      const native = Detector ? new Detector({ formats: ["qr_code"] }) : null;
      const jsQR = native ? null : (await import("jsqr")).default;
      let last = 0;
      const tick = async (now: number) => {
        if (stop) return;
        raf = requestAnimationFrame(tick);
        const v = video.current;
        if (!v || v.readyState < 2 || now - last < 180) return;
        last = now;
        let text: string | null = null;
        if (native) {
          const found = await native.detect(v).catch(() => []);
          text = found[0]?.rawValue ?? null;
        } else if (jsQR && ctx) {
          const w = Math.min(640, v.videoWidth);
          const h = Math.round((v.videoHeight / v.videoWidth) * w);
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(v, 0, 0, w, h);
          text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
        }
        if (!text) return;
        const code = codeFromQr(text);
        if (code) {
          stop = true;
          navigator.vibrate?.(30);
          onCode(code);
        } else setMiss(true);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  return (
    <div class="qr-scan">
      {error ? (
        <p class="hint">{error}</p>
      ) : (
        <>
          <span class={`qr-view ${live ? "live" : ""}`}>
            <i class="qr-static" />
            <video ref={video} muted playsInline onPlaying={() => setLive(true)} />
            <i class="qr-corners" />
            <i class="qr-line" />
          </span>
          <p class="hint">{miss ? t("That QR code is not a Pocket Rig game.") : t("Point the camera at the game's QR code.")}</p>
        </>
      )}
    </div>
  );
}
