# Null Signal mobile

Front mobile pour jouer à Netrunner (cartes Null Signal Games) avec le moteur de règles
de Jinteki.net, entièrement dans le navigateur. Aucun serveur de jeu : un des deux joueurs
héberge la partie sur son téléphone, l'autre s'y connecte en pair-à-pair (WebRTC).

## Architecture

```
┌──────────── téléphone hôte ─────────────┐         ┌──── téléphone invité ────┐
│ UI Preact ── Session (hôte)             │ WebRTC  │ UI Preact ── Session     │
│                 │                        │◄───────►│   (invité)               │
│      moteur Jinteki compilé en JS        │ actions │                          │
│      (engine/engine.js, ClojureScript)   │  vues   │                          │
└──────────────────────────────────────────┘         └──────────────────────────┘
                 ▲  mise en relation uniquement (PeerJS cloud, gratuit)
```

- **Moteur** : les sources `src/clj/game/**` de Jinteki sont en `.cljc` et compilées en
  module ES par shadow-cljs (build `:engine`, point d'entrée `src/cljs/engine/api.cljs`).
  L'API JS : `loadCards`, `createGame`, `act(game, side, command, args)`,
  `view(game, side)`, `say`, `concede`, `renderMessage`, `loadDictionary`, `precons`.
- **Hôte** : fait tourner le moteur, applique ses actions et celles de l'invité, puis
  envoie à l'invité *uniquement sa vue privatisée* (calculée par le moteur, comme sur
  jinteki.net). L'invité ne reçoit jamais la main ou le R&D adverses.
- **Commandes** : les mêmes que le client web de Jinteki (`play`, `ability`, `choice`,
  `select`, `run`, `continue`…). La logique d'interface (actions par carte, prompts,
  boutons de run) reprend celle de `src/cljs/nr/gameboard/board.cljs`.
- **Cartes** : `scripts/build-cards.mjs` télécharge `raw_data.edn` de
  `NoahTheDuke/netrunner-data` (la source de `lein fetch`) et produit
  `public/data/cards.json`. Images servies par NetrunnerDB.

## Développement

Prérequis : Java 17+, [Leiningen](https://leiningen.org), Node 20+.

```sh
npm ci                 # à la racine (shadow-cljs)
cd mobile && npm ci
npm run engine         # compile le moteur (dev) → mobile/engine/
npm run cards          # cartes + traductions → mobile/public/
npm run smoke          # partie scriptée sous Node
npm run dev            # http://localhost:5173
```

`npm run engine:release` produit la version optimisée (≈ 3 Mo, ≈ 690 Ko gzip).

Pour tester à deux sur le réseau local : `npm run dev -- --host`, puis ouvrir l'adresse
affichée sur deux téléphones. WebRTC exige HTTPS hors `localhost` ; utilisez la version
déployée ou un tunnel HTTPS.

## Déploiement (gratuit)

Le workflow `.github/workflows/mobile.yml` compile le moteur et l'appli, lance le test
de fumée et publie `mobile/dist` sur GitHub Pages à chaque push sur `master`
(activer *Settings → Pages → Source : GitHub Actions*). N'importe quel hébergeur statique
convient aussi (Cloudflare Pages, Netlify) : il n'y a pas de backend.

La mise en relation passe par le serveur public gratuit de PeerJS. Pour ne dépendre de
personne, on peut lancer son propre `peerjs-server` (quelques Mo de RAM) et passer
`host`/`port` au constructeur `Peer` dans `src/session.ts`.

## Limites actuelles

- L'hôte doit garder l'appli au premier plan : si son navigateur est fermé ou mis en
  veille, la partie est perdue (l'état du moteur n'est pas sérialisable tel quel).
- L'invité peut recharger la page et rejoindre avec le même code : il récupère la partie.
- Pas d'anti-triche côté hôte : l'hôte a l'état complet en mémoire. À réserver aux
  parties entre personnes de confiance.
- Les messages de jeu sont surtout en anglais (traductions françaises partielles en amont).
