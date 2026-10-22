import { NextRequest, NextResponse } from "next/server";
import { apiOptions, corsPreflight, withCors } from "@/lib/api-cors";

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request);
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request);
  if (preflight) return preflight;

  const releaseInfo = {
    version: "2.4.0",
    buildTimestamp: new Date().toISOString(),
    gitCommit: "77d5aa5",
    engine: "Jiddah Smart Report Engine 2.0",
    status: "operational",
  };

  return withCors(
    request,
    NextResponse.json(releaseInfo, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  );
}
