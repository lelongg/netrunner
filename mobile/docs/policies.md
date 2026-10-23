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
- `iceThreat`: end-the-run, damage, credit loss and tags from the subroutines.
- `estimateRun`: the Runner's cost, blockers and damage for a server, with unrezzed ice counted
  as an estimate.
- `serverSafety`: the Corp's view of the same question, using the Runner's visible rig and
  credits and our own unrezzed ice. `safe` means the Runner cannot get in for their current
  credits plus a small margin.
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
thin R&D). Deck-specific decisions: Seamless Launch targets, Urtica Cipher as an advanceable
bait, Manegarm Skunkworks on the scoring remote, Regolith clicks, Superconducting Hub and
Send a Message prompts, Brân's install subroutine, Predictive Planogram, and rezzing ice that
the Runner's rig cannot break even when it protects nothing yet.

**`gateway-runner-catalyst`** (`policy/decks/gateway-runner.ts`). Plans: `setup`, `pressure`,
`contest`, `closing`. Economy comes first (Sure Gamble, Creative Commission as the last click,
Telework Contract, Red Team once the rig can break), then Cleaver, Unity and Carmen in the
order the Corp's ice calls for. Jailbreak, Overclock and Tread Lightly are scored as runs
with their own economics, and `safeHand` refuses a run whose damage (rezzed ice, unrezzed ice
assumed to hurt, an advanced facedown card assumed to be Urtica Cipher) could flatline the
Runner, unless the card could win the game for the Corp. When the plan is `contest` and the
grip is too small, the policy draws up first.

## Evaluation

```sh
cd mobile
npm run engine && npm run cards           # once
node --experimental-strip-types scripts/policy-eval.mjs --games 20 --corp policy --runner heuristic --out /tmp/eval
node --experimental-strip-types scripts/policy-eval.mjs --help
```

Games are seeded: `--split` picks one of three disjoint seed sets (`design` for reading
situations and changing policies, `tune` for adjusting scores, `test` for the final
comparison) and `--seed` an offset inside it, so a result can be replayed exactly. Players are
`policy`, `heuristic` or `random`; `--matchup` picks the preconstructed matchup (0 beginner,
1 intermediate). The summary gives wins per side with a 95% interval, unfinished and blocked
games, engine errors, refused moves, unhandled prompts and decision times.

With `--out`, the run writes:

- `games.jsonl`: one line per game with the seed, the policy ids and versions, the deck
  fingerprints, the result and the full action log (every decision record with `--full`).
- `situations.jsonl` and `situations.md`: the flagged situations, each with the board as the
  deciding side saw it, the recent log, the plan, the candidates with their scores and
  reasons, the chosen move and a replay command. Flags: `refused`, `unhandled`, `stuck`,
  `idle-turn` (a turn spent clicking while rich), `plan-churn` (three plan changes in one
  turn) and `loss` (the final board of a lost game).
- `summary.json`.

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

## Improvement loop

1. Play on the `design` split with `--out` and read `situations.md`.
2. Write the correction as a general rule in the policy (or in the shared tactics when it is
   not deck-specific), with its reason in the commit message.
3. Replay the seeds that produced the situations, then a different seed offset of the same
   split; keep the change only if the flagged situations are gone and the win rate did not
   drop.
4. Bump the policy `version`.
5. Run the `test` split against the heuristic bot in both seats before claiming progress.

A single loss or a single disagreement with the model is not evidence of a bug: the model's
suggestion is a hypothesis that the games must confirm. Changes that fix exactly one replay
and nothing else should be refused.

## Adding a policy

1. Add the deck list (identity and card counts) next to `policy/decks/gateway.ts`.
2. Create `policy/decks/<name>.ts`, build a `DeckPolicy` and call `registerPolicy`. Start from
   `plan` and `proposals`; add `prompt` and `run` only for the cards whose generic handling
   is wrong.
3. Import the file from `src/bot/index.ts` and `scripts/policy-eval.mjs` so it registers.
4. Run the evaluation: the summary says `FALLBACK` when no fingerprint matched.

## Results

Measured with `scripts/policy-eval.mjs` on the `test` split (seeds never used while writing
the policies), 30 games per line, beginner decks unless stated. Policies at version 0.2.0.
Intervals are 95% binomial.

| Corp | Runner | Decks | Corp wins | Runner wins | Unfinished | Avg turns | Game ends |
|---|---|---|---|---|---|---|---|
| heuristic | heuristic | beginner | 19 (0.63 ±0.17) | 11 (0.37 ±0.17) | 0 | 14.3 | 28 agenda, 2 decked |
| **policy** | heuristic | beginner | 22 (0.73 ±0.16) | 8 (0.27 ±0.16) | 0 | 14.5 | 21 agenda, 7 flatline, 2 decked |
| heuristic | **policy** | beginner | 13 (0.43 ±0.18) | 17 (0.57 ±0.18) | 0 | 13.5 | 30 agenda |
| **policy** | **policy** | beginner | 21 (0.70 ±0.16) | 9 (0.30 ±0.16) | 0 | 13.9 | 18 agenda, 10 flatline, 2 decked |
| heuristic | heuristic | intermediate | 23 (0.77 ±0.15) | 7 (0.23 ±0.15) | 0 | 15.0 | 30 agenda |
| **policy** | **policy** | intermediate | 24 (0.80 ±0.14) | 6 (0.20 ±0.14) | 0 | 15.4 | 28 agenda, 2 flatline |

Reading the table against the heuristic reference on the beginner decks:

- The Runner policy wins 17/30 against the heuristic Corp where the heuristic Runner wins
  11/30: a gain of about 0.20 in win rate, larger than the interval.
- The Corp policy wins 22/30 against the heuristic Runner where the heuristic Corp wins
  19/30: a gain within the interval, so not established. Version 0.1.0 measured 23/30 and an
  intermediate build 25/30; the last change (keeping agendas in HQ when HQ is safer than the
  remote) costs a little against the heuristic Runner, which never pressures HQ, and was kept
  because it stops the giveaway that a stronger Runner exploited in the games above.
- Policy against policy, the Corp wins 21/30 and ten games end by flatline: the Runner
  policy still runs into net damage too often against a Corp that rezzes Karunā, Diviner
  and Tithe and advances Urtica Cipher.

Across the 180 games: no engine error, no blocked game, no unfinished game, no unhandled
prompt. Decision time averages 0.5 ms (maximum about 50 ms) on the development engine build.

Situations flagged on the test split, for the next loop: `idle-turn` (Runner clicking for
credits with 10 or more credits: 25 in the heuristic-Corp games), `plan-churn` (the plan
switching three times in a turn, mostly `contest`/`setup` as the grip size changes), and
the final boards of every loss.

Known limits:

- The sample is small: 30 games give intervals of about ±0.17, so differences below that are
  noise. Decide on more games before trusting a change.
- The two policies were developed against each other and against the heuristic bot, so they
  may exploit those opponents' weaknesses. Results against humans are not measured.
- The Runner policy still spends whole turns on credits or draws when it has nothing better
  (`idle-turn` situations), and it has no model of what the Corp is likely to hold.
- Break costs are parsed from card text: breakers with unusual wording are estimated.
- Only the System Gateway starter decks have a policy. Other decks use the generic policy,
  whose quality is close to the heuristic bot.
- Two loops found during this work were in moves the engine refuses silently (trashing a
  resource when the Runner has none, rezzing an asset instead of the approached ice). The
  stall guard only catches a refused move when the same move is applied twice in the same
  state; a refusal that changes the state (a toast, a log line) can escape it, so unfinished
  games in the summary deserve a replay.
