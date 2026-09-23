import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Log } from "../application/ports.js";
import type { MatchSnapshot } from "../domain/match-state.js";

const assets: Record<string, string> = {
  "/": "index.html",
  "/arena.js": "arena.js",
  "/renderer.js": "renderer.js",
  "/avatar-cache.js": "avatar-cache.js",
  "/styles.css": "styles.css",
};

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

type ArenaMessage =
  | { type: "status"; demo: boolean; connected: boolean }
  | { type: "snapshot"; snapshot: MatchSnapshot }
  | { type: "activity"; stage: string; fields: Record<string, unknown> };

export type ArenaServer = {
  log: Log;
  updateSnapshot(snapshot: MatchSnapshot): void;
  start(port: number): Promise<void>;
};

export function createArenaServer(
  publicDirectory = join(process.cwd(), "public"),
  demo = false,
): ArenaServer {
  const clients = new Set<ServerResponse>();
  let latestSnapshot: MatchSnapshot | undefined;
  let connected = false;

  const send = (client: ServerResponse, message: ArenaMessage) => {
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  };
  const broadcast = (message: ArenaMessage) => {
    for (const client of clients) send(client, message);
  };

  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://arena.local").pathname;
    if (pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", clients: clients.size }));
      return;
    }
    if (pathname === "/events") {
      response.writeHead(200, {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream",
      });
      response.write(": connected\n\n");
      clients.add(response);
      send(response, { type: "status", demo, connected });
      if (latestSnapshot)
        send(response, { type: "snapshot", snapshot: latestSnapshot });
      request.on("close", () => clients.delete(response));
      return;
    }

    const asset = assets[pathname];
    if (!asset) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    try {
      const body = await readFile(join(publicDirectory, asset));
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type":
          contentTypes[extname(asset)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(500);
      response.end("Arena asset unavailable");
    }
  });

  return {
    log(stage, fields) {
      if (stage === "CONNECTED") connected = true;
      if (stage === "DISCONNECTED" || stage === "CONNECT_FAILED")
        connected = false;
      const activity: ArenaMessage = { type: "activity", stage, fields };
      broadcast(activity);
    },
    updateSnapshot(snapshot) {
      latestSnapshot = snapshot;
      broadcast({ type: "snapshot", snapshot });
    },
    start(port) {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "0.0.0.0", () => resolve());
      });
    },
  };
}
