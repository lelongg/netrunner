import { Ticker } from "../ui";
import { Icon } from "../icons";
import { useBackClose } from "../back";
import { t } from "../i18n";

const SOUNDS = [
  ["Bloop", "The Bloop sea creature .Wav", "Scpsea", "https://freesound.org/s/701050/", "CC0"],
  ["Echo", "space_blip4.aif", "tim.kahn", "https://freesound.org/s/52754/", "CC BY 4.0"],
  ["End of the Line", "pistol_riccochet.ogg", "Diboz", "https://freesound.org/s/213925/", "CC0"],
  ["Pulse", "pulse 1.wav", "cameronmusic", "https://freesound.org/s/138421/", "CC BY 3.0"],
  ["Wave", "deep-bass-wave-130.mp3", "iscence", "https://freesound.org/s/65516/", "CC0"],
  ["Time-out", "ok9.wav", "ZenithInfinitiveStudios", "https://freesound.org/s/343008/", "CC0"],
];

const link = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);

export function Credits({ onClose }: { onClose: () => void }) {
  useBackClose(true, onClose);
  return (
    <>
      <Ticker>
        {t("Credits")} <span class="cyan">Pocket Rig</span>
      </Ticker>
      <div class="screen credits">
        <header class="screen-head">
          <button class="ghost" onClick={onClose} aria-label={t("Back to home")}>
            <Icon name="arrow-left" />
          </button>
          <h1>{t("CREDITS")}</h1>
        </header>

        <section class="panel section">
          <h2 class="label">{t("Rules engine")}</h2>
          <p>{t("The game runs on the jinteki.net rules engine, MIT license.").split("jinteki.net").flatMap((s, i) => (i ? [link("https://github.com/mtgred/netrunner", "jinteki.net"), s] : [s]))}</p>
        </section>

        <section class="panel section">
          <h2 class="label">{t("Cards")}</h2>
          <p>{t("Card data and images from")} {link("https://netrunnerdb.com", "NetrunnerDB")}.</p>
        </section>

        <section class="panel section cyan">
          <h2 class="label">{t("Sound & Music")}</h2>
          <p>{t("Sound effects and adaptive music generated procedurally with Claude (Anthropic).")}</p>
          <p>
            {t("Additional recordings from Kenney's Casino Audio, RPG Audio, UI Audio and Digital Audio packs,")} {link("https://kenney.nl", "kenney.nl")}, {t("CC0 license.")}
          </p>
        </section>

        <section class="panel section">
          <h2 class="label">{t("jinteki.net sounds")}</h2>
          <p>{t("Classic game sounds from the jinteki.net sound bank:")}</p>
          <ul class="credits-list">
            {SOUNDS.map(([name, file, author, url, licence]) => (
              <li>
                <b>{name}</b> · {link(url, file)} {t("by")} {author} · {licence}
              </li>
            ))}
            <li>
              <b>Archer</b> · {t("by D/0, from")} {link("https://github.com/db0/Android-Netrunner-OCTGN", "Android-Netrunner-OCTGN")}, {t("used with permission")}
            </li>
          </ul>
        </section>

        <section class="panel section">
          <h2 class="label">{t("Visuals")}</h2>
          <p>{t("Board grid adapted from")} {link("https://reactbits.dev", "React Bits")} {t("CursorGrid by David Haz, MIT + Commons Clause.")}</p>
          <p>{t("Fonts: Big Shoulders Display and Space Mono, SIL Open Font License.")}</p>
        </section>

        <p class="hint credits-note">{t("Netrunner is a game by Null Signal Games. Pocket Rig is not affiliated with Null Signal Games.")}</p>
      </div>
    </>
  );
}
