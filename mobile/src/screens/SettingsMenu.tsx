import { useEffect, useState } from "preact/hooks";
import { DEFAULT_RELAY } from "../net/relay";
import { onSettings, setSetting, settings } from "../settings";
import { Icon } from "../icons";
import { disablePush, enablePush, pushSupported } from "../net/push";
import { Picker, tell } from "../ui";
import { FORMAT_DESC, GAME_FORMATS, type GameFormat } from "../deckrules";

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button class="setting" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span class={`setting-state ${on ? "on" : ""}`}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export function SettingsMenu({ onClose }: { onClose: () => void }) {
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
      <div class="menu-backdrop" onClick={onClose} />
      <nav class="menu panel settings-menu">
        <span class="label">Settings</span>
        <label class="setting-field">
          <span class="label">Your name</span>
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
        <Toggle label="Animations" on={settings.animations} onChange={(v) => setSetting("animations", v)} />
        <Toggle label="Glossary" on={settings.glossary} onChange={(v) => setSetting("glossary", v)} />
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
      </nav>
    </>
  );
}
