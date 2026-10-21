import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { QrCode } from "../QrCode";
import { QrZoom, shareLink } from "./Lobby";
import { Cta } from "../ui";
import { Icon } from "../icons";
import { useTilt } from "../tilt";

export interface WaitProps {
  code?: string;
  chips: ComponentChildren;
  hint: string;
  busy: boolean;
  notify?: () => void;
  onCancel: () => void;
}

function useInvite(code?: string) {
  const [copied, setCopied] = useState(false);
  const [big, setBig] = useState(false);
  const from = useRef<HTMLButtonElement>(null);
  const link = code ? shareLink(code) : "";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Netrunner game", text: `Code: ${code}`, url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {}
  };
  const qr = (cls: string) =>
    code ? (
      <button ref={from} class={`qr-button ${cls}`} onClick={() => setBig(true)} aria-label="Enlarge the QR code">
        <QrCode value={link} label={`QR code to join game ${code}`} />
      </button>
    ) : (
      <div class={`qr qr-pending ${cls}`} />
    );
  const shareCta = (
    <Cta onClick={share} disabled={!code} tone="cyan">
      {copied ? "Link copied" : "Share the link"}
    </Cta>
  );
  const zoom = big && code ? <QrZoom value={link} code={code} from={from.current} onClose={() => setBig(false)} /> : null;
  return { qr, shareCta, zoom };
}

function Actions({ busy, notify, onCancel }: WaitProps) {
  return (
    <div class="wr-actions">
      {notify && (
        <button class="match-notify" disabled={busy} onClick={notify}>
          <Icon name="sound" />
          Notify me when someone joins
        </button>
      )}
      <button class="match-stop" disabled={busy} onClick={onCancel}>
        <Icon name="close" />
        Cancel the game
      </button>
    </div>
  );
}

function Radar() {
  return (
    <span class="match-radar" aria-hidden="true">
      <i />
      <i />
      <i />
      <b />
    </span>
  );
}

const letters = (code?: string) => (code || "·····").split("");

function Ticket(p: WaitProps) {
  const { qr, shareCta, zoom } = useInvite(p.code);
  return (
    <section class="wr wr-ticket">
      <div class="wr-ticket-card">
        <div class="wr-ticket-top">
          <span class="label">Pocket Rig · Game invite</span>
          <span class="match-title">Waiting for an opponent</span>
          <span class="match-chips">{p.chips}</span>
        </div>
        <div class="wr-perf" aria-hidden="true" />
        <div class="wr-ticket-stub">
          <div class="wr-stub-in">
            {qr("wr-qr")}
            <div class="wr-stub-text">
              <span class="wr-code">{p.code || "·····"}</span>
              <span class="label">Scan or enter this code to join</span>
            </div>
          </div>
        </div>
      </div>
      {shareCta}
      <p class="hint">{p.hint}</p>
      <Actions {...p} />
      {zoom}
    </section>
  );
}

function Console(p: WaitProps) {
  const { qr, shareCta, zoom } = useInvite(p.code);
  return (
    <section class="wr wr-console">
      <div class="wr-sky">
        <Radar />
        <div class="wr-sky-text">
          <span class="match-title">Waiting for an opponent</span>
          <span class="match-chips">{p.chips}</span>
        </div>
      </div>
      <div class="wr-deck panel">
        <div class="wr-deck-row">
          {qr("wr-qr")}
          <div class="wr-deck-code">
            <span class="label">Game code</span>
            <span class="wr-code">{p.code || "·····"}</span>
            <span class="hint">{p.hint}</span>
          </div>
        </div>
        {shareCta}
        <Actions {...p} />
      </div>
      {zoom}
    </section>
  );
}

function Signal(p: WaitProps) {
  const { qr, shareCta, zoom } = useInvite(p.code);
  return (
    <section class="wr wr-signal">
      <div class="wr-signal-head">
        <span class="live-dot" aria-hidden="true" />
        <span class="label">Waiting for an opponent</span>
      </div>
      <div class="wr-slots" aria-label={`Game code ${p.code ?? ""}`}>
        {letters(p.code).map((c, i) => (
          <span class="wr-slot" style={{ animationDelay: `${i * 0.12}s` }}>
            {c}
          </span>
        ))}
      </div>
      <span class="match-chips">{p.chips}</span>
      <div class="wr-signal-stage">
        <Radar />
        {qr("wr-qr")}
      </div>
      {shareCta}
      <Actions {...p} />
      {zoom}
    </section>
  );
}

function Card(p: WaitProps) {
  const { qr, shareCta, zoom } = useInvite(p.code);
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref);
  return (
    <section class="wr wr-card" ref={ref}>
      <div class="wr-card-head">
        <span class="match-title">Waiting for an opponent</span>
        <span class="match-chips">{p.chips}</span>
      </div>
      <div class="wr-card-stage">
        <div class="wr-invite-card">
          <span class="wr-invite-label">Invitation</span>
          {qr("wr-qr")}
          <span class="wr-code">{p.code || "·····"}</span>
          <i class="wr-shine" aria-hidden="true" />
        </div>
      </div>
      {shareCta}
      <Actions {...p} />
      {zoom}
    </section>
  );
}

export function WaitRoom(p: WaitProps & { variant: string }) {
  if (p.variant === "b") return <Console {...p} />;
  if (p.variant === "c") return <Signal {...p} />;
  if (p.variant === "d") return <Card {...p} />;
  return <Ticket {...p} />;
}
