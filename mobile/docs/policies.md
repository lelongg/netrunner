# Deck policies for the bot

The bot in `src/bot/` has two layers:

- `heuristic.ts`: the original heuristic bot, kept unchanged as the reference opponent.
- `policy/`: a policy layer that turns an observation into a decision through a plan, a set
  of scored proposals and a short justification. Decks with a dedicated policy get it; any
  other deck falls back to the generic policy of its side, or to the heuristic bot when the
  app asks for it (`src/bot/index.ts`, `makeBot`).

The goal of the layer is to transfer strategic knowledge from a language model into code that
runs locally during a game, and to improve that code from recorded games rather than from
prose. Nothing calls a model while a game is played.

## Contract

Everything the decider may use is in an `Observation` (`policy/observe.ts`), built from the
side's own engine view. The engine already hides the opponent's hand, both decks and unrezzed
or facedown cards, so the observation cannot leak them. On top of the view it adds:

- `candidates`: the legal actions, enumerated by `src/game/candidates.ts`. This is the same
  code the MCP agent uses to list actions to a model, so the bot and the agent cannot drift
  apart on what a move is.
- `memory`: what this bot has seen so far (`Memory` in `policy/types.ts`): cards seen by
  `cid`, the opponent's revealed titles, when each of our cards was installed, remotes that
  turned out empty of agendas (`duds`), and the runs made this game.
- `servers`, `rig`, `prompt`, `run`, `currentIce`, credits, clicks and a card-text lookup.

A `DeckPolicy` (`policy/types.ts`) provides:

| Member | Role |
|---|---|
| `id`, `version` | Identify the policy in logs and results. Bump `version` on every behaviour change. |
| `side`, `decks` | The side and the exact deck lists the policy was written for. A deck matches by fingerprint (identity plus sorted card counts, `policy/registry.ts`), never by name only. |
| `mulligan(obs)` | Keep or mulligan, with the reason. |
| `plan(obs, current)` | The objective kept between decisions: `{ kind, goal, since, detail }`. Called before every click and prompt; return `current` to keep it, a new plan to change course. |
| `proposals(obs, plan, base)` | Receives the generic proposals of the side and returns the list to choose from. Add deck-specific moves, rescore the generic ones according to the plan, or drop them. |
| `prompt(obs, plan)` | A proposal for a prompt the generic handling would get wrong (card effects of the deck). Return `null` to let the generic handler decide. |
| `run(obs, plan)` | Decisions inside a run: rez and fire for the Corp, break, pump, jack out for the Runner. Return `null` for the generic run handling. |

A `Proposal` is `{ move, score, why, kind, exact }`. `exact` tells whether the numbers behind
the proposal are known (rezzed ice, our own cards) or estimated (unrezzed ice, facedown
cards); `why` must only cite observable facts, because it is what ends up in the exported
situations.

`PolicyBot` (`policy/bot.ts`) runs the loop: dismiss toasts, answer prompts, take the turn
steps, decide inside runs, otherwise re-plan and pick the best proposal. It bans a move that
was applied twice without changing the state (`applied()` is called by the harness after each
move), counts those as *refused*, counts prompts with no proposal as *unhandled* and records
every decision (`DecisionRecord`) when `record` is on. `/close-prompt` is never a normal
decision: it is only used when the app sets `rescue: true` so a game against a human cannot
hang, and it is always counted as unhandled.

## Shared tactics

`policy/tactics.ts` holds the computations both sides reuse:

- `breakerProfile` / `breakCost`: what a breaker breaks and what it costs against an ice,
  parsed from card text (exact when the text matches the usual patterns, estimated otherwise).
- `iceThreat`: end-the-run, damage, credit loss and tags from the subroutines. It reads both
  the card text and the engine's subroutine labels; an end-the-run that depends on the
  Runner's credits (Whitespace) counts only when the Runner would be poor enough.
- `estimateRun`: the Runner's cost, blockers and damage for a server, with unrezzed ice counted
  as an estimate and a rezzed Manegarm Skunkworks as five credits when two clicks cannot be
  spared.
- `serverSafety`: the Corp's view of the same question, using the Runner's visible rig and
  credits and our own unrezzed ice. The Runner is credited with a turn of income before a
  remote counts as `safe`, and Skunkworks is worth three credits of tax.
- `coverage`: the ice types the rig can break.

`policy/generic.ts` turns these into proposals for either side (score, advance, install,
economy, ice placement, runs, draw, credit) and is the fallback policy. `policy/prompts.ts`
answers prompts generically (mulligan, select, trace, numbers, access choices, discard) and
`policy/runs.ts` handles run steps (rez, fire, fully break, pump then break, jack out).

## The two first policies

Both target the System Gateway starter decks and also match the intermediate versions.

