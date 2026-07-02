import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.env.PORT || 3000);
const artifactDir = resolve(root, "..", "artifacts", "web-experiment");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
]);

function safeJoin(base, target) {
  const cleaned = target.replace(/^\/+/, "");
  const resolved = resolve(base, cleaned);
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    ...headers,
  });
  res.end(body);
}

async function ensureArtifacts() {
  if (!existsSync(artifactDir)) {
    await mkdir(artifactDir, { recursive: true });
  }
}

async function saveSession(payload) {
  await ensureArtifacts();
  const sessionId = payload.sessionId || "session";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${stamp}-${sessionId}.json`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = join(artifactDir, fileName);
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return { fileName, filePath };
}

function getLanUrls(portNumber) {
  const urls = [];
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${portNumber}`);
      }
    }
  }
  return Array.from(new Set(urls));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      return send(res, 204, "", {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
    }

    if (req.method === "POST" && url.pathname === "/api/session") {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const saved = await saveSession(payload);
      return send(
        res,
        200,
        JSON.stringify({ ok: true, ...saved }),
        { "Content-Type": "application/json; charset=utf-8" }
      );
    }

    let pathname = url.pathname;
    if (pathname === "/") pathname = "/index.html";
    const filePath = safeJoin(root, pathname);
    const content = await readFile(filePath);
    const type = mimeTypes.get(extname(filePath)) || "application/octet-stream";
    send(res, 200, content, { "Content-Type": type });
  } catch (error) {
    send(
      res,
      404,
      JSON.stringify({ ok: false, error: error.message }),
      { "Content-Type": "application/json; charset=utf-8" }
    );
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`FirstAid web experiment running on http://0.0.0.0:${port}`);
  console.log(`Open locally: http://localhost:${port}`);
  for (const url of getLanUrls(port)) {
    console.log(`Open on phone: ${url}`);
  }
});
