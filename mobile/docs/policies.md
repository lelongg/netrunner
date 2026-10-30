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
Three harness games played as the Runner against the Corp bot then showed what the grid
does not: the Corp installed five ice worth 22 credits of rez in three turns and stayed
under four credits for the rest of the game, paid five of its six credits to rez a
Whitespace that could not stop an eleven-credit Runner, and installed a three-point agenda
behind two unrezzed ice with three credits, which Tread Lightly turned into a free access.
So the Corp now rezzes during a run only when the ice ends the run, hurts, tags or taxes
at least its own cost, keeps two credits unless an agenda is behind the ice, counts the
rez cost of every unrezzed ice before installing more, keeps three spare credits over a
remote's rez cost when the Runner's deck raises rez costs, draws for ice when a central is
open or agendas pile up behind a thin HQ, and adds a fourth and fifth ice to a scoring
remote the Runner can still afford rather than opening a weaker one. The Neurospike kill
line is shared by every Corp deck, a trash prompt that only offers the Corp's own cards
gives up the least valuable one, and draws stop when R&D is down to eight cards.

Against the policy Runners the Corp went from 61–66 to 74 of 120 over this loop, with
remote steals down to 8–10 per 30 games on three of the four decks. Against the reference
Runners the design split reads 56 of 120 and the held-out test split 65 (53 before the
loop): the reference Runners contest every facedown card when they can afford it, and a
Corp that waits for a window scores less against them than one that races; the policy
Runners, which are the stronger of the two, punish the race more. Ablations on the design split, 10 games per cell against the reference Runners: all rules
56, without remote deepening 57, without the never-advance line 60, without the R&D
deepening bonus 58, which is noise around one value, so every rule stays. The final code
reads: Corp 59 of 120 against the reference Runners on the design split, 64 on the test
split, 71 of 120 against the policy Runners; Runner 64 of 120 against the reference Corps.
The two yardsticks disagree because the reference Runners run every facedown card they can
afford while the policy Runners wait for a safe window, and a Corp that plays for a window
is rewarded by the second and punished by the first.

Two more replays (VHDTPF2K 0–9, J6AE57HR 3–7) and the scenario suite then drove a last
pass: the Corp keeps credits to rez the ice in front of its agenda before advancing, counts
the Seamless Launch click, caps ice installs past its rez budget, purges a Conduit dig,
ices a central the Runner keeps running even when poor, and hides an agenda flood with
Sprint only when HQ is iced. An Overclock allowance in the Runner's purse measured 31
against 34 of 72 without it and was dropped; the draw rules of that pass doubled the HQ
steals on the design split (27 of 72) until they were limited to a thin hand. Final
numbers at 6 games per cell: Corp 37 of 72 on the design split and 48 of 72 on the test
split (67 percent, against 44 at the start of the Corp loops). Iteration grids now use 72
games and run two at a time; 120-game grids are kept for the recorded numbers.

Replays YZEAWZUJ (2–8) and FT5U3X7H (3–7), both Weyland against the user, added: runs
started by a card (Conduit, Jailbreak, Overclock) are counted in the Corp's run memory
(they only reach the log as a structured effect, so the Corp never saw a Conduit dig),
R&D under a dig takes a fourth ice outside the rez-budget cap, purge needs three counters
on a digging virus, a hand of three agendas behind three ice is jammed instead of held,
and the Corp does not rez a five-plus ice the Runner pays through anyway when the rez
would leave it under three credits (it had gone from 15 to 1 on one Overclock run).
Weyland advances ice at most once per turn, the only advancement Built to Last pays for.
The first version of the rez rule (any rez that costs at least its tax while the Corp
would hold under eight) cost ten games of 72 on the test split; the ablations, one rule
off at a time on the test split, read: all five rules 37, no rez rule 47, no jam 42, no
R&D siege 39, no run counting 37, old purge thresholds 36, all off 48. With the rez rule
narrowed and the jam limited to three agendas and a run cost of seven: 44 of 72 on the
test split and 33 of 72 on the design split, both within noise of the previous pass.
Background grids die when the container sleeps between turns, so validation now runs
as 24 single cells, four at a time, from foreground calls (about 20 minutes per split).