**`gateway-corp-syndicate`** (`policy/decks/gateway-corp.ts`). Plans: `economy`, `fortify`,
`window`, `score`, `develop`, `defend`. The deck's whole plan is to install an agenda in a
remote the Runner cannot get into cheaply and score it the next turn with Seamless Launch
plus advances; `serverSafety` decides whether a remote is such a window, and a remote that is
merely contestable is used only when the Corp is racing (two agendas in hand, a full hand or a
thin R&D) against a Runner who is still poor, with a one-ice remote needing a margin close to
even. Two exceptions keep the Corp from passivity: a rich Corp behind a three-ice remote (or
two ice and an upgrade) installs and races because every run costs the Runner more than the
Corp loses by trying, and a Corp whose R&D is nearly empty installs anywhere with ice rather
than decking itself. A remote whose only content is upgrades is the scoring remote: agendas
go there and new ice deepens it before any new remote is opened. When agendas are stuck in HQ
and nothing in hand builds a remote, the Corp draws for ice instead of clicking for credits;
it never installs an agenda naked for tempo. Deck-specific decisions: Seamless Launch
targets, Urtica Cipher as an advanceable bait, Manegarm Skunkworks on the scoring remote,
Regolith clicks, Superconducting Hub and Send a Message prompts, Brân's install subroutine,
Predictive Planogram, rezzing ice that the Runner's rig cannot break even when it protects
nothing yet, and leaving a bioroid unrezzed when the Runner has the clicks to walk through
it and the Corp would be left poor.

**`gateway-runner-catalyst`** (`policy/decks/gateway-runner.ts`). Plans: `setup`, `pressure`,
`contest`, `closing`. Economy comes first (Sure Gamble, Creative Commission as the last click,
Telework Contract, Red Team once the rig can break), then Cleaver, Unity and Carmen in the
order the Corp's ice calls for. Jailbreak, Overclock and Tread Lightly are scored as runs
with their own economics, and `safeHand` refuses a run whose damage could flatline the
Runner, unless the card could win the game for the Corp. The trap risk of a facedown remote
card comes from the opposing deck list (copies of Urtica Cipher minus those already
identified, against the agendas still unaccounted for): a card advanced twice with low trap
odds is an agenda to contest, and the ice-damage allowance disappears once the rig covers
every ice type, or Mayfly covers the single unrezzed piece, with credits to spare. The
`contest` plan is executed as a whole turn: which breaker or Mayfly to install, how many
cards to draw and the run itself, only when clicks and credits allow all of it this turn;
otherwise the Runner prepares for the next one. Accessed cards are remembered while they
stay installed, every unrezzed card left in a breached remote without a steal is a dud, and
run bookkeeping happens when the run appears on the board, so deciding never mutates memory.
During a run a bioroid is clicked through when paying would leave too little for the rest
of the run or when the clicks are simply cheaper than the credits, and the Runner jacks out
when the rezzed ice ahead cannot be paid for. In the `closing` plan Mayfly is installed when
the last points sit behind an ice type no breaker answers.

## Simulation

The engine exposes `checkpoint`, `act`, `restore` and `unchanged`, which the app already
uses to test which actions are legal and what a break costs. A checkpoint is a reference to
the engine's immutable state, so trying a move and rolling it back costs one action. The bot
uses the same four calls through `policy/simulate.ts`:

- `evaluate(view, side)` in `policy/evaluate.ts` is a static score of a view from one side:
  credits, clicks, agenda points, cards in hand, tags and brain damage, installed cards at
  their cost plus one, rezzed ice at rez cost plus two, advancement counters, credits and
  counters hosted on cards, minus the same for the opponent;
- after ranking its proposals, the bot plays each of the top six that sit within twelve
  points of the best on the real game, resolves the prompts its own policy would answer
  (up to five in a chain), reads the view, restores the game, and adds the clamped change
  of the evaluation (±6) to the proposal's score, shown in the reason as `[+4.0]`. A move
  the engine refuses or that leaves the game unchanged is dropped with "(the engine refused
  it)";
- on a select prompt on its own turn, every selectable card becomes a measured option at a
  low base score, so the simulation decides when no handler has an opinion.

Hidden information stays hidden: a move is only simulated when its outcome is public and
deterministic. Runs, draws, and any card or prompt whose text mentions drawing, accessing,
revealing, looking at, searching, shuffling, exposing, a trace or a random choice are never
simulated, and nothing is simulated during a run. Only the acting side's own view is read
after the trial. The opponent's decisions are never simulated: a trial stops at the first
prompt that is not the bot's.

The evaluation script runs both sides with simulation by default (`--sim 0` turns it off,
`--sim corp` or `--sim runner` limits it to one side, `--sim-weight` scales the delta). The
terminal harness and the app do the same, the app through the engine worker's `moves`
probe and `PolicyBot.decideAsync`. A decision costs about 15 ms on average instead of
under 1 ms, with a worst case near half a second on a crowded board.

Design split, 10 games per cell, simulation on one side only against the frozen reference:
Runner policies 61 of 120 against the reference Corps (62 without simulation), Corp
policies 68 of 120 against the reference Runners (65 without). At weight 1 the simulation
changes few decisions: in two inspected games it flipped one Runner choice (installing Red
Team instead of clicking for a credit) and no Corp choice, and the measured select options
only win when no handler scores above them. What it buys today is a floor, not a lift:
proposals the engine refuses disappear instead of looping, and every proposal's reason
carries the measured change, which the situation reports now show. Three follow-ups were measured on the same grids:

