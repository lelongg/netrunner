import { useEffect, useState } from "preact/hooks";
import { DEFAULT_RELAY } from "../net/relay";
import { onSettings, setSetting, settings } from "../settings";

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
  const dirty = relay.trim() !== settings.relay;
  const valid = !relay.trim() || /^https?:\/\/[^\s/]+/.test(relay.trim());
  return (
    <>
      <div class="menu-backdrop" onClick={onClose} />
      <nav class="menu panel settings-menu">
        <span class="label">Settings</span>
        <Toggle label="Animations" on={settings.animations} onChange={(v) => setSetting("animations", v)} />
        <Toggle label="Glossary in card text" on={settings.glossary} onChange={(v) => setSetting("glossary", v)} />
        <label class="setting-field">
          <span class="label">Relay server</span>
          <input value={relay} placeholder={DEFAULT_RELAY ?? "https://…"} spellcheck={false} autocapitalize="off" onInput={(e) => setRelay((e.target as HTMLInputElement).value)} />
        </label>
        <div class="setting-actions">
          <button class="primary" disabled={!dirty || !valid} onClick={() => setSetting("relay", relay.trim())}>
            Save relay
          </button>
          <button
            class="ghost"
            disabled={!settings.relay && !relay}
            onClick={() => {
              setRelay("");
              setSetting("relay", "");
            }}
          >
            Default
          </button>
        </div>
        <p class="hint">Online games live on the relay that created them: change it only to play on another server.</p>
      </nav>
    </>
  );
}
