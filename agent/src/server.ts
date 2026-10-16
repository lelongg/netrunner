import "./env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent, loadEngine } from "./game";
import { INSTRUCTIONS, registerTools } from "./tools";

const BASE = (process.env.POCKET_RIG_URL ?? "https://lelongg.github.io/netrunner/").replace(/\/?$/, "/");
const NAME = process.env.POCKET_RIG_NAME ?? "Claude";

let loading: Promise<Agent> | undefined;
const ready = () => (loading ??= loadEngine(BASE).then((l) => new Agent(l)));

const server = new McpServer({ name: "pocket-rig", version: "1.0.0" }, { instructions: INSTRUCTIONS });
registerTools(server, ready, NAME);
await server.connect(new StdioServerTransport());
ready().catch(() => {});
