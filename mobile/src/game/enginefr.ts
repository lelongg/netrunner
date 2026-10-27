type Mood = "inf" | "imp";

const SERVERS: [RegExp, string, string][] = [
  [/^HQ$/, "le QG", "du QG"],
  [/^R&D$/, "R&D", "de R&D"],
  [/^Archives$/, "les Archives", "des Archives"],
  [/^Server (\d+)$/, "le serveur $1", "du serveur $1"],
  [/^a central server$/, "un serveur central", "d'un serveur central"],
  [/^a remote server$/, "un serveur distant", "d'un serveur distant"],
  [/^any server$/, "n'importe quel serveur", "de n'importe quel serveur"],
];

function server(s: string, form: "the" | "of" = "the"): string {
  for (const [re, the, of] of SERVERS) if (re.test(s)) return s.replace(re, form === "the" ? the : of);
  return s;
}

const SERVER = "HQ|R&D|Archives|Server \\d+|a central server|a remote server|any server";

const plural = (n: string, one: string, many: string) => (n === "1" ? one : many);

const SUBTYPE: Record<string, string> = { Sentry: "sentinelle", Barrier: "barrière", "Code Gate": "verrou" };

const VERBS: Record<string, [string, string]> = {
  gain: ["gagner", "Gagnez"],
  draw: ["piocher", "Piochez"],
  lose: ["perdre", "Perdez"],
  install: ["installer", "Installez"],
  play: ["jouer", "Jouez"],
  rez: ["activer", "Activez"],
  derez: ["désactiver", "Désactivez"],
  trash: ["effacer", "Effacez"],
  place: ["placer", "Placez"],
  take: ["prendre", "Prenez"],
  remove: ["retirer", "Retirez"],
  add: ["ajouter", "Ajoutez"],
  advance: ["avancer", "Avancez"],
  score: ["finaliser", "Finalisez"],
  steal: ["voler", "Volez"],
  expose: ["exposer", "Exposez"],
  reveal: ["révéler", "Révélez"],
  shuffle: ["mélanger", "Mélangez"],
  search: ["chercher", "Cherchez"],
  purge: ["purger", "Purgez"],
  access: ["accéder à", "Accédez à"],
  host: ["héberger", "Hébergez"],
  move: ["déplacer", "Déplacez"],
  prevent: ["prévenir", "Prévenez"],
  avoid: ["éviter", "Évitez"],
  bypass: ["contourner", "Contournez"],
  discard: ["défausser", "Défaussez"],
  charge: ["charger", "Chargez"],
  sabotage: ["saboter", "Sabotez"],
  forfeit: ["renoncer à", "Renoncez à"],
  initiate: ["initier", "Initiez"],
};

function count(rest: string): string {
  return rest
    .replace(/^(\d+) \[Credits?\]/, "$1 [Credits]")
    .replace(/^(\d+) cards?\b/, (_m, n) => `${n} ${plural(n, "carte", "cartes")}`)
    .replace(/^(\d+) additional cards?\b/, (_m, n) => `${n} ${plural(n, "carte supplémentaire", "cartes supplémentaires")}`)
    .replace(/^(\d+) tags?\b/, (_m, n) => `${n} ${plural(n, "tag", "tags")}`)
    .replace(/^(\d+) bad publicity/, "$1 de mauvaise publicité")
    .replace(/^(\d+) (virus|power|advancement|agenda) counters?/, (_m, n, k) => `${n} ${plural(n, "pion", "pions")} ${{ virus: "virus", power: "pouvoir", advancement: "avancement", agenda: "projet" }[k as string]}`)
    .replace(/^all hosted credits/, "tous les crédits hébergés")
    .replace(/^(\d+) strength/, "$1 en force")
    .replace(/^an unseen card/, "une carte non vue")
    .replace(/^a card/, "une carte")
    .replace(/^itself/, "elle-même")
    .replace(/^this (resource|asset|program|hardware|ice|upgrade|agenda|card)/, (_m, k) => `${{ resource: "cette ressource", asset: "cet avoir", program: "ce programme", hardware: "ce matériel", ice: "cette glace", upgrade: "cette extension", agenda: "ce projet", card: "cette carte" }[k as string]}`);
}

