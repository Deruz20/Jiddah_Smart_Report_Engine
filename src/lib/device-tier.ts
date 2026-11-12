"use client";

import { useEffect, useState } from "react";

export type DeviceTier = "high" | "lite";

export interface DeviceCapabilitySnapshot {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
  prefersReducedMotion?: boolean;
}

const STORAGE_OVERRIDE_KEY = "jiddah_device_tier_override";

/**
 * Pure heuristic that classifies a browser device into Flagship ("high")
 * or Legacy/Budget ("lite") rendering tier using hardware signals.
 */
export function detectDeviceTier(snapshot?: DeviceCapabilitySnapshot): DeviceTier {
  if (snapshot) {
    if (snapshot.prefersReducedMotion || snapshot.saveData) {
      return "lite";
    }
    if (
      typeof snapshot.deviceMemory === "number" &&
      snapshot.deviceMemory > 0 &&
      snapshot.deviceMemory <= 3
    ) {
      return "lite";
    }
    if (
      typeof snapshot.hardwareConcurrency === "number" &&
      snapshot.hardwareConcurrency > 0 &&
      snapshot.hardwareConcurrency <= 4
    ) {
      return "lite";
    }
    return "high";
  }

  if (typeof window === "undefined") {
    return "high";
  }

  try {
    const override = window.localStorage.getItem(STORAGE_OVERRIDE_KEY);
    if (override === "high" || override === "lite") {
      return override;
    }
  } catch {
    // Ignore storage restriction
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const saveData = Boolean(nav.connection?.saveData);
  const effectiveType = nav.connection?.effectiveType;
  const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

  if (prefersReducedMotion || saveData || slowConnection) {
    return "lite";
  }

  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 3) {
    return "lite";
  }

  if (
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency > 0 &&
    nav.hardwareConcurrency <= 4
  ) {
    return "lite";
  }

  return "high";
}

export function applyDeviceTierToDom(tier?: DeviceTier): DeviceTier {
  const resolved = tier ?? detectDeviceTier();
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-device-tier", resolved);
  }
  return resolved;
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(() => applyDeviceTierToDom());

  useEffect(() => {
    const resolved = applyDeviceTierToDom();
    setTier(resolved);

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setTier(applyDeviceTierToDom());
    };

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", handleChange);
      return () => motionQuery.removeEventListener("change", handleChange);
    }
    return undefined;
  }, []);

  return tier;
}