| Change | Runner vs reference Corps | Corp vs reference Runners |
|---|---|---|
| Simulation off | 62 of 120 | 65 of 120 |
| Simulation, weight 1 | 61 | 68 |
| Simulation, weight 2 | 63 | 65 |
| Weight 1 and run trials (Runner only) | 67 | – |
| Weight 1, measured select options at base 60 | 66 | 55 |

The weight does not matter at this scale. Run trials are kept: the Runner starts a run on a
checkpoint, its own run policy answers every step while the Corp passes or fires its
subroutines, and the trial stops at the first access, so the credits, damage and tags of a
run through fully rezzed ice are exact and no hidden card is read (`policy/trial.ts`, the
app runs them in the engine worker). Measured select options stay at base 24: at 60 they
outrank the handlers for discards, Seamless Launch and Send a Message and the Corp drops to
55, so the static evaluation is not yet a substitute for those rules. Replacing a handler
is a per-card experiment on this grid, not a switch.

### The Corp runs the Runner's run on its own remote

The 183 remote steals captured over two Corp grids all went through fully rezzed ice, 108 of
them through three ice: the Runner had the rig and the credits, and the Corp installed the
agenda anyway because it was behind ("sitting loses"). Three changes follow from that:

- the Corp side of `runTrial` installs the agenda it is considering, clicks its remaining
  clicks for credits, ends its turn, and lets the Runner run the remote with a hidden hand
  while the Corp rezzes as it would; the credits and damage of a reached run replace the
  estimate in `serverSafety`, and a run that does not reach the server leaves the estimate
  alone, since the Runner may still install the missing breaker from hand;
- when the Runner can afford the scoring remote with six credits to spare, an asset from
  hand goes in first as a bait (traps first) and the agenda install waits;
- the race override is gone: being behind no longer justifies an install the Runner can
  steal. An agenda installed this turn that scores next turn from zero is not advanced on
  its install turn, so it sits as an unadvanced facedown card for one Runner turn.

Design split, 10 games per cell, Corp policies against the reference Runners: 62 of 120
with the trial alone (a reached trial also overrode the hidden-breaker odds, which produced
thin installs), 67 with the trial fixed and the bait, 63 without the bait, 68 without the
race override. Against the policy Runners the race override's removal lifts the Corp from
61–66 to 70 of 120 and halves the remote steals (11 to 17 per 30 games instead of 12 to 30).
CORP_FINAL_RESULTS

## Evaluation

```sh
cd mobile
npm run engine && npm run cards           # once
node --experimental-strip-types scripts/policy-eval.mjs --grid --games 20 --corp ref --runner policy --split test
node --experimental-strip-types scripts/policy-eval.mjs --games 20 --corp policy --runner-list my-runner.txt --out /tmp/eval
node --experimental-strip-types scripts/policy-eval.mjs --help
```