function tail(rest: string): string {
  return count(rest)
    .replace(new RegExp(` from (${SERVER})\\b`), (_m, s) => ` ${server(s, "of")}`)
    .replace(/ from this (resource|asset|card)/, (_m, k) => ` sur ${k === "resource" ? "cette ressource" : k === "asset" ? "cet avoir" : "cette carte"}`)
    .replace(/ from the stack/i, " de la pile")
    .replace(/ to the grip/, " dans la main")
    .replace(/(^| )the stack$/i, "$1la pile")
    .replace(/ from the grip/, " de la main")
    .replace(/ from HQ\b/, " depuis le QG")
    .replace(/ from the heap/, " du tas")
    .replace(/ on itself/, " sur elle-même")
    .replace(/ at no cost/, " sans payer son coût")
    .replace(/ \(start of turn\)/, " (début de tour)")
    .replace(/ for each installed icebreaker/, " par brise-glace installé")
    .replace(/ for the remainder of the run/, " pour le reste du piratage")
    .replace(/ for the remainder of the turn/, " pour le reste du tour");
}

const ACTIONS: [RegExp, (m: RegExpMatchArray, mood: Mood) => string][] = [
  [/^use (?:Corp|Runner) Basic Action Card to (.+)$/, (m, mood) => action(m[1], mood)],
  [new RegExp(`^make a run on (${SERVER})$`), (m, mood) => `${mood === "inf" ? "lancer" : "Lancez"} un piratage sur ${server(m[1])}`],
  [/^run (HQ|R&D|Archives)$/, (m, mood) => `${mood === "inf" ? "lancer" : "Lancez"} un piratage sur ${server(m[1])}`],
  [new RegExp(`^advance a card in (${SERVER})$`), (m, mood) => `${mood === "inf" ? "avancer" : "Avancez"} une carte dans ${server(m[1])}`],
  [new RegExp(`^install (facedown )?(.+?) in the root of (${SERVER})( \\(new remote\\))?$`), (m, mood) => `${mood === "inf" ? "installer" : "Installez"} ${count(m[2])}${m[1] ? " face cachée" : ""} à la racine ${server(m[3], "of")}${m[4] ? " (nouveau serveur distant)" : ""}`],
  [new RegExp(`^install (?:facedown )?(.+?) protecting (${SERVER})( \\(new remote\\))?$`), (m, mood) => `${mood === "inf" ? "installer" : "Installez"} ${m[1] === "ice" ? "une glace" : tail(m[1])} protégeant ${server(m[2])}${m[3] ? " (nouveau serveur distant)" : ""}`],
  [new RegExp(`^rez (.+?) (?:in|protecting) (${SERVER})(?: at position (\\d+))?( at no cost)?$`), (m, mood) => `${mood === "inf" ? "activer" : "Activez"} ${m[1]} ${m[2] ? `dans ${server(m[2])}` : ""}${m[4] ? " sans payer son coût" : ""}`],
  [/^do (\d+) (net|meat|core|brain) damage$/, (m, mood) => `${mood === "inf" ? "infliger" : "Infligez"} ${m[1]} ${plural(m[1], "dégât", "dégâts")} ${{ net: "réseau", meat: "physique", core: "sévère", brain: "sévère" }[m[2]]}`],
  [/^give the Runner (\d+) tags?$/, (m, mood) => `${mood === "inf" ? "donner" : "Donnez"} ${m[1]} ${plural(m[1], "tag", "tags")} à lae Runner`],
  [/^break all (\d+ )?subroutines on (.+)$/, (m, mood) => `${mood === "inf" ? "neutraliser" : "Neutralisez"} toutes les routines de ${m[2]}`],
  [/^break (\d+) subroutines? on (.+)$/, (m, mood) => `${mood === "inf" ? "neutraliser" : "Neutralisez"} ${m[1]} ${plural(m[1], "routine", "routines")} de ${m[2]}`],
  [/^break (up to )?(\d+) (Sentry|Barrier|Code Gate) subroutines?$/, (m, mood) => `${mood === "inf" ? "neutraliser" : "Neutralisez"} ${m[1] ? "jusqu'à " : ""}${m[2]} ${plural(m[2], "routine", "routines")} ${SUBTYPE[m[3]]}`],
  [/^break (up to )?(\d+) subroutines?$/, (m, mood) => `${mood === "inf" ? "neutraliser" : "Neutralisez"} ${m[1] ? "jusqu'à " : ""}${m[2]} ${plural(m[2], "routine", "routines")}`],
  [/^fully break (.+)$/, (m, mood) => `${mood === "inf" ? "neutraliser entièrement" : "Neutralisez entièrement"} ${m[1]}`],
  [/^match strength and fully break (.+)$/, (m, mood) => `${mood === "inf" ? "égaler la force de" : "Égalez la force de"} ${m[1]} et la neutraliser entièrement`],
  [/^match strength of (.+)$/, (m, mood) => `${mood === "inf" ? "égaler la force de" : "Égalez la force de"} ${m[1]}`],
  [/^increase the strength of (.+?) to (\d+)$/, (m, mood) => `${mood === "inf" ? "augmenter la force de" : "Augmentez la force de"} ${m[1]} à ${m[2]}`],
  [/^add (\d+) strength(.*)$/, (m, mood) => `${mood === "inf" ? "ajouter" : "Ajoutez"} ${m[1]} en force${tail(m[2])}`],
  [/^give -(\d+) strength to current piece of ice$/, (m, mood) => `${mood === "inf" ? "donner" : "Donnez"} -${m[1]} en force à la glace rencontrée`],
  [/^jack out$/, (_m, mood) => (mood === "inf" ? "se déconnecter" : "Déconnectez-vous")],
  [/^end the run$/, (_m, mood) => (mood === "inf" ? "mettre fin au piratage" : "Fin du piratage")],
  [/^trash itself when this run ends$/, (_m, mood) => (mood === "inf" ? "s'effacer à la fin de ce piratage" : "Effacez cette carte à la fin de ce piratage")],
  [/^force the Runner to (\w+) (.+)$/, (m, mood) => {
    const v = VERBS[m[1].toLowerCase()];
    return v ? `${mood === "inf" ? "forcer" : "Forcez"} lae Runner à ${v[0]} ${tail(count(m[2]))}` : "";
  }],
  [/^force the (?:Runner|corp|runner|.+?) to take (\d+) tags? on encountering it$/, (m, mood) => `${mood === "inf" ? "forcer" : "Forcez"} lae Runner à prendre ${m[1]} ${plural(m[1], "tag", "tags")} en la rencontrant`],
  [/^end the run if the Runner has (\d+) \[Credits?\] or less$/, (_m, mood) => `${mood === "inf" ? "mettre fin au piratage" : "Mettez fin au piratage"} si lae Runner a ${_m[1]} [Credits] ou moins`],
  [/^install an ice from HQ or Archives$/, (_m, mood) => `${mood === "inf" ? "installer" : "Installez"} une glace depuis le QG ou les Archives`],
  [/^increase the strength of (.+?) to (\d+) and break all (?:\d+ )?(?: )?subroutines on (.+)$/, (m, mood) => `${mood === "inf" ? "augmenter la force de" : "Augmentez la force de"} ${m[1]} à ${m[2]} et neutraliser toutes les routines de ${m[3]}`],
  [/^make the Runner lose (\d+) \[Credits?\]$/, (m, mood) => `${mood === "inf" ? "faire perdre" : "Faites perdre"} ${m[1]} [Credits] à lae Runner`],
  [/^(\w+) (.+)$/, (m, mood) => {
    const v = VERBS[m[1].toLowerCase()];
    return v ? `${v[mood === "inf" ? 0 : 1]} ${tail(m[2])}` : "";
  }],
  [/^(\w+)$/, (m, mood) => VERBS[m[1].toLowerCase()]?.[mood === "inf" ? 0 : 1] ?? ""],
];

