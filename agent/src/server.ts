import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Agent, loadEngine } from "./game";

const BASE = (process.env.POCKET_RIG_URL ?? "https://lelongg.github.io/netrunner/").replace(/\/?$/, "/");
const NAME = process.env.POCKET_RIG_NAME ?? "Claude";

const INSTRUCTIONS = `Pocket Rig lets you play Netrunner (the Jinteki rules engine) against a human on their phone.
Flow: join_game with the code the human gives you (or host_game and give them the code), then list_decks and choose_deck. The host starts the game with start_game.
During the game: get_state shows the board from your seat only and a numbered list of legal actions; act performs one of them by id. When nothing is yours to decide, call wait_for_turn and repeat until the game is over.
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
  { description: "Create a new game and get the code to give to the human. You choose your side.", inputSchema: { side: side.describe("The side you will play"), name: z.string().optional() } },
  ({ side, name }) => run((a) => a.host(name ?? NAME, side)),
);
server.registerTool("list_decks", { description: "List the preconstructed decks for your side (or the given side).", inputSchema: { side: side.optional() } }, ({ side }) => run((a) => a.decks(side)));
server.registerTool(
  "choose_deck",
  { description: "Pick your deck by precon name (as listed by list_decks) or NetrunnerDB URL. As guest this also marks you ready.", inputSchema: { deck: z.string() } },
  ({ deck }) => run((a) => a.chooseDeck(deck)),
);
server.registerTool("set_side", { description: "Host only: switch the side you play before the game starts.", inputSchema: { side } }, ({ side }) => run((a) => a.setSide(side)));
server.registerTool("start_game", { description: "Host only: start the game once both decks are ready." }, () => run((a) => a.start()));
server.registerTool("get_state", { description: "Show the lobby or the board from your seat, with the numbered list of legal actions." }, () => run((a) => a.describe()));
server.registerTool(
  "act",
  {
    description: "Perform one action from the latest get_state list, by id. Some actions need an amount or a text value.",
    inputSchema: { action: z.number().int().describe("Action id"), amount: z.number().int().optional(), text: z.string().optional() },
  },
  ({ action, amount, text }) => run((a) => a.act(action, amount, text)),
);
server.registerTool(
  "wait_for_turn",
  { description: "Wait until you have a decision to make (or the game ends, or the lobby changes), then return the state.", inputSchema: { seconds: z.number().int().optional().describe("Maximum wait, default 50, max 600") } },
  ({ seconds }) => run((a) => a.wait(seconds ?? 50)),
);
server.registerTool("card_info", { description: "Full text and stats of a card by name.", inputSchema: { name: z.string() } }, ({ name }) => run((a) => a.card(name)));
server.registerTool("say", { description: "Send a chat message to your opponent's game log.", inputSchema: { message: z.string() } }, ({ message }) => run((a) => a.say(message)));
server.registerTool("concede", { description: "Concede the current game." }, () => run((a) => a.concede()));

await server.connect(new StdioServerTransport());
ready().catch(() => {});
