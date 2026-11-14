"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function VersionChecker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (currentVersion === null) {
          currentVersion = data.version;
        } else if (data.version && data.version !== currentVersion) {
          toast("Update Available", {
            description: `A newer version (${data.version}) of Jiddah Smart Engine is ready.`,
            action: {
              label: "Reload Now",
              onClick: () => window.location.reload(),
            },
            duration: 15000,
          });
        }
      } catch {
        // Silent fail on transient offline
      }
    };

    // Check after 10s and then periodically every 5 minutes
    const initialTimer = setTimeout(checkVersion, 10000);
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return null;
}