Grids now run on GitHub Actions (`.github/workflows/policy-grid.yml`): one job per cell,
12 games per split, both splits in parallel, the report committed to the `eval-results`
branch under `grids/`. A full side takes about ten minutes. The numbers below are "wins of
144" per split, design then test, against the frozen reference.

| Pass | Corp | Runner |
|---|---|---|
| First CI grids (recherche de tour and learned weights measured neutral, left off) | 73 / 80 | 65 / 72 |
| Replay 2L7UEEVY: Clearinghouse rez, Hansei spares the agendas, no breakable kill-rez | 76 / 84 | – |
| Replay BNDST9RP: reserve before trashing a resource or installing thin | 79 / 85 | – |
| Replays 82YJDZAE and 6TFAXBF3: full grip, useless runs capped, breakers before the reserve | – | 67 / 74 |
| Decisive runs on the winning agenda, cheap ice faced instead of broken | 78 / 85 | 71 / 77 |
| Pennyshaver cashed; Corp judges agenda installs before Sprint and the draw rules | 74 / 85 | 72 / 76 |

The last pass removed the rich credit clicks of Discretion Advised (54 on the test split
to none in the list) without moving the totals: the Corp drop on the design split is three
games of Discretion Advised, and one-rule ablations on those cells do not point at a single
rule, so it reads as noise at this sample size. Stolen Goods still clicks for credits about
twenty times per split when it saves for a remote it judges too risky, which is where the
next Runner pass goes.

The reference was refrozen on 27 October at `7e2ae77` (the policies of the last row above)
and the grids now play 48 games per cell and split on both sides. Against itself, the
pair of policy sets gives the baseline every later pass is read against (wins of 576,
design then test): Corp 369 / 374, Runner 254 / 222. At equal strength the Corp decks are
ahead on these lists, Quick and Dirty and Discretion Advised most (109 of 144 each as
Corp), Hyper Velocity least (63 and 76), so a Runner pass is read against 254 / 222 and a
Corp pass against 369 / 374, not against 288.

The Corp-side pass of 27 October against the aggressive Runner (`--runner aggro`, the
grid's `opponent` input) measured the central-ice rules at 48 games per cell, wins of 576,
design then test:

| Corp version | vs reference Runner | vs aggressive Runner |
|---|---|---|
| Before the central rules | 369 / 374 | 353 / 375 |
| Open or porous central the Runner runs is iced first (v1) | 354 / 374 | 345 / 384 |
| v1 with a three-turn window, a boost after a steal, porous at three (v2) | – | 330 / 378 |
| v1 with urgent ice only when the whole server can be rezzed (kept) | 363 / 374 | 353 / 391 |

Two more passes of the same day measured flat against the reference: the Corp installing
an agenda it can score next turn behind two rezzable ice when rich (360 / 374 against
363 / 374), and the Runner dropping a contest that would need more cards than its hand
size while putting its hand on the board at ten credits (243 / 232 against 254 / 222 and
253 / 219 on the nightly sample). Both are kept: they remove behaviour that reads as a
fault in replays and cost nothing measurable, but they are not progress on the number.

Replay 4K88K9ZY (Discretion Advised 7-1 against the Stolen Goods bot) then fixed the
Runner's reading of bioroids: "cannot steal" counts as an end-the-run, a bioroid is
clicked through only with the clicks left after the run, unrezzed ice is priced by the
odds of meeting one the budget cannot pay, a server the estimate drops is capped, and
the contest bonus reaches Overclock. The both-sides grid after it: Corp 362 / 380,
Runner 244 / 220, flat again, with the Runner's rich credit clicks back up (Stolen Goods
182 and 183) now that it refuses runs it cannot finish.

