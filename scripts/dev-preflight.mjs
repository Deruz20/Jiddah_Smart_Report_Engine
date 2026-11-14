#!/usr/bin/env node
/**
 * Dev-server preflight guard.
 *
 * Ensures NEXT_PUBLIC_SUPABASE_URL is configured before starting `next dev`.
 * - By default, allows the live hosted `https://*.supabase.co` URL when local
 *   Supabase (`127.0.0.1:54321`) is not running.
 * - If NEXT_PUBLIC_SUPABASE_URL points to `127.0.0.1:54321` or `localhost:54321`,
 *   probes the local port first and fails fast with clear instructions if the
 *   local Supabase Docker stack is stopped.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function checkPortOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolvePort) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolvePort(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

const root = process.cwd();
const env = {
  ...parseEnvFile(resolve(root, ".env")),
  ...parseEnvFile(resolve(root, ".env.development")),
  ...parseEnvFile(resolve(root, ".env.local")),
  ...process.env,
};

const url = env.NEXT_PUBLIC_SUPABASE_URL || "";

if (!url) {
  console.error(
    "\n\x1b[31m✖ Refusing to start `next dev`: NEXT_PUBLIC_SUPABASE_URL is not set in .env.local.\x1b[0m\n"
  );
  process.exit(1);
}

const isLocalUrl =
  url.includes("127.0.0.1:54321") || url.includes("localhost:54321");

if (isLocalUrl) {
  const isUp = await checkPortOpen("127.0.0.1", 54321);
  if (!isUp) {
    console.error(
      [
        "",
        "\x1b[31m✖ Local Supabase (127.0.0.1:54321) is not running, which will cause ERR_CONNECTION_REFUSED on /login.\x1b[0m",
        `  NEXT_PUBLIC_SUPABASE_URL = ${url}`,
        "",
        "  Either start local Supabase (`npx supabase start`) or configure the hosted",
        "  https://*.supabase.co URL in .env.local.",
        "",
      ].join("\n")
    );
    process.exit(1);
  }
} else if (url.includes(".supabase.co")) {
  console.log(
    `\x1b[32m✔ Dev preflight: Using hosted Supabase endpoint (${url}).\x1b[0m`
  );
}
