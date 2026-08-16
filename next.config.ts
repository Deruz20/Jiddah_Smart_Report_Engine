import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import withSerwistInit from "@serwist/next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Since we eliminated the monorepo, .env.local is now right in the projectRoot
const rootEnvPath = path.join(projectRoot, ".env.local");
if (fs.existsSync(rootEnvPath)) {
  const envContents = fs.readFileSync(rootEnvPath, "utf8");
  envContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valueParts] = trimmed.split("=");
    if (!key) return;
    const value = valueParts.join("=");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-Requested-With, content-type, Authorization" },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
