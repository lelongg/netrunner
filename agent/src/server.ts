import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Agent, loadEngine } from "./game";

const BASE = (process.env.POCKET_RIG_URL ?? "https://lelongg.github.io/netrunner/").replace(/\/?$/, "/");
const NAME = process.env.POCKET_RIG_NAME ?? "Claude";

const INSTRUCTIONS = `Pocket Rig lets you play Netrunner (the Jinteki rules engine) against a human on their phone.
Joining: join_game with the code the human gives you, then choose_deck (list_decks shows the options); the host starts the game.
Hosting: host_game picks a default deck (change it with choose_deck if you like). Tell the human the code in your reply, then in the same turn call wait_for_turn: the game starts by itself once they join, pick a deck and press Ready.
During the game: get_state shows the whole board from your seat only and a numbered list of legal actions; act performs one of them by id. When nothing is yours to decide, call wait_for_turn.
Keep playing in a loop (wait_for_turn, then act) without ending your turn until the game is over or the user asks you to stop: the human cannot nudge you while you are idle, so ending your turn stalls the game.
To save context, act and wait_for_turn only return what changed since your last look (new log lines, changed lines, the current run and prompt) plus the fresh action list. Call get_state again whenever you need the full picture, for example after your context was summarized.
Use card_info to read a card's full text. Decide every move yourself and explain your reasoning briefly to the user. You only ever see what your seat may see.`;

let agent: Agent | undefined;
let loading: Promise<Agent> | undefined;
const ready = () => (loading ??= loadEngine(BASE).then((l) => (agent = new Agent(l))));

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const run = async (fn: (a: Agent) => Promise<string> | string) => {
  try {
    return text(await fn(await ready()));
  } catch (e) {
    return { ...text(`Error: ${e instanceof Error ? e.message : String(e)}`), isError: true };
  }
};

const server = new McpServer({ name: "pocket-rig", version: "1.0.0" }, { instructions: INSTRUCTIONS });
const side = z.enum(["corp", "runner"]);

server.registerTool(
  "join_game",
  { description: "Join a Pocket Rig game with its 5-letter code (or rejoin one this server already played).", inputSchema: { code: z.string().describe("Game code, e.g. K7QPA"), name: z.string().optional().describe("Your player name") } },
  ({ code, name }) => run((a) => a.join(code, name ?? NAME)),
);
server.registerTool(
  "host_game",
  { description: "Create a new game with a default deck and get the code to give to the human. The game starts by itself once they are ready: give them the code, then call wait_for_turn.", inputSchema: { side: side.describe("The side you will play"), name: z.string().optional() } },
  ({ side, name }) => run((a) => a.host(name ?? NAME, side)),
);
server.registerTool("list_decks", { description: "List the preconstructed decks for your side (or the given side).", inputSchema: { side: side.optional() } }, ({ side }) => run((a) => a.decks(side)));
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
    description: "Perform one action from the latest action list, by id. Some actions need an amount or a text value. Returns only what changed, plus the new action list.",
    inputSchema: { action: z.number().int().describe("Action id"), amount: z.number().int().optional(), text: z.string().optional() },
  },
  ({ action, amount, text }) => run((a) => a.act(action, amount, text)),
);
server.registerTool(
  "wait_for_turn",
  { description: "Wait until you have a decision to make (in the lobby: until the game starts), then return what changed since your last look and the action list.", inputSchema: { seconds: z.number().int().optional().describe("Maximum wait, default 50, max 600") } },
  ({ seconds }) => run((a) => a.wait(seconds ?? 50)),
);
server.registerTool("card_info", { description: "Full text and stats of a card by name.", inputSchema: { name: z.string() } }, ({ name }) => run((a) => a.card(name)));
server.registerTool("say", { description: "Send a chat message to your opponent's game log.", inputSchema: { message: z.string() } }, ({ message }) => run((a) => a.say(message)));
server.registerTool("concede", { description: "Concede the current game." }, () => run((a) => a.concede()));

await server.connect(new StdioServerTransport());
ready().catch(() => {});