function action(text: string, mood: Mood): string {
  text = text.replace(/^to /, "");
  const parts = text.split(/(?:,)? and (?=(?:gain|draw|lose|trash|place|take|remove|add|install|access|shuffle|reveal|give|do|make|end|jack)\b)/);
  if (parts.length > 1) {
    const done = parts.map((p) => action(p, mood));
    return done.every(Boolean) ? done.join(" et ") : "";
  }
  for (const [re, fn] of ACTIONS) {
    const m = text.match(re);
    if (m) {
      const out = fn(m, mood);
      if (out) return out;
    }
  }
  return "";
}

const LINES: [RegExp, (m: RegExpMatchArray) => string | null][] = [
  [/^(.+?) spends \[Click\] and pays (\d+) \[Credits?\] to (.+?)\.$/, (m) => wrap(m[3], (a) => `${m[1]} dépense [Click] et paie ${m[2]} [Credits] pour ${a}.`)],
  [/^(.+?) spends \[Click\] to (.+?)\.$/, (m) => wrap(m[2], (a) => `${m[1]} dépense [Click] pour ${a}.`)],
  [/^(.+?) spends (\[Click\](?:\[Click\])+) to (.+?)\.$/, (m) => wrap(m[3], (a) => `${m[1]} dépense ${m[2]} pour ${a}.`)],
  [/^(.+?) loses \[Click\] to use (.+?) to (.+?)\.$/, (m) => wrap(m[3], (a) => `${m[1]} perd [Click] pour utiliser ${m[2]} pour ${a}.`)],
  [/^(.+?) pays (\d+) \[Credits?\] to use (.+?) to (.+?)\.$/, (m) => wrap(m[4], (a) => `${m[1]} paie ${m[2]} [Credits] pour utiliser ${m[3]} pour ${a}.`)],
  [/^(.+?) pays (\d+) \[Credits?\] to (.+?)\.$/, (m) => wrap(m[3], (a) => `${m[1]} paie ${m[2]} [Credits] pour ${a}.`)],
  [/^(.+?) uses (.+?) to (.+?)\.$/, (m) => wrap(m[3], (a) => `${m[1]} utilise ${m[2]} pour ${a}.`)],
  [/^(.+?) will continue the run\.$/, (m) => `${m[1]} continue le piratage.`],
  [/^(.+?) has no further action\.$/, (m) => `${m[1]} n'a plus d'action.`],
  [new RegExp(`^(.+?) approaches (${SERVER})\\.$`), (m) => `${m[1]} approche ${server(m[2])}.`],
  [new RegExp(`^(.+?) breaches (${SERVER})\\.$`), (m) => `${m[1]} infiltre ${server(m[2])}.`],
  [new RegExp(`^(.+?) accesses an unseen card from (${SERVER})\\.$`), (m) => `${m[1]} accède à une carte non vue ${server(m[2], "of")}.`],
  [/^(.+?) accesses everything else in Archives\.$/, (m) => `${m[1]} accède à tout le reste des Archives.`],
  [new RegExp(`^(.+?) accesses (.+?) from (${SERVER})\\.$`), (m) => `${m[1]} accède à ${m[2]} ${server(m[3], "of")}.`],
  [new RegExp(`^(.+?) (approaches|encounters|passes) (.+?) protecting (${SERVER}) at position (\\d+)\\.$`), (m) => `${m[1]} ${{ approaches: "approche", encounters: "rencontre", passes: "passe" }[m[2]]} ${m[3] === "ice" ? "une glace" : m[3]} protégeant ${server(m[4])} en position ${m[5]}.`],
  [/^(.+?) scores (.+?) and gains (\d+) agenda points?\.$/, (m) => `${m[1]} finalise ${m[2]} et gagne ${m[3]} ${plural(m[3], "point", "points")} de projet.`],
  [/^(.+?) steals (.+?) and gains (\d+) agenda points?\.$/, (m) => `${m[1]} vole ${m[2]} et gagne ${m[3]} ${plural(m[3], "point", "points")} de projet.`],
  [/^(.+?) trashes (.+?) due to (net|meat|core|brain) damage\.$/, (m) => `${m[1]} défausse ${m[2].replace(/ and /g, " et ")} à cause de dégâts ${{ net: "réseau", meat: "physiques", core: "sévères", brain: "sévères" }[m[3]]}.`],
  [/^(.+?) trashes (.+?) and draws (\d+) cards?\.$/, (m) => `${m[1]} efface ${m[2]} et pioche ${m[3]} ${plural(m[3], "carte", "cartes")}.`],
  [/^(.+?) trashes (.+?)\.$/, (m) => `${m[1]} efface ${m[2]}.`],
  [/^(.+?) wins the game\.$/, (m) => `${m[1]} gagne la partie.`],
  [/^(.+?) jacks out\.$/, (m) => `${m[1]} se déconnecte.`],
  [/^(.+?) resolves (\d+) unbroken subroutines? on (.+?) \((.+)\)\.$/, (m) => `${m[1]} résout ${m[2]} ${plural(m[2], "routine non neutralisée", "routines non neutralisées")} de ${m[3]} (${m[4].replace(/"\[subroutine\] ([^"]+)"/g, (_q, sub) => `"[subroutine] ${engineFr(sub)}"`).replace(/" and "/g, '" et "')}).`],
  [/^(.+?) discards (\d+) (?:cards? )?from HQ at end of turn\.$/, (m) => `${m[1]} défausse ${m[2]} ${plural(m[2], "carte", "cartes")} du QG en fin de tour.`],
  [/^(.+?) discards (\d+) from the stack at end of turn\.$/, (m) => `${m[1]} défausse ${m[2]} ${plural(m[2], "carte", "cartes")} de la pile en fin de tour.`],
];

