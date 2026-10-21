import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DEFAULT_RELAY } from "../net/relay";
import { onSettings, setSetting, settings } from "../settings";
import { Icon, type IconName } from "../icons";
import { notifying, pushSupported, setNotify } from "../net/push";
import { Picker, tell } from "../ui";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat } from "../deckrules";
import { play } from "../sound";

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button class="setting" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span class={`switch ${on ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function Channel({ label, on, onToggle, value, onValue, onCommit }: { label: string; on: boolean; onToggle: (on: boolean) => void; value: number; onValue: (v: number) => void; onCommit?: () => void }) {
  const level = Math.round(value * 10);
  const pick = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next = Math.max(1, Math.min(10, Math.ceil(((e.clientX - r.left) / r.width) * 10)));
    if (next !== level) onValue(next / 10);
  };
  return (
    <div class={`channel ${on ? "" : "off"}`}>
      <button class="channel-head" role="switch" aria-checked={on} onClick={() => onToggle(!on)}>
        <span>{label}</span>
        <span class={`switch ${on ? "on" : ""}`} aria-hidden="true">
          <i />
        </span>
      </button>
      <div
        class="channel-level"
        role="slider"
        aria-label={`${label} volume`}
        aria-valuemin={10}
        aria-valuemax={100}
        aria-valuenow={level * 10}
        aria-disabled={!on}
        tabIndex={on ? 0 : -1}
        onPointerDown={(e) => {
          if (!on) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => on && (e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId) && pick(e)}
        onPointerUp={() => on && onCommit?.()}
        onKeyDown={(e) => {
          const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (on && d) onValue(Math.max(1, Math.min(10, level + d)) / 10);
        }}
      >
        <span class="channel-bars">
          {Array.from({ length: 10 }, (_, k) => (
            <i class={k < level ? "lit" : ""} />
          ))}
        </span>
        <span class="channel-value">{level * 10}%</span>
      </div>
    </div>
  );
}

export function MenuSection({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="menu-section">
      <span class="label">{title}</span>
      {children}
    </section>
  );
}

export function MenuItem({ icon, label, hint, onClick, tone }: { icon: IconName; label: string; hint?: string; onClick: () => void; tone?: "danger" | "quiet" }) {
  return (
    <button class={`menu-item ${tone ?? ""}`} onClick={onClick}>
      <Icon name={icon} />
      <span class="menu-item-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
    </button>
  );
}

export function MenuTile({ icon, label, onClick, active }: { icon: IconName; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button class={`menu-tile ${active ? "on" : ""}`} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

export function MenuDrawer({ title, tabs, tab, onTab, onClose, children }: { title: string; tabs?: string[]; tab?: string; onTab?: (t: string) => void; onClose: () => void; children: ComponentChildren }) {
  return (
    <>
      <div class="menu-backdrop" onClick={onClose} />
      <nav class="menu-drawer panel" aria-label={title}>
        {tabs && (
          <header class="menu-head">
            <div class="menu-tabs" role="tablist">
              {tabs.map((t) => (
                <button role="tab" aria-selected={t === tab} class={t === tab ? "on" : ""} onClick={() => onTab?.(t)}>
                  {t}
                </button>
              ))}
            </div>
          </header>
        )}
        <div class="menu-body">{children}</div>
      </nav>
    </>
  );
}

function storedName() {
  try {
    return localStorage.getItem("nsg.name") ?? "Player";
  } catch {
    return "Player";
  }
}

export function EditField({ title, label, saved, fallback, placeholder, maxLength, valid, raw, onSave }: { title: string; label: string; saved: string; fallback: string; placeholder?: string; maxLength?: number; valid?: (v: string) => boolean; raw?: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(saved);
  useEffect(() => setValue(saved), [saved]);
  const next = value.trim() || fallback;
  const dirty = next !== saved;
  const ok = !valid || valid(value.trim());
  const save = () => dirty && ok && onSave(next);
  return (
    <label class="field-box">
      <span class="label">{title}</span>
      <span class="field-box-row">
        <input value={value} placeholder={placeholder} maxLength={maxLength} spellcheck={!raw} autocapitalize={raw ? "off" : undefined} aria-label={label} onInput={(e) => setValue((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        {dirty && (
          <button class="ghost" aria-label={`Save ${label}`} title={`Save ${label}`} disabled={!ok} onClick={save}>
            <Icon name="check" />
          </button>
        )}
        {!dirty && saved !== fallback && (
          <button
            class="ghost"
            aria-label={`Reset ${label}`}
            title={`Reset ${label}`}
            onClick={() => {
              setValue(fallback);
              onSave(fallback);
            }}
          >
            <Icon name="undo" />
          </button>
        )}
      </span>
    </label>
  );
}

export function SettingsSections() {
  const [, setTick] = useState(0);
  useEffect(() => onSettings(() => setTick((t) => t + 1)), []);
  const [name, setName] = useState(storedName);
  return (
    <>
      <MenuSection title="Audio">
        <Channel
          label="Sound effects"
          on={settings.sound}
          onToggle={(v) => {
            setSetting("sound", v);
            if (v) play("click-credit");
          }}
          value={settings.volume}
          onValue={(v) => setSetting("volume", v)}
          onCommit={() => play("click-credit")}
        />
        <Channel label="Music" on={settings.music} onToggle={(v) => setSetting("music", v)} value={settings.musicVolume} onValue={(v) => setSetting("musicVolume", v)} />
      </MenuSection>
      <MenuSection title="Display">
        <Toggle label="Animations" on={settings.animations} onChange={(v) => setSetting("animations", v)} />
        <Toggle label="Parallax" on={settings.parallax} onChange={(v) => setSetting("parallax", v)} />
        <Toggle label="Keyword glossary" on={settings.glossary} onChange={(v) => setSetting("glossary", v)} />
      </MenuSection>
      <MenuSection title="Player">
        <EditField
          title="Name"
          label="name"
          saved={name}
          fallback="Player"
          maxLength={24}
          onSave={(v) => {
            try {
              localStorage.setItem("nsg.name", v);
            } catch {}
            setName(v);
          }}
        />
        <div class="field-box">
          <span class="label">Default format</span>
          <Picker title="Default format" value={settings.format} onChange={(f: GameFormat) => setSetting("format", f)} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
        </div>
      </MenuSection>
      {pushSupported() && (
        <MenuSection title="Notifications">
          {(
            [
              ["turn", "Your move in a game"],
              ["match", "Opponent found"],
            ] as const
          ).map(([kind, label]) => (
            <Toggle
              label={label}
              on={notifying(kind)}
              onChange={async (v) => {
                const error = await setNotify(kind, v);
                if (error) tell("Notifications are off", error);
              }}
            />
          ))}
        </MenuSection>
      )}
      <details class="menu-section menu-advanced">
        <summary>Advanced</summary>
        <EditField title="Relay server" label="relay" saved={settings.relay} fallback="" placeholder={DEFAULT_RELAY ?? "https://…"} valid={(v) => !v || /^https?:\/\/[^\s/]+/.test(v)} raw onSave={(v) => setSetting("relay", v)} />
      </details>
    </>
  );
}

export function SettingsMenu({ onClose, onCredits }: { onClose: () => void; onCredits?: () => void }) {
  return (
    <MenuDrawer title="Settings" onClose={onClose}>
      <SettingsSections />
      {onCredits && (
        <MenuSection title="About">
          <MenuItem
            icon="book"
            label="Credits"
            hint="Sound, music and card data"
            onClick={() => {
              onClose();
              onCredits();
            }}
          />
        </MenuSection>
      )}
    </MenuDrawer>
  );
}
