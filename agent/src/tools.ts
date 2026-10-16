import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Agent } from "./game";

export const INSTRUCTIONS = `Pocket Rig lets you play Netrunner (the Jinteki rules engine) against a human on their phone.
Decks: list_decks shows the preconstructed decks of a side; NetrunnerDB deck URLs work too. Pick one that suits you.
Joining: join_game with the code the human gives you and your deck; the host starts the game.
Hosting: host_game with your side and deck, then reply to the human with the code and the join link and end your turn, so they can read it. The game starts by itself once they join, pick a deck and press Ready; call wait_for_turn when they tell you they are in.
During the game: get_state shows the whole board from your seat only and a numbered list of legal actions; act performs one of them by id. When nothing is yours to decide, call wait_for_turn.
Keep playing in a loop (wait_for_turn, then act) without ending your turn until the game is over or the user asks you to stop: the human cannot nudge you while you are idle, so ending your turn stalls the game.
To save context, act and wait_for_turn only return what changed since your last look (new log lines, changed lines, the current run and prompt) plus the fresh action list. Call get_state again whenever you need the full picture, for example after your context was summarized.
Use card_info to read a card's full text. Decide every move yourself. You only ever see what your seat may see.
The person you are talking to is your opponent. Keep your hidden information hidden in everything you write to them: never mention the cards in your hand or deck, what your facedown or unrezzed cards are, which installed card is an agenda or a trap, how many credits you are saving for what, or your plans and bluffs. Think about your strategy privately and only write things your opponent can already see on the board (moves once they are public, like a run, a rez or a scored agenda), plus friendly table talk. If they ask about your hidden cards or plans, decline playfully, as a human player would. When the game is over you may discuss it freely.`;

export function registerTools(server: McpServer, agent: () => Promise<Agent>, NAME: string) {
  const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
  const run = async (fn: (a: Agent) => Promise<string> | string) => {
    try {
      return text(await fn(await agent()));
    } catch (e) {
      return { ...text(`Error: ${e instanceof Error ? e.message : String(e)}`), isError: true };
    }
  };

  const side = z.enum(["corp", "runner"]);

  const deckArg = z.string().describe('A preconstructed deck name as list_decks shows it (e.g. "System Gateway Starter Runner (Beginner)") or a NetrunnerDB deck URL');

  server.registerTool(
    "join_game",
    {
      description: "Join a Pocket Rig game with its 5-letter code (or rejoin one this server already played). With a deck, you are ready right away.",
      inputSchema: { code: z.string().describe("Game code, e.g. K7QPA"), deck: deckArg.optional(), name: z.string().optional().describe("Your player name") },
    },
    ({ code, deck, name }) => run((a) => a.join(code, name ?? NAME, deck)),
  );
  server.registerTool(
    "host_game",
    {
      description:
        "Create a new game with your side and deck, and get the code and join link to give to the human. Call list_decks first to pick a deck. Then reply to the human with the code and link and end your turn; the game starts by itself once they are ready.",
      inputSchema: { side: side.describe("The side you will play"), deck: deckArg, name: z.string().optional() },
    },
    ({ side, deck, name }) => run((a) => a.host(name ?? NAME, side, deck)),
  );
  server.registerTool("list_decks", { description: "List the preconstructed decks for your side (or the given side).", inputSchema: { side: side.optional() } }, ({ side }) =>
    run((a) => a.decks(side)),
  );
  server.registerTool(
    "choose_deck",
    { description: "Pick your deck by precon name (as listed by list_decks) or NetrunnerDB URL. As guest this also marks you ready.", inputSchema: { deck: z.string() } },
    ({ deck }) => run((a) => a.chooseDeck(deck)),
  );
  server.registerTool("set_side", { description: "Host only: switch the side you play before the game starts.", inputSchema: { side } }, ({ side }) => run((a) => a.setSide(side)));
  server.registerTool("start_game", { description: "Host only: start the game now (it also starts by itself when the guest is ready)." }, () => run((a) => a.start()));
  server.registerTool("get_state", { description: "Show the lobby, or the whole board from your seat with the recent log and the numbered list of legal actions." }, () => run((a) => a.describe()));
  server.registerTool(
    "act",
    {
      description: "Perform one action by id. An action keeps its id from one list to the next and an id is never reused for another action, so an id that is no longer listed is refused. Some actions need an amount or a text value. Returns only what changed, plus the new action list.",
      inputSchema: { action: z.number().int().describe("Action id"), amount: z.number().int().optional(), text: z.string().optional() },
    },
    ({ action, amount, text }) => run((a) => a.act(action, amount, text)),
  );
  server.registerTool(
    "wait_for_turn",
    {
      description: "Wait until you have a decision to make (in the lobby: until the game starts), then return what changed since your last look and the action list.",
      inputSchema: { seconds: z.number().int().optional().describe("Maximum wait, default 90, max 900") },
    },
    ({ seconds }) => run((a) => a.wait(seconds ?? 90)),
  );
  server.registerTool("card_info", { description: "Full text and stats of a card by name.", inputSchema: { name: z.string() } }, ({ name }) => run((a) => a.card(name)));
  server.registerTool("say", { description: "Send a chat message to your opponent's game log.", inputSchema: { message: z.string() } }, ({ message }) => run((a) => a.say(message)));
  server.registerTool("concede", { description: "Concede the current game." }, () => run((a) => a.concede()));
}