function wrap(act: string, frame: (a: string) => string): string | null {
  const a = action(act, "inf");
  return a ? frame(a) : null;
}

const EXACT: Record<string, string> = {
  "No action": "Aucune action",
  "Break a subroutine": "Choisissez la routine à neutraliser",
  HQ: "QG",
  "New remote": "Nouveau serveur distant",
  Yes: "Oui",
  No: "Non",
  Hide: "Masquer",
  Keep: "Garder",
  Mulligan: "Mulligan",
  Steal: "Voler",
  Done: "Terminé",
  Cancel: "Annuler",
  "Keep hand?": "Garder cette main ?",
  "Jack out?": "Se déconnecter ?",
  "Choose one": "Choisissez",
  "Choose a server": "Choisissez un serveur",
  "Choose an Icebreaker": "Choisissez un brise-glace",
  "Choose a trigger to resolve": "Choisissez un effet à résoudre",
  "Choose a resource to trash": "Choisissez une ressource à effacer",
  "Choose an ice to install from Archives or HQ": "Choisissez une glace à installer depuis les Archives ou le QG",
  "Waiting for Corp to resolve access triggers": "En attente de la Corpo (effets d'accès)",
  "Waiting for Corp to resolve pending triggers": "En attente de la Corpo (effets en attente)",
  "Waiting for Corp to keep hand or mulligan": "En attente de la Corpo (garder ou mulligan)",
  "Waiting for Runner to keep hand or mulligan": "En attente de lae Runner (garder ou mulligan)",
  "Waiting for the Corp to make a decision.": "En attente d'une décision de la Corpo.",
  "Waiting for the Runner to make a decision.": "En attente d'une décision de lae Runner.",
  Trash: "Effacer",
  Install: "Installer",
  Score: "Finaliser",
  Rez: "Activer",
  Play: "Jouer",
  Advance: "Avancer",
  Select: "Sélectionner",
  Deselect: "Désélectionner",
  "Choose this card": "Choisir cette carte",
  "Fire unbroken subroutines": "Déclencher les routines non neutralisées",
  "End the run": "Fin du piratage",
  "Runner gains 6 [Credits]": "Lae Runner gagne 6 [Credits]",
  "Runner draws 4 cards": "Lae Runner pioche 4 cartes",
};

