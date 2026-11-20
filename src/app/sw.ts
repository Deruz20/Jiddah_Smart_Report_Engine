// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  StaleWhileRevalidate,
  NetworkFirst,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Critical Read-Only API Schemas & Reference Data (StaleWhileRevalidate with 7-day fallback)
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/classes") ||
        url.pathname.startsWith("/api/subjects") ||
        url.pathname.startsWith("/api/theology-classes") ||
        url.pathname.startsWith("/api/theology-subjects") ||
        url.pathname.startsWith("/api/settings/school"),
      handler: new StaleWhileRevalidate({
        cacheName: "jiddah-reference-api-v1",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },
    // 2. Active Terms & Student Rosters (NetworkFirst with 24-hour fallback)
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/terms") ||
        url.pathname.startsWith("/api/enrollments") ||
        url.pathname.startsWith("/api/academic-terms"),
      handler: new NetworkFirst({
        cacheName: "jiddah-roster-api-v1",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
