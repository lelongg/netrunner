import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { DEFAULT_RELAY } from "../net/relay";
import { onSettings, setSetting, settings } from "../settings";
import { Icon, type IconName } from "../icons";
import { disablePush, enablePush, pushSupported } from "../net/push";
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

function Volume({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  return (
    <label class="setting-volume">
      <span class="sr-only">{label}</span>
      <input class="volume" type="range" min={0} max={100} step={5} value={Math.round(value * 100)} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value) / 100)} onChange={onCommit} />
      <span class="setting-volume-value">{Math.round(value * 100)}%</span>
    </label>
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

export function SettingsSections() {
  const [, setTick] = useState(0);
  useEffect(() => onSettings(() => setTick((t) => t + 1)), []);
  const [relay, setRelay] = useState(settings.relay);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("nsg.name") ?? "Player";
    } catch {
      return "Player";
    }
  });
  const dirty = relay.trim() !== settings.relay;
  const valid = !relay.trim() || /^https?:\/\/[^\s/]+/.test(relay.trim());
  return (
    <>
      <MenuSection title="Audio">
        <Toggle
          label="Sound effects"
          on={settings.sound}
          onChange={(v) => {
            setSetting("sound", v);
            if (v) play("click-credit");
          }}
        />
        {settings.sound && <Volume label="Effects volume" value={settings.volume} onChange={(v) => setSetting("volume", v)} onCommit={() => play("click-credit")} />}
        <Toggle label="Music" on={settings.music} onChange={(v) => setSetting("music", v)} />
        {settings.music && <Volume label="Music volume" value={settings.musicVolume} onChange={(v) => setSetting("musicVolume", v)} />}
      </MenuSection>
      <MenuSection title="Display">
        <Toggle label="Animations" on={settings.animations} onChange={(v) => setSetting("animations", v)} />
        <Toggle label="Keyword glossary" on={settings.glossary} onChange={(v) => setSetting("glossary", v)} />
      </MenuSection>
      <MenuSection title="Player">
        <label class="setting-field">
          <span class="label">Name</span>
          <input
            value={name}
            maxLength={24}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setName(value);
              try {
                localStorage.setItem("nsg.name", value.trim() || "Player");
              } catch {}
            }}
          />
        </label>
        <div class="setting-field">
          <span class="label">Default format</span>
          <Picker title="Default format" value={settings.format} onChange={(f: GameFormat) => setSetting("format", f)} options={GAME_FORMATS.map((f) => ({ key: f.key as GameFormat, label: f.label, hint: FORMAT_DESC[f.key as GameFormat] }))} />
        </div>
        {pushSupported() && (
          <Toggle
            label="Turn notifications"
            on={settings.notifications}
            onChange={async (v) => {
              if (!v) return disablePush();
              const error = await enablePush();
              if (error) tell("Notifications are off", error);
            }}
          />
        )}
      </MenuSection>
      <details class="menu-section menu-advanced">
        <summary class="label">Advanced</summary>
        <label class="setting-field">
          <span class="label">Relay server</span>
          <span class="relay-field">
            <input value={relay} placeholder={DEFAULT_RELAY ?? "https://…"} spellcheck={false} autocapitalize="off" onInput={(e) => setRelay((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === "Enter" && dirty && valid && setSetting("relay", relay.trim())} />
            {dirty && (
              <button class="ghost" aria-label="Save relay" title="Save relay" disabled={!valid} onClick={() => setSetting("relay", relay.trim())}>
                <Icon name="check" />
              </button>
            )}
            {!!settings.relay && settings.relay !== DEFAULT_RELAY && (
              <button
                class="ghost"
                aria-label="Use the default relay"
                title="Use the default relay"
                onClick={() => {
                  setRelay("");
                  setSetting("relay", "");
                }}
              >
                <Icon name="undo" />
              </button>
            )}
          </span>
        </label>
      </details>
    </>
  );
}

export function SettingsMenu({ onClose }: { onClose: () => void }) {
  return (
    <MenuDrawer title="Settings" onClose={onClose}>
      <SettingsSections />
    </MenuDrawer>
  );
}
