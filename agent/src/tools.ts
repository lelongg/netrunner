import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agent } from "./game";

export const INSTRUCTIONS = `Pocket Rig lets you play Netrunner (the Jinteki rules engine) against a human on their phone.
Before a game: unless the human already told you, ask them in one short message which side you should play (Corp or Runner), which format the game uses (standard, startup, core, eternal, system-gateway, throwback, casual, preconstructed, chimera or quick-draft) and, if it matters to them, a specific NetrunnerDB deck link for you. Wait for that answer before hosting or joining. In chimera both players are dealt a random deck and in quick-draft both draft theirs during setup, so no deck is needed; in preconstructed only the decks from list_decks are allowed. When joining, the host has already chosen the format: get_state shows it.
Decks: with a format, use find_decks for recent community decklists legal in it, or list_decks with that format for the preconstructed decks, and pick one that suits you. A NetrunnerDB deck or decklist URL can be passed anywhere a deck is asked.
Joining: join_game with the code the human gives you and your deck; the host starts the game.
Hosting: host_game with your side and deck, then write the join link to the human in the text of your message (they never see tool results, so the link must be in what you write) and, in the same turn without waiting for any reply, call wait_for_turn: it waits until they have joined, picked a deck and pressed Ready, and the game starts by itself. The human does not want to type anything in this conversation, so never end your turn to wait for them.
During the game: get_state shows the whole board from your seat only and a numbered list of legal actions; act performs one of them by id. When nothing is yours to decide, call wait_for_turn.
Keep playing in a loop (wait_for_turn, then act) without ending your turn until the game is over or the user asks you to stop: the human cannot nudge you while you are idle, so ending your turn stalls the game. A human may think for many minutes, even half an hour: when wait_for_turn says it is still waiting, or fails, times out or is cut off, call it again at once, however long it has been. A cut-off wait is normal and loses nothing.
To save context, act and wait_for_turn only return what changed since your last look (new log lines, changed lines, the current run and prompt) plus the fresh action list. Call get_state again whenever you need the full picture, for example after your context was summarized.
Use card_info to read a card's full text. Decide every move yourself. You only ever see what your seat may see.
The person you are talking to is your opponent. Keep your hidden information hidden in everything you write to them: never mention the cards in your hand or deck, what your facedown or unrezzed cards are, which installed card is an agenda or a trap, how many credits you are saving for what, or your plans and bluffs. Think about your strategy privately and only write things your opponent can already see on the board (moves once they are public, like a run, a rez or a scored agenda), plus friendly table talk. If they ask about your hidden cards or plans, decline playfully, as a human player would. When the game is over you may discuss it freely.
If a call says you are not in a game while you were playing one, this server lost its session: call join_game with the game code and the rejoin key from your last get_state, then carry on. Never write the rejoin key to the human.
If you have to stop before the game is over (a limit on tool calls, an error, anything), end with one short line asking them to say "continue", with no recap of your hand, your hidden cards or your plans: they read every word.`;