const PROMPTS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [new RegExp(`^The Runner is running on (${SERVER})$`), (m) => `Lae Runner pirate ${server(m[1])}`],
  [new RegExp(`^You are running on (${SERVER})$`), (m) => `Vous piratez ${server(m[1])}`],
  [/^You accessed (.+)\.$/, (m) => `Vous accédez à ${m[1]}.`],
  [/^Use (.+) ability\?$/, (m) => `Utiliser la capacité de ${m[1]} ?`],
  [/^Discard down to (\d+) cards$/, (m) => `Défaussez jusqu'à ${m[1]} cartes`],
  [/^Choose a target for (.+)$/, (m) => `Choisissez une cible pour ${m[1]}`],
  [/^Waiting for Corp to resolve (.+) triggers$/, () => "En attente de la Corpo"],
  [/^Waiting for Runner to resolve (.+) triggers$/, () => "En attente de lae Runner"],
  [/^Install (.+)\?$/, (m) => `Installer ${m[1]} ?`],
  [/^Pay (\d+) \[Credits\] to trash$/, (m) => `Payer ${m[1]} [Credits] pour effacer`],
  [/^(Rez|Play|Install|Advance|Select|Deselect) · (.+)$/, (m) => `${EXACT[m[1]]} · ${m[2]}`],
  [/^Auto-resolve: (Ask|Always|Never)$/, (m) => `Résolution auto : ${{ Ask: "demander", Always: "toujours", Never: "jamais" }[m[1]]}`],
];

export function engineFr(text: string): string {
  if (!text) return text;
  const exact = EXACT[text];
  if (exact) return exact;
  const remote = text.match(/^Server (\d+)$/);
  if (remote) return `Serveur ${remote[1]}`;
  for (const [re, fn] of PROMPTS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  for (const [re, fn] of LINES) {
    const m = text.match(re);
    if (m) {
      const out = fn(m);
      if (out) return out;
    }
  }
  const ability = text.match(/^(.+?) : (.+)$/);
  if (ability) {
    const effect = ability[2].replace(/\.$/, "");
    const parts = effect.split(/\. /);
    const done = parts.map((p) => action(p.charAt(0).toLowerCase() + p.slice(1), "imp"));
    if (done.every(Boolean)) return `${ability[1]} : ${done.join(". ")}${/\.$/.test(ability[2]) ? "." : ""}`;
  }
  const bare = action(text.charAt(0).toLowerCase() + text.slice(1).replace(/\.$/, ""), "imp");
  return bare ? `${bare}${/\.$/.test(text) ? "." : ""}` : text;
}
