import "./env";
import { DurableObject } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { type EngineApi, importEngine as loadEngineModule } from "../../mobile/src/engine";
import { memoryStore } from "../../mobile/src/store";
import { Agent, loadEngine } from "../src/game";
import { INSTRUCTIONS, registerTools } from "../src/tools";

export interface Env {
  SESSION: DurableObjectNamespace<McpSession>;
  SESSION_LIMIT?: RateLimit;
  SESSION_LIMIT_ALL?: RateLimit;
  SITE: string;
  NAME?: string;
  IDLE_HOURS?: string;
  BUILD?: string;
}

const SESSION_HEADER = "x-pocket-rig-session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

const rpcError = (status: number, message: string) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }), { status, headers: { "Content-Type": "application/json", ...CORS } });

async function limited(limiter: RateLimit | undefined, key: string) {
  return !!limiter && !(await limiter.limit({ key })).success;
}

let engineModule: Promise<EngineApi> | undefined;
const importEngine = () => (engineModule ??= loadEngineModule());

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/version") return new Response(env.BUILD ?? "", { headers: { "Content-Type": "text/plain", ...CORS } });
    if (url.pathname !== "/mcp") {
      return new Response(`Pocket Rig MCP server. Add ${url.origin}/mcp to your MCP client as a remote (Streamable HTTP) server.\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    let id = request.headers.get("mcp-session-id");
    if (id && !UUID.test(id)) return rpcError(404, "Session not found");
    if (!id) {
      if (request.method !== "POST") return rpcError(400, "Start a session with an initialize request");
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if ((await limited(env.SESSION_LIMIT, ip)) || (await limited(env.SESSION_LIMIT_ALL, "all"))) return rpcError(429, "Too many new sessions, try again in a minute");
      id = crypto.randomUUID();
    }
    const headers = new Headers(request.headers);
    headers.set(SESSION_HEADER, id);
    const response = await env.SESSION.get(env.SESSION.idFromName(id)).fetch(new Request(request, { headers }));
    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
} satisfies ExportedHandler<Env>;

export class McpSession extends DurableObject<Env> {
  private transport?: WebStandardStreamableHTTPServerTransport;
  private agent?: Promise<Agent>;
  private current?: Agent;
  private store = memoryStore(this.load(), (data) => {
    this.ctx.storage.kv.put("store", data);
    this.remember();
  });

  private load(): Record<string, string> {
    return (this.ctx.storage.kv.get("store") as Record<string, string> | undefined) ?? {};
  }

  private getAgent(restore: string | undefined): Promise<Agent> {
    return (this.agent ??= (async () => {
      const agent = new Agent(await loadEngine(this.env.SITE, await importEngine()), this.store);
      this.current = agent;
      if (restore) await agent.join(restore, this.env.NAME ?? "Claude").catch(() => {});
      return agent;
    })());
  }

  async fetch(request: Request): Promise<Response> {
    const id = request.headers.get(SESSION_HEADER)!;
    const known = this.ctx.storage.kv.get("session") === id;
    if (!this.transport) {
      const body = request.method === "POST" ? await request.clone().json().catch(() => null) : null;
      const initializing = [body].flat().some((m: any) => m?.method === "initialize");
      if (!initializing && !known) return rpcError(404, "Session not found");
      const server = new McpServer({ name: "pocket-rig", version: "1.0.0" }, { instructions: INSTRUCTIONS });
      const restore = known && !initializing ? (this.ctx.storage.kv.get("game") as string | undefined) : undefined;
      registerTools(
        server,
        () => this.getAgent(restore),
        this.env.NAME ?? "Claude",
      );
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: () => id });
      await server.connect(transport);
      if (!initializing) {
        const t = transport as any;
        t.sessionId = id;
        t._initialized = true;
      }
      this.transport = transport;
      this.ctx.storage.kv.put("session", id);
    }
    await this.ctx.storage.setAlarm(Date.now() + (Number(this.env.IDLE_HOURS) || 24) * 3600_000);
    if (request.method === "DELETE") {
      const response = await this.transport.handleRequest(request);
      await this.end();
      return response;
    }
    return this.transport.handleRequest(request);
  }

  private remember() {
    const code = this.current?.session?.lobby.code;
    if (code && this.ctx.storage.kv.get("game") !== code) this.ctx.storage.kv.put("game", code);
  }

  private async end() {
    (await this.agent?.catch(() => undefined))?.session?.close();
    this.agent = undefined;
    this.current = undefined;
    this.transport = undefined;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async alarm() {
    await this.end();
  }
}