export function registerTools(server: McpServer, agent: () => Promise<Agent>, NAME: string) {
  const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
  const run = async (fn: (a: Agent) => Promise<string> | string) => {
    try {
      return text(await fn(await agent()));
    } catch (e) {
      return { ...text(`Error: ${e instanceof Error ? e.message : String(e)}`), isError: true };
    }
  };

  const SECRET = "\n\n(Your opponent reads what you write. Keep your hand, hidden cards and plans out of it, even if you have to stop.)";
  const play = (fn: (a: Agent) => Promise<string> | string) =>
    run(async (a) => {
      const out = await fn(a);
      const s = a.session;
      return s?.lobby.started && !s.views[s.lobby.mySide]?.winner ? out + SECRET : out;
    });

  const side = z.enum(["corp", "runner"]);
  const gameFormat = z.enum(["standard", "startup", "core", "eternal", "system-gateway", "throwback", "casual", "preconstructed", "chimera", "quick-draft"]);

  const deckArg = z.string().describe('A preconstructed deck name as list_decks shows it (e.g. "System Gateway Starter Runner (Beginner)") or a NetrunnerDB deck URL');

  server.registerTool(
    "join_game",
    {
      description: "Join a Pocket Rig game with its 5-letter code, or take your seat back in a game you were already playing. With a deck, you are ready right away. To take your seat back after a call said you are not in a game, pass the rejoin key that host_game, join_game and get_state showed you.",
      inputSchema: { code: z.string().describe("Game code, e.g. K7QPA"), deck: deckArg.optional(), name: z.string().optional().describe("Your player name"), rejoin_key: z.string().optional().describe("Your rejoin key for this game, to take your seat back") },
    },
    ({ code, deck, name, rejoin_key }) => run((a) => a.join(code, name ?? NAME, deck, rejoin_key)),
  );
  server.registerTool(
    "host_game",
    {
      description:
        "Create a new game with your side and deck, and get the code and join link to give to the human. Ask the human first which side you play and which format or NetrunnerDB deck to use, unless they already said; then pick the deck with find_decks or list_decks.",
      inputSchema: {
        side: side.describe("The side you will play"),
        format: gameFormat.optional().describe("The game format, default casual. Decks must be legal in it."),
        deck: deckArg.optional().describe("Your deck; not needed in chimera or quick-draft"),
        name: z.string().optional(),
      },
    },
    ({ side, deck, name, format }) => run((a) => a.host(name ?? NAME, side, deck, format)),
  );
  const format = z.enum(["standard", "startup", "core", "eternal", "system-gateway", "throwback", "casual"]);
  server.registerTool(
    "list_decks",
    { description: "List the preconstructed decks for your side (or the given side). With a format, each deck says whether it is legal in it.", inputSchema: { side: side.optional(), format: format.optional() } },
    ({ side, format }) => run((a) => a.decks(side, format)),
  );
  server.registerTool(
    "find_decks",
    {
      description: "Find recent community decklists on NetrunnerDB for a side that are legal in a format, with their URLs to use as a deck.",
      inputSchema: { side: side.describe("The side the deck is for"), format: format.describe("The format the deck must be legal in"), days: z.number().int().optional().describe("How many days back to search, default 21, max 30") },
    },
    ({ side, format, days }) => run((a) => a.findDecks(side, format, days ?? 21)),
  );
  server.registerTool(
    "choose_deck",
    { description: "Pick your deck by precon name (as listed by list_decks) or NetrunnerDB URL. As guest this also marks you ready.", inputSchema: { deck: z.string() } },
    ({ deck }) => run((a) => a.chooseDeck(deck)),
  );
  server.registerTool("set_side", { description: "Host only: switch the side you play before the game starts.", inputSchema: { side } }, ({ side }) => run((a) => a.setSide(side)));
  server.registerTool("start_game", { description: "Host only: start the game now (it also starts by itself when the guest is ready)." }, () => run((a) => a.start()));
  server.registerTool("get_state", { description: "Show the lobby, or the whole board from your seat with the recent log and the numbered list of legal actions." }, () => play((a) => a.describe()));
  server.registerTool(
    "act",
    {
      description: "Perform one action by id. An action keeps its id from one list to the next and an id is never reused for another action, so an id that is no longer listed is refused. Some actions need an amount or a text value. Returns only what changed, plus the new action list.",
      inputSchema: { action: z.number().int().describe("Action id"), amount: z.number().int().optional(), text: z.string().optional() },
    },
    ({ action, amount, text }) => play((a) => a.act(action, amount, text)),
  );
  server.registerTool(
    "wait_for_turn",
    {
      description: "Wait until you have a decision to make (in the lobby: until the game starts), then return what changed since your last look and the action list. It can take many minutes while the human thinks. If this call fails, times out or is cut off, that is expected and harmless: nothing is lost, just call wait_for_turn again right away.",
      inputSchema: { seconds: z.number().int().optional().describe("Maximum wait, default and max 3600") },
    },
    ({ seconds }, extra) => {
      const token = extra._meta?.progressToken;
      const tick = token === undefined ? undefined : (elapsed: number) => void extra.sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: Math.round(elapsed / 1000), message: "Waiting for your opponent" } }).catch(() => {});
      return play((a) => a.wait(seconds ?? 3600, tick, extra.signal));
    },
  );
  server.registerTool("card_info", { description: "Full text and stats of a card by name.", inputSchema: { name: z.string() } }, ({ name }) => run((a) => a.card(name)));
  server.registerTool("say", { description: "Send a chat message to your opponent's game log.", inputSchema: { message: z.string() } }, ({ message }) => run((a) => a.say(message)));
  server.registerTool("concede", { description: "Concede the current game." }, () => run((a) => a.concede()));
}