Games are seeded: `--split` picks one of three disjoint seed sets (`design` for reading
situations and changing policies, `tune` for adjusting scores, `test` for the final
comparison) and `--seed` an offset inside it, so a result can be replayed exactly. Players are
`policy` (the working tree), `ref` (the frozen reference, below), `heuristic` or `random`;
`--matchup` picks the preconstructed matchup (0 beginner, 1 intermediate), `--corp-deck` and
`--runner-deck` a core deck, `--grid` every core Corp deck against every core Runner deck,
`--corp-list` and `--runner-list` a decklist text file (a human's own deck, for instance).
The summary gives wins per side with a 95% interval, unfinished and blocked games, engine
errors, refused moves, unhandled prompts and decision times.

### Opponents, from weakest to strongest

The heuristic bot is a floor, not a bar: it is stateless and reads no card text, so a
policy that merely beats it has shown little. Progress is measured against opponents that
actually push back:

1. **The frozen reference** (`ref`). `scripts/policy-reference.json` pins a commit; `ref`
   plays the policies of that commit from a detached worktree under `.policy-ref/`, created
   on first use. A new version of a policy has to beat the previous reference on the `test`
   split, in both seats, before the reference moves forward to it. Freezing is a one-line
   change of the pinned commit, made only after the comparison, so the bar only rises.
2. **The other policies** (`--grid`). Every Corp policy against every Runner policy on the
   core decks. This is where the policies are developed: a weakness in one is a win for the
   other, so the grid keeps both sides honest.
3. **Human decks and replays** (`--corp-list`, `--runner-list`, the app's replays). The
   objective is to beat a human, so the lists a human beat the bot with become test
   opponents, played by the policy of the matching faction when one exists and by the
   generic policy otherwise.
4. **The heuristic bot**, kept as a sanity check that nothing regressed into nonsense.

With `--out`, the run writes:

- `games.jsonl`: one line per game with the seed, the policy ids and versions, the deck
  fingerprints, the result and the full action log (every decision record with `--full`).
- `situations.jsonl` and `situations.md`: the flagged situations, each with the board as the
  deciding side saw it, the recent log, the plan, the candidates with their scores and
  reasons, the chosen move and a replay command. Flags: `refused`, `unhandled`, `stuck`,
  `idle-turn` (a turn spent clicking while rich), `plan-churn` (three plan changes in one
  turn) and `loss` (the final board of a lost game).
- `summary.json`.

Every game also carries a `mistakes` count, detected from the full game state rather than
from one side's view: `corp:thin-install` (an agenda needing four or more advancements
installed behind at most one ice while the Runner has four credits and three cards),
`corp:thin-install-stolen` (such an agenda stolen within two turns),
`corp:stolen-from-remote`, `corp:unrezzable-install` (an agenda behind unrezzed ice the Corp
cannot afford to rez), and `corp:rich-credit-click` / `runner:rich-credit-click` (a basic
credit click at twelve or ten credits). A series prints the totals and `--grid` prints them
per deck, so the pattern behind a losing cell is visible before any replay is read.

The situations only contain what was observable at decision time. To diagnose with the full
replay, use the action log and the seed, and keep the two apart in the analysis.

## Playing against the bot from a terminal

`scripts/play-vs-bot.mjs` lets a person or a language model play a whole game against a bot
without the app: it replays the game from its seed and action log, lets the bot play, and
stops at each decision of the other seat, showing only that seat's view.

```sh
node --experimental-strip-types scripts/play-vs-bot.mjs --new --side runner --seed 303 --state /tmp/g.json
node --experimental-strip-types scripts/play-vs-bot.mjs --state /tmp/g.json --act 7
node --experimental-strip-types scripts/play-vs-bot.mjs --state /tmp/g.json --records 40   # the bot's recent decisions
node --experimental-strip-types scripts/play-vs-bot.mjs --state /tmp/g.json --log 20
```

Trivial steps of the human seat (start of turn, passing through unrezzed ice, single-choice
prompts) are taken automatically; encounters with live subroutines, accesses, mulligans and
clicks are not. Action numbers change after every action, so read the list before acting.
`--records` replays the bot's decisions and prints `DECISION DRIFT` when the current code
would decide differently from what was logged, which is the quickest way to see what a
policy change does to an old game.

Three games were played this way by a model against the 0.1.0 policies (the model reading
only its own seat's view):

- As Runner against the Corp policy: the Corp spent its last credits on ice for an empty
  remote, could not rez when HQ was run, lost Send a Message, then installed an agenda it
  could not defend. The model led 5 to 2 at turn 12.
- As Corp against the Runner policy: the Runner ran into a rezzed Karunā without a killer,
  installed programs with its last credits leaving an empty grip, and did not use Red Team on
  an open Archives. The model won 9 to 2.
- As Runner against the 0.2.0 Corp policy, after the fixes below: the Corp baited with Urtica
  Cipher twice, kept its agendas in a safe HQ, scored Send a Message and a Hub, and stood at
  4 to 4 on turn 16 with the better position (the model's stack nearly empty).

The fixes those games produced are general rules, not patches for a replay: rez-aware server
safety and a credit reserve before ice installs for the Corp; break costs above the credit
pool counted as unbroken, no run events into damage ice, Red Team on open centrals, breakers
installed before the ice they answer, and a refilled grip for the Runner.

A second series was played against the 0.2.x policies, which produced the 0.3.0 rules:

- As Corp against the Runner policy (g9): the Runner ran twice into the same accessed Urtica
  Cipher (it never remembered what it had accessed), refused to contest a double-advanced
  agenda behind one ice because any facedown card counted as a trap, and paid eight of its
  nine credits to break Brân 1.0 with more ice behind it. The model won 5 to 1. Replaying the
  same game with the fixed policy, the Runner clicks through Brân and steals the agenda.
- As Runner against the Corp policy (g10, g11, g12): the Corp clicked for credits with two
  agendas in hand and nothing to protect them, opened a one-ice remote next to a remote that
  already held Tithe and Skunkworks, installed a three-point agenda behind a lone Whitespace
  against a Runner with an income engine, and spent its last six credits rezzing Brân on HQ
  against a Runner with three clicks to walk through it. The model won all three.
- As Corp against the 0.3.0 Runner policy (g13): the Runner took three agendas from a flooded
  HQ with Jailbreak, waited with economy and draws while the centrals were guarded by net
  damage, then planned its last turn (install Mayfly, draw twice, run the remote through
  Whitespace) and won 7 to 0.

Besides these, the tune-split evaluation showed two Corp failure modes that no game against
the model had reached: agendas fed one by one into a one-ice remote, and a Corp with thirty
credits, a full hand and a three-ice remote clicking for credits until it decked itself.

## Improvement loop

1. Play on the `design` split with `--out` and read `situations.md`.
2. Write the correction as a general rule in the policy (or in the shared tactics when it is
   not deck-specific), with its reason in the commit message.
3. Replay the seeds that produced the situations, then a different seed offset of the same
   split; keep the change only if the flagged situations are gone and the win rate did not
   drop.
4. Bump the policy `version`.
5. Run the `test` split against the frozen reference in both seats (`--corp ref` for the
   Runner policies, `--runner ref` for the Corp policies) before claiming progress, then
   move the reference forward to the new commit.

A single loss or a single disagreement with the model is not evidence of a bug: the model's
suggestion is a hypothesis that the games must confirm. Changes that fix exactly one replay
and nothing else should be refused.

## Core decks: one policy per faction

`policy/decks/core.ts` holds seven decks, one per faction on the System Gateway identities:
the "SG Only" sample decks Null Signal Games publishes for new players
([Getting Started: Sample Decklists](https://nullsignal.games/players/getting-started-sample-decklists/)),
written by System Gateway's lead designer and built from that set alone. Each deck carries
its NetrunnerDB `source` link. They are legal in the core format (`analyze` in
`deckrules.ts`) and seeded into the app's saved decks, the agent's `list_decks` and the
evaluation:

| Deck | Identity | NSG deck | Archetype module |
|---|---|---|---|
| `core-hb` | Haas-Bioroid: Precision Design | Discretion Advised | `glacier-score`: bioroids, Seamless Launch, Skunkworks |
| `core-jinteki` | Jinteki: Restoring Humanity | Advanced Yomi | `glacier-score` + punish: Urtica as bait, Anoetic Void, Clearinghouse, damage ice rezzed against a thin grip |
| `core-nbn` | NBN: Reality Plus | Hyper Velocity | `glacier-score` + tags: Public Trail, Orbital Superiority, Neurospike, resource trashes, AMAZE Amusements |
| `core-weyland` | Weyland: Built to Last | Quick and Dirty | `glacier-score` + advance: a first advancement on every advanceable ice, Public Trail and Retribution, Malapert |
| `core-anarch` | René "Loup" Arcemont | Party Hard | `central-pressure` + viruses: Fermenter, Leech, Botulus, Cookbook, Carnivore, Loup trashes |
| `core-criminal` | Zahya Sadeghi | Stolen Goods | `central-pressure`: Docklands, Red Team, Pennyshaver, Mutual Favor, Tread Lightly |
| `core-shaper` | Tāo Salonga | Planning Ahead | `central-pressure` + lock: Conduit, Pantograph, DZMZ, Tranquilizer, VRcation |

The deck-specific rules of a module only fire for cards the deck holds, so the card lists
in the modules may name cards from earlier lists without harm.

`eval/decks/` holds further System Gateway-only lists as a test set for `--corp-list` and
`--runner-list`: the first step of lostgeek's Project CROW campaign (HB and Loup),
Alecthar's "The Tao of Running", "Gateway Only Built to Last", "NBN: Trojan Cookie", the
"SGO Zahya Deck", two recent community lists, and the Weyland list a human beat the bot
with in the app. The nearest-deck matching gives each of them the policy of its faction.

The two Gateway policies export their parts as the `glacier` and `centralPressure`
archetypes; each core module spreads one of them and overrides `proposals`, `prompt` or
`run` for its own cards. What the archetypes need from a deck comes from the **deck
profile** (`policy/profile.ts`), computed from card text: economy events and their net gain,
click and passive economy, draw, run events, breakers by ice type, consoles, ice by type,
traps, damage and fast-advance operations, tag sources and tag punishment, agendas. The bot
receives its deck at construction and the observation carries the matched list and its
profile, so the archetypes name no cards for these roles. Prompts that belong to a card
rather than to a deck (Byte!, Funhouse, Karunā, Public Trail, Lie Low, Mutual Favor, the
Corp's own-card selects that never give up an agenda, ice placement) live in
`policy/cards.ts` and serve every policy.

The evaluation takes `--corp-deck` and `--runner-deck` keys in place of a matchup, and
`--grid` plays every core Corp deck against every core Runner deck and prints the table.

## Adding a policy

1. Add the deck list (identity and card counts) to `policy/decks/core.ts` or next to
   `policy/decks/gateway.ts`, and check it with `analyze(deck, format)` from `deckrules`.
2. Create `policy/decks/<name>.ts`: spread an archetype (`glacier` or `centralPressure`) or
   build a `DeckPolicy` from scratch, and call `registerPolicy`. Add `proposals`, `prompt`
   and `run` only for the cards whose generic or archetype handling is wrong; prompts that
   belong to a card go in `policy/cards.ts`.
3. Import the file from `policy/decks/index.ts` so it registers everywhere.
4. Run the evaluation with `--full` on a few games and list the prompts the records carry
   (`records[].prompt`) to see what the new cards ask; the summary says `FALLBACK` when no
   fingerprint matched.

## Results

Measured with `scripts/policy-eval.mjs` on the `test` split (seeds never used while writing
the policies), 30 games per line, beginner decks unless stated. Policies at version 0.3.0.
Intervals are 95% binomial.

| Corp | Runner | Decks | Corp wins | Runner wins | Unfinished | Avg turns | Game ends |
|---|---|---|---|---|---|---|---|
| heuristic | heuristic | beginner | 19 (0.63 ±0.17) | 11 (0.37 ±0.17) | 0 | 14.3 | 28 agenda, 2 decked |
| **policy** | heuristic | beginner | 27 (0.90 ±0.11) | 3 (0.10 ±0.11) | 0 | 13.8 | 28 agenda, 2 decked |
| heuristic | **policy** | beginner | 5 (0.17 ±0.13) | 25 (0.83 ±0.13) | 0 | 12.9 | 30 agenda |
| **policy** | **policy** | beginner | 11 (0.37 ±0.17) | 19 (0.63 ±0.17) | 0 | 13.8 | 29 agenda, 1 decked |
| **policy** | **policy** | intermediate | 18 (0.60 ±0.18) | 12 (0.40 ±0.18) | 0 | 14.6 | 30 agenda |

The same lines at version 0.2.0 read 22/30 for the Corp policy against the heuristic Runner,
17/30 for the Runner policy against the heuristic Corp, 21/30 for the Corp policy against
the Runner policy and 24/30 on the intermediate decks.

Reading the table against the heuristic reference on the beginner decks:

- The Runner policy wins 25/30 against the heuristic Corp where the heuristic Runner wins
  11/30: a gain of about 0.46 in win rate, far outside the interval. At 0.2.0 the gain was
  0.20; the 0.3.0 rules (trap odds from the deck list, the planned contest turn, clicking
  through bioroids, remembering accessed cards) account for the rest.
- The Corp policy wins 27/30 against the heuristic Runner where the heuristic Corp wins
  19/30: a gain of 0.27, outside the interval for the first time (0.10 at 0.2.0).
- Policy against policy the Runner now wins 19/30 where it won 9/30 at 0.2.0, and no game
  ends by flatline: the Runner policy improved more than the Corp policy did. On the
  intermediate decks, whose Corp side has more agendas and Funhouse, the Corp still wins
  18/30.

Progress was measured on the `tune` split (40 games per step) while the rules were written,
so that the test split above stayed untouched until the end:

| Step | Corp policy vs heuristic Runner | Runner policy vs heuristic Corp | Corp policy vs Runner policy |
|---|---|---|---|
| 0.2.2 (start of the second loop) | 0.93 | 0.75 | 0.47 |
| Runner remembers accessed cards | 0.93 | 0.75 | 0.30 |
| Runner trap odds, contest turn, Brân clicks | – | 0.82 | 0.30 |
| Corp scoring remote, ice hunting, Skunkworks | 0.95 | – | 0.28 |
| Corp conditional end-the-run, no naked agendas | 0.88 | – | 0.28 |
| Corp fortress race, one-ice margin | 0.90 | – | 0.33 |
| Corp leaves click-through bioroids unrezzed | 0.90 | – | 0.30 |
| Runner clicks through pricey bioroids, closing Mayfly | – | 0.82 | 0.28 |

The Corp policy's rate against the Runner policy did not recover on the tune split; the
test split says 0.37. The Corp rules of this loop removed specific giveaways (agendas into a
one-ice remote, decking with thirty credits, a naked agenda for tempo, Brân rezzed for the
last credits) without giving the Corp an economy that keeps up with a Runner who trashes
every unprotected asset and steals from a flooded HQ.

Across the 150 games: no engine error, no blocked game, no unfinished game, no unhandled
prompt; 10 refused moves in total, all on the Runner side (a run or ability the engine
declined, retried once by the stall guard). Decision time averages 0.3 ms (maximum about
65 ms) on the development engine build.

### Core decks

Test split, 20 games per line, against the heuristic bot playing the core deck of the
other side (Haas-Bioroid for the Runner lines, Zahya for the Corp lines). The heuristic
bots against each other on those two decks: Corp 10, Runner 10.

| Deck | Policy | Wins against the heuristic opponent |
|---|---|---|
| core-hb | `core-hb-glacier` | 14 (0.70 ±0.20) |
| core-jinteki | `core-jinteki-punish` | 18 (0.90 ±0.13) |
| core-nbn | `core-nbn-tags` | 20 (1.00) |
| core-weyland | `core-weyland-advance` | 17 (0.85 ±0.16) |
| core-anarch | `core-anarch-virus` | 16 (0.80 ±0.18) |
| core-criminal | `core-criminal-central-pressure` | 16 (0.80 ±0.18) |
| core-shaper | `core-shaper-lock` | 17 (0.85 ±0.16) |

Policy against policy on the test split (`--grid`, 20 games per cell, Corp wins):

| Corp \\ Runner | Anarch: Loup | Criminal: Zahya | Shaper: Tāo |
|---|---|---|---|
| Haas-Bioroid: Precision Design | 12 (0.60 ±0.21) | 8 (0.40 ±0.21) | 12 (0.60 ±0.21) |
| Jinteki: Restoring Humanity | 16 (0.80 ±0.18) | 9 (0.45 ±0.22) | 11 (0.55 ±0.22) |
| NBN: Reality Plus | 13 (0.65 ±0.21) | 10 (0.50 ±0.22) | 13 (0.65 ±0.21) |
| Weyland: Built to Last | 12 (0.60 ±0.21) | 15 (0.75 ±0.19) | 11 (0.55 ±0.22) |

### Against the frozen reference

The reference of this loop was the policies and decks as merged in PR #1 (`aef9a54`, the
bots the app shipped with); `scripts/policy-reference.json` now pins this loop's policies
for the next one. Test split, 10 games per cell, each table shows Corp wins.

Runner policies of this loop against the reference Corps (`--corp ref --runner policy`):

| Corp (reference) \ Runner | Anarch: Loup | Criminal: Zahya | Shaper: Tāo |
|---|---|---|---|
| Haas-Bioroid: Precision Design | 3 (0.30 ±0.28) | 3 (0.30 ±0.28) | 5 (0.50 ±0.31) |
| Jinteki: Restoring Humanity | 0 (0.00) | 1 (0.10 ±0.19) | 5 (0.50 ±0.31) |
| NBN: Reality Plus | 5 (0.50 ±0.31) | 7 (0.70 ±0.28) | 5 (0.50 ±0.31) |
| Weyland: Built to Last | 5 (0.50 ±0.31) | 6 (0.60 ±0.30) | 5 (0.50 ±0.31) |

Corp policies of this loop against the reference Runners (`--corp policy --runner ref`):

| Corp \ Runner (reference) | Anarch: Loup | Criminal: Zahya | Shaper: Tāo |
|---|---|---|---|
| Haas-Bioroid: Precision Design | 6 (0.60 ±0.30) | 5 (0.50 ±0.31) | 6 (0.60 ±0.30) |
| Jinteki: Restoring Humanity | 6 (0.60 ±0.30) | 7 (0.70 ±0.28) | 6 (0.60 ±0.30) |
| NBN: Reality Plus | 7 (0.70 ±0.28) | 5 (0.50 ±0.31) | 6 (0.60 ±0.30) |
| Weyland: Built to Last | 6 (0.60 ±0.30) | 5 (0.50 ±0.31) | 6 (0.60 ±0.30) |

Summed over the twelve pairs, the Runner policies win 70 of 120 games against the reference
Corps (the same policies before this loop won 48 of 120 on the design split) and the Corp
policies win 71 of 120 against the reference Runners. The Runner gains come from the games
read in this loop: tags are no longer taken when the Corp can punish them before they are
cleared, Botulus sits on the ice guarding the scoring remote, the Runner digs for the breaker
type that guards what matters instead of clicking for credits, Mayfly is kept for a planned
contest, and Semak-samun is broken with a fracter instead of costing three cards. The
reference now points at this loop's policies, so the next loop has to beat these.

Against a human's deck: the Weyland list that beat the Anarch bot 9–1 in the app (replay
`XL9A7P49`), played by the Weyland policy through nearest-deck matching, loses 12–8 to the
Anarch policy on the tune split (20 games); before this loop it was winning most games.

The grid above against the reference is the figure to improve. The heuristic bot stays in
the table below only as the floor.

### On the SG Only decks

The catalogue then moved to NSG's SG Only sample decks (the reference still plays the
earlier lists, so these cells compare deck and policy together). Design split, 10 games
per cell, Corp wins.

The first games on the new lists showed the Corp sitting in "fortify" for ten turns: with
System Gateway ice no remote is ever safe against a rigged Runner, so it never installed and
lost to R&D steals. The archetype now races when behind (install into a two-ice remote when
the Runner leads, or nothing is scored by turn eight), prefers agendas with fewer
advancements into a contested remote, sends end-the-run ice to the remote and adds a fourth
ice to a remote of taxing ice, holds agendas out of a remote the Runner stole from until
its ice changes, prices uncovered damage ice, trusts Anoetic Void only when it can fire
twice, and no longer stacks HQ while R&D is open. Clearinghouse and ambush bait are shared
by every Corp. The Runner draws instead of clicking credits with nothing to play, marks
down run events into unrezzed ice it may not break, and skips a Funhouse it would refuse
the tag on.

| Corp \ Runner | Party Hard | Stolen Goods | Planning Ahead |
|---|---|---|---|
| Discretion Advised, vs reference Runners | 3 | 7 | 6 |
| Advanced Yomi, vs reference Runners | 4 | 3 | 4 |
| Hyper Velocity, vs reference Runners | 2 | 4 | 4 |
| Quick and Dirty, vs reference Runners | 7 | 3 | 6 |
| reference Haas-Bioroid, vs the new Runners | 3 | 6 | 7 |
| reference Jinteki, vs the new Runners | 4 | 5 | 5 |
| reference NBN, vs the new Runners | 4 | 5 | 5 |
| reference Weyland, vs the new Runners | 6 | 7 | 6 |

Test split, after the Corp changes above (unconditional end-the-run ice kept for the remote,
racing when behind, no agenda behind ice the Corp cannot rez). The Corp policies on the SG
Only lists win 53 of 120 against the reference Runners (47 of 120 on the design split
before the changes, 68 of 120 on it after); the Runner policies on the SG Only lists win
57 of 120 against the reference Corps. The SG Only lists are beginner decks without the
Elevation cards the reference lists carry (no Seamless Launch, weaker economy), so deck and
policy pull in opposite directions in these cells; the reference pointer therefore stays on
the earlier lists until the new catalogue beats them in both seats. Policy against policy
on the new lists (design split): Corp 65 of 120. Hyper Velocity (NBN) remains the weakest
Corp: its list wins through tags (Ping and Funhouse on the remote, Predictive Planogram and
Public Trail while tagged, Orbital Superiority as a kill) and the archetype does not yet
chain those.

### Mistake counts on the SG Only decks

Design split, 10 games per cell, the counts the evaluation detects from the full game state.
Reading them before any replay found three rules worth fixing in one afternoon: the Offworld
Office install that bypassed the one-ice test, the Runner refusing any contest with a
five-card access risk and clicking credits instead, and a covered duplicate breaker in hand
silencing the "rich with no rig" draw.

| Side and deck | Before | After |
|---|---|---|
| Runner rich credit clicks, Party Hard, 40 games vs the Corp policies | 56 | 26 |
| Runner rich credit clicks, Stolen Goods, 40 games vs the Corp policies | 61 | 40 |
| Runner rich credit clicks, Planning Ahead, 40 games vs the Corp policies | 17 | 8 |
| Runner rich credit clicks, Stolen Goods, 40 games vs the reference Corps | 71 | 13 |
| Corp agendas stolen from a remote, per Corp deck, 30 games vs the Runner policies | 21 to 27 | 13 to 27 |

The remote steal stays the dominant Corp fault at close to one per game on every list but
Quick and Dirty, which is why Weyland leads the Corp side. The reference Corps, for
comparison, carry 13 to 15 unrezzable installs and 36 rich credit clicks per 30 games that
the current Corps no longer make. Win rates after these changes: Runner policies 69 of 120
against the reference Corps, Corp policies 64 to 68 of 120 against the reference Runners,
policy against policy Corp 68 of 120.

### Run value and hidden breakers

`policy/value.ts` replaces three constants with estimates drawn from the opponent's deck
list (assumed from their identity, and dropped as soon as a seen card contradicts it):

- a central run is worth the remaining agenda density times the accesses (Docklands Pass)
  times the average points left, plus the passive credits the run yields (Zahya,
  Pennyshaver, Leech), so R&D and HQ are no longer a flat 3 and 2;
- an unrezzed ice costs what the rig would pay against the ice still unseen in that deck,
  and carries the odds that it ends the run against a rig that cannot break it, instead of
  a flat 0, 1 or 3 credits;
- on the Corp side, an ice the Runner's rig cannot break counts as breakable at install plus
  break cost when the Runner's deck holds such a breaker and the odds that it sits in their
  grip reach a quarter.

Design split, 10 games per cell: Runner policies 69 of 120 against the reference Corps
(unchanged), Corp policies 63 of 120 against the reference Runners (unchanged), policy
against policy Corp 65 of 120 (was 68). The win rates hold while the Runner's rich credit
clicks fall again: Party Hard 42 to 9 and Planning Ahead 21 to 6 over 40 games against the
reference Corps, Stolen Goods 40 to 18 and Planning Ahead 8 to 3 against the Corp policies.
The remote steal stays the Corp's dominant fault and is the next loop.

### After the Hyper Velocity game and replay T2QJASGM

A game played as Hyper Velocity against the Party Hard bot in the terminal harness (won 8
to 1 on turn 11) and the replay showed the Runner discarding its only fracter to keep a
second Mayfly, never installing its draw resources, and running Archives with one card in
it. The Runner now discards by usefulness, installs a resource that draws every turn, only
values Archives with two or more unseen cards, and the Funhouse test in `estimateRun` uses
the Runner's real credits rather than the Overclock budget, so it no longer plans a run it
will refuse at the encounter.

Design split, 10 games per cell: Runner policies 65 of 120 against the reference Corps
(69 before, inside the interval), policy against policy Corp 66 of 120 (65 before). Runner
rich credit clicks over 40 games: Party Hard 7, Stolen Goods 13, Planning Ahead 6 against
the reference Corps; 17, 33 and 2 against the Corp policies. Stolen Goods still sits on
credits against the Corp policies when every remote is iced twice, which is the next Runner
loop. The remote steal stays between 12 and 30 per 30 games on the Corp side.

Every Corp deck beats the heuristic Runner and every Runner deck beats the heuristic Corp
by more than the interval, which is what the shared archetypes bought; the Haas-Bioroid
line is the lowest because the heuristic Zahya trashes its unprotected campaigns. Against
each other the Corp decks are ahead: the Runner archetype still waits for a safe window
too long against a Corp that scores behind two ice and an upgrade.

Known limits:

- The sample is small: 30 games give intervals of about ±0.17, so differences below that are
  noise. Decide on more games before trusting a change.
- The two policies were developed against each other and against the heuristic bot, so they
  may exploit those opponents' weaknesses. Results against humans are not measured.
- The Runner policy still spends whole turns on credits or draws when it has nothing better
  (`idle-turn` situations). Its only model of the Corp's hidden cards is the opposing deck
  list, used for trap odds; it assumes the preconstructed deck of the opponent's identity.
- The Corp policy beats the heuristic Runner and the model lost to the Runner policy, but
  the model still beats the Corp policy as Runner: a Runner who trashes every unprotected
  asset, runs HQ when it is flooded and keeps ten credits leaves the Corp without a window.
  The Corp needs protected economy and faster scoring to close that gap.
- Break costs are parsed from card text: breakers with unusual wording are estimated.
- A deck without an exact policy is played by the policy of the nearest registered deck
  (same identity, or at least half the cards in common); that policy's deck-specific rules
  simply never fire for cards the deck does not hold. Decks further away than that use the
  generic policy, whose quality is close to the heuristic bot.
- Two loops found during this work were in moves the engine refuses silently (trashing a
  resource when the Runner has none, rezzing an asset instead of the approached ice). The
  stall guard only catches a refused move when the same move is applied twice in the same
  state; a refusal that changes the state (a toast, a log line) can escape it, so unfinished
  games in the summary deserve a replay.