Replay YT9YUQBD (the user's Stolen Goods 9-3 over Hyper Velocity) showed the Corp ruining
itself: Funhouse rezzed for its whole purse on turn one to stop a single HQ access, then
twelve turns at three to five credits installing ice while Hedge Fund waited in hand, and
Public Trail paid for twice on a tag cleared for two. With an early rez that would leave
the Corp broke refused on a central unless it ends the run, installs that put an economy
operation out of reach this turn penalised, and Public Trail kept for a tag that sticks or
can be followed up, the Corp grid reads 368 / 388, the best of the day (Hyper Velocity 66 /
82 against 55-63 / 75-76). Still inside the interval on the sum, but every deck row held or
rose and the weakest deck gained the most.

With the log-based detectors in the grid (Corp 366 / 389, Runner 243 / 221), the counts
over 1152 games per side point at the next targets. For the policy Runner,
runner:paid-and-stopped reached 258 (Stolen Goods 118, Planning Ahead 78, Party Hard 62);
the cases read showed the Runner pumping Marjanah and breaking one of Pharos's three
subroutines with the six credits it had, so an encounter no longer starts breaking an ice
that ends the run when the exact cost of a full break exceeds the credits for the run. For
the policy Corp, corp:rez-to-broke stayed at 133 against 136 for the reference: most cases
read were rezzes of an ice that does end the run, which the rule keeps on purpose.
The Runner grid after the partial-break fix read 241 / 224 with the counter unchanged
(259): split by cause on 24 local Stolen Goods games, nine wasted runs in ten were stopped
by ice the Corp rezzed during the run, the price of running into unrezzed ice rather than
a misread of known ice.

Replay BAFNY36P (the user's Quick and Dirty 7-2 over Party Hard) showed the Runner never
running from turn 3 to turn 11 while three agendas were scored behind four ice that were
never rezzed: the generic run proposals priced each unrezzed ice at three credits while the
Runner's own targets priced it from the Corp's deck at about two, so the remote looked
unaffordable and the reserve for it was never reached. With one deck price everywhere, the
combined odds of an impassable ice discounting a run instead of dropping it, and the decisive
run starting three points from the Corp's win, the Runner grid reads 263 / 250 against
241-244 / 220-224: the first gain of the day outside the interval (+48 on 1152 games), with
every Corp row up or level. The reference was refrozen on this version (`c0839d7`); its
baseline against itself reads Corp 355 / 362 and Runner 242 / 222. Both sides dropped
from their scores against the old reference by about the same amount (Corp from 368 / 388,
Runner from 263 / 250), which is what two improved sides look like: each now faces the
other's better version.

Replay 5P5VJBPX (the user's Party Hard 7-2 over Advanced Yomi) found Anoetic Void never
rezzed in the scoring remote and R&D left behind a single Tithe for seven turns. With
run-ending upgrades rezzed before the end of the turn and a lone cheap ice on R&D treated
as open when the Corp is rich, the Corp grid against the refrozen reference reads 367 / 373
against the baseline 355 / 362 (+23 on 1152, inside the interval), with Advanced Yomi the
deck that gained most (96 / 104 against 85 / 93).

Replay WMCQV8NR (the user's Planning Ahead 7-5 over Quick and Dirty) showed the Corp sitting
at five points for nine turns with three winning agendas in hand, the install capped because
an ender could not be rezzed with the Tread Lightly margin. An agenda whose points win the
game is now installed behind two or more ice the Runner cannot enter for under four. The
Corp grid reads 361 / 373 (Quick and Dirty 107 / 102), level with the previous 367 / 373:
the situation is rare in bot games, where the reference Runner seldom lets the Corp reach
five points with a full hand.

Replay 7QQ2WHAN (the user's Stolen Goods 8-0 over Discretion Advised) showed Ansel 1.0 firing
its trash subroutine and the Corp declining the prompt: a prompt asking for an installed
card to trash now picks the Runner's most valuable card (breakers first). The Corp grid reads
366 / 376, Discretion Advised 92 / 97 against 89 / 92.

Replay NXL475EC (Discretion Advised 1-7) had Offworld Office installed in a remote the Runner
entered at five points: an agenda whose steal wins the game for the Runner now stays out of a
remote the Runner can enter unless it scores next turn. Replay X8D5Y9LP (Hyper Velocity 5-7)
lost on an HQ run through two Funhouse and a Whitespace at four points, with Send a Message in
HQ and the Corp spending its last turn on a purge: when an agenda in HQ would win the game for
the Runner and HQ is not safe, Manegarm Skunkworks goes into HQ first, and a run-ending upgrade
guarding an agenda is rezzed before the end of the turn whenever three credits remain after it.
With both, the Corp grid reads 360 / 375 against 366 / 376 before them (Hyper Velocity 68 / 78
against 69 / 73): level, as expected for situations where the Runner sits one steal from the
win, which the reference Runner rarely reaches.

Local Hyper Velocity games then showed where its rich credit clicks came from: the Runner at
five or six points, two to four agendas in hand, twelve to twenty-four credits, and every
agenda install capped because the Runner could get in, so the Corp clicked until the Runner
took an agenda from HQ or R&D anyway. When the Runner is two points from winning, HQ is not
safe and half the hand or more are agendas, an install in a remote of two ice or more that
costs the Runner at least four and as much as HQ (with an ender the Corp can rez) now scores
46. The Corp grid reads 365 / 381 against 360 / 375, Hyper Velocity 72 / 79 against 68 / 78,
and its rich credit clicks drop from 62 / 76 to 45 / 32.
Linking each stolen agenda to the rule that installed it over 48 local Hyper Velocity games
gave 8 steals in 75 for clean installs, 6 in 35 at match point, 10 in 44 for contested
ones, but 4 in 7 into a nearly free remote and 3 in 7 under the one-point bait rule, which
ignored the cost of entry. The bait now needs the same four-credit entry: 364 / 385,
Hyper Velocity 72 / 80, remote steals 72 / 77. Against the 355 / 362 baseline of this
reference the Corp side is now +32 over 1152 games, at the edge of the interval.
Replay UWA9WREN (the user's Planning Ahead 8-4 over Hyper Velocity) opened with Hansei
Review trashing Hedge Fund from a hand of ice and an agenda; the Corp then spent the game
between zero and six credits. An operation that gains three or more credits net now ranks
above ice when the Corp trashes a card from HQ. The Corp grid reads 365 / 394 (Hyper
Velocity 62 / 80, the design row down ten inside its own interval), +42 over 1152 games
against the 355 / 362 baseline: the first Corp gain outside the interval against this
reference, which is refrozen on this version (`9d7a112`). Its baseline against itself reads
Corp 364 / 395 and Runner 241 / 207: the Runner side, unchanged since the previous
reference, loses 15 games on the test split to the stronger reference Corp.

Replay RXSPQFRJ (the user's Discretion Advised 8-3 over a Zahya Runner bot) showed the
Runner running HQ three times a turn on a hand it had already seen, and ignoring Send a
Message at four advancements behind a rezzed Brân 1.0 with the Corp broke. The engine
trial through rezzed ice does not click-break bioroids and overrode an estimate that
could pass; the estimate priced bioroid clicks as credits and compared them with the
purse; inside a run it still took off the click that started the run; and the trap guard
applied to a decisive run. A bioroid now also counts as passable when the clicks cover
its subroutines other than "install an ice", which are clicked first. The Runner also
remembers the cards it has accessed in HQ across turns, and the top of R&D until the Corp
draws; a central run is worth the accesses that can reach an unknown card, at the density
of agendas left among the unknown cards.

The first grid read Runner 208 / 201 against the 241 / 207 baseline. One grid with each
part switched off in turn put the loss on the card memory (248 / 218 without it), and a
comparison with the Corp's real hand showed why: a card drawn from R&D gets a new identity
in HQ, so cards seen on R&D were carried into HQ as known while the drawn cards stayed
unknown. Without that transfer the Runner reads 247 / 231 with the memory and 247 / 217
without it, +30 over the baseline. The final grid on both sides reads Runner 245 / 230 and
Corp 365 / 391 (364 / 395 at the baseline): the Corp's own use of the bioroid rule in
its server safety leaves it level.

The next replays (V3UFW844, V26MGBJ7, 9RXH3HQL, XZPZR5FA) brought: agendas the Runner had
seen installed and then stole no longer counted twice among those gone, and an access that
can win the game worth seven points; the Corp playing the rest of a run out on the engine,
with and without a rez, before paying more than an ice's printed cost (and never falling
back to the rez when its own hold had no "continue" to use); trials counting the
Runner's grip from its card count, which had made every Corp-side trial report no damage;
no draw into a discard below eight credits; and a Runner short of breakers neither saving
for a remote it cannot enter nor clicking for credits at eight or more. The grid read
Runner 233 / 232 after the first and Corp 357 / 387, Runner 235 / 224 after all of them,
inside the interval of the previous 365 / 391 and 245 / 230.
Replays A45J9PEN and 2N9BFAHE then had the Runner break "cannot steal" with the end-the-run
subroutines first and take a long-shot run when the Corp would win by scoring a remote next
turn, and the Corp keep economy assets out of unprotected remotes the Runner can afford to
trash: Corp 361 / 384, Runner 240 / 229.
Rezzing turn-start assets such as Nico Campaign as the Runner's turn ends rather than at
the end of the Corp's own turn read Corp 362 / 384, Runner 239 / 226.
Replay QN4NZR4Z then had the Runner contest a twice-advanced remote when the deck-aware
price says its unrezzed ice cannot stop the run (an empty grip is enough to survive the
access there, and a bioroid counts only its essential subroutines in clicks), price an
unrezzed bioroid it can click through at no credits so Conduit runs before the credit
clicks, host Tranquilizer on the costliest rezzed ice and load an empty Smartware
Distributor: Runner 280 / 255, the first Runner change above the interval on the design
split (Planning Ahead 71 to 88 and 71 to 82, Advanced Yomi as Corp losing 51 to 77 and
47 to 58), Corp unchanged at 362 / 384.
Replays 3WXLXLDD and LTEPL68K, rebuilt locally from the relay with `replayed.ts`, then had
the Corp rank its hand-size discards by card worth with surplus ice counted below
Government Subsidy, install the ice a discard would take on its last click, keep a click
to play an economy operation it clicks credits for, put Manegarm Skunkworks in HQ once two
agendas wait there, and draw three with Predictive Planogram when rich and iceless with
agendas in hand: Corp 358 / 394 after the first and 362 / 384 after both, inside the
interval.
Replay WFTWB65W then had the Runner stay off the centrals while Public Trail and an
Orbital Superiority advanced enough to score next turn could flatline its grip: Runner
273 / 256 (against Hyper Velocity 84 / 84 instead of 88 / 84), inside the interval.
Replays 7R9JBQRY and PB3SHFG2 then had the Corp hold a rez the Runner gets through anyway
when Tranquilizer will derez the ice again or breaking it costs at most half the rez on a
thin purse, purge Tranquilizer counters only when they would derez at least 5 credits of
rezzed ice, and rank its discards by what it can still play: Corp 353 / 389, 354 / 388 and
358 / 388 after each step, inside the interval of 362 / 384.

The spread between versions is inside the interval of 1152 games (about ±33 on a sum),
so none of this is a measured gain: the 72-game local batches that motivated v1 (27 to
22 Runner wins) and condemned v2 were noise. Two things did come out of it. The
aggressive style is not a harder opponent for the Corp bots than the frozen reference
at this scale (384 against 374 on the test split for v1), so the human edge over the
bots is not captured by running centrals more often with the same evaluation. And the
centrals are where the Corp bots lose: 66 of the 88 agendas stolen in 27 losses read
during the pass came from R&D and HQ, while the Corp sat on twenty credits or more in a
third of those games. The next Corp pass has to make the Corp score faster when rich
rather than ice more.

## Turn search (experimental, off by default)

`PolicyBot` can plan the Corp's whole turn instead of scoring one move at a time
(`search: true`, `--search 1` in `policy-eval.mjs`): a beam over click sequences
(five candidates per node from the policy's own proposals, four kept per depth, up to
the clicks left) played through the simulator, with each leaf valued by the static
evaluation (`evaluate.ts`) minus a threat term (`threat.ts`: expected agenda points the
Runner takes next turn from every server, from the server safety margin, the agendas in
hand and the deck's agenda density, plus the scoring chance of installed agendas and the
credits a check costs the Runner). The first move of the best line gets its search delta
added to its rule score, capped at ±20. Prompts opened by a move are answered with the
policy's own prompt handler; draws and other hidden moves keep their rule score.

To make it affordable the engine gained `mark` (a snapshot without the settled copy
`unchanged?` needs) and `attempt` now drops the cached views so that `view` rebuilds
them once: a simulated move costs 8 ms on the release engine build instead of 23, and a
31-node search 0.7 to 1.5 seconds. Refused moves are detected by comparing a signature
of the own view before and after instead of `unchanged?`.

Measured on the test split with 6 games per cell: no search 44 of 72; search 39 (NBN
fell from 5 to 2 of 18, Weyland rose from 12 to 16); with a concave credit curve and
unfunded ice valued at 0.5 instead of 1.5: 36; as a nudge only (weight 0.6, cap 8): 40.
Three cells read before the full split (Weyland/Criminal 6 of 6, Jinteki/Shaper 4 of 6,
HB/Anarch 4 of 6) looked better than the whole. The leaf evaluation is the bottleneck:
the Corp hoards credits when every install reads as a loss and spreads unpaid ice when
rezzed ice reads as value, and NBN's tag plan is invisible to it. The search stays
available for experiments and the rules keep deciding until a leaf evaluation beats
them, most likely one fitted on recorded positions rather than written by hand.

Replay K6CCE5LT (Weyland 5-8 against Tāo) added three rules on top: a thin install is
"slow" against a Runner whose next-turn purse (credits plus four plus income) reaches
seven, not only against one already holding four; a credit click that makes a big
economy operation playable this turn scores 48; and a purge is capped at 28 under four
credits, when the clicks are worth more as rez money.

## Scenario tests

`src/bot/policy/scenarios.test.ts` (`npm run scenarios`, also run by CI) asks the bot for
its decision in exact positions. `scenario.ts` builds a position through the engine's chat
commands (`/summon`, `/credit`, `/click`, `/discard`, `/rez-free`) on a real game with the
catalogue decks, with the simulation and the run trials attached as in play, and reads
back the chosen move and every scored proposal. Each scenario is a fault seen in a replay
or a harness game, so a rule that regresses fails a named test instead of a grid cell:
keeping credits to rez the ice in front of an agenda, the Seamless Launch click in the
never-advance test, rezzing only ice that bites under Tread Lightly, the unrezzed ice
debt, the rez cushion against Tread Lightly, Overclock against Whitespace's credit check,
the early window behind ice the Runner cannot break, scoring when the agenda can be
finished, never discarding an agenda, Hansei Review's trash, Tread Lightly against a broke
Corp, and not running into unrezzed ice with an empty grip. Writing them found that the
deck modules' own proposals and the glacier's late rules escaped every install and advance
guard; the guards now run last over every proposal.

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
4. **The aggressive Runner** (`--runner aggro`): the working-tree Runner policy in its
   aggressive style, meant to play the way the humans who beat the Corp bots do. It runs a
   central every turn when it can afford it, prefers HQ when the Corp holds five cards or
   more, runs more when it sits on ten credits, halves the penalties that keep it saving
   for the remote, and does not wait for its rig to be complete. Its hand-survival rules
   are unchanged. The Corp policies are tuned against it, since the frozen reference Runner
   is more patient than a human.
5. **The heuristic bot**, kept as a sanity check that nothing regressed into nonsense.

The summary counts mistakes that the evaluation detects from the game state and the log,
whichever bot plays: an agenda stolen from a remote, a thin or unrezzable agenda install,
a credit click while rich, and, from the log, `corp:broke-streak` (three Corp turns in a row
ending under five credits, `corp:broke-with-economy-in-hand` when an economy operation was
waiting), `corp:rez-to-broke` (a rez that leaves the Corp at one credit or less before
turn seven) and `runner:paid-and-stopped-*` (a run that cost three credits or more in breaks
and never breached, split by cause: `new-ice` when the Corp rezzed ice during the run,
`jacked-out`, and `known-ice` when the run was stopped by ice that was already rezzed). The first few of each kind are exported as situations. The log-based
counters came from the user's replays: each named a fault the grids could not see.

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
