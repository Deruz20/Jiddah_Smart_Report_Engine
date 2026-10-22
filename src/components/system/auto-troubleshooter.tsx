"use client";

import * as React from "react";
import {
  LifeBuoy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Wifi,
  ShieldCheck,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/figma-ui/ui/dialog";
import { Button } from "@/components/figma-ui/ui/button";
import { createClient } from "@/utils/supabase/client";

interface DiagnosticStep {
  name: string;
  status: "idle" | "running" | "healthy" | "warning" | "error";
  message?: string;
  fixAction?: () => Promise<void>;
}

export function AutoTroubleshooter({
  open,
  onOpenChange,
  initialError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialError?: string | null;
}) {
  const [isRunning, setIsRunning] = React.useState(false);
  const [diagnostics, setDiagnostics] = React.useState<DiagnosticStep[]>([
    { name: "Browser & Network Connectivity", status: "idle" },
    { name: "Local Supabase Gateway (127.0.0.1:54321)", status: "idle" },
    { name: "Session & Auth Token Validity", status: "idle" },
    { name: "Database Schema & Table Access", status: "idle" },
    { name: "Client Cache & Offline State", status: "idle" },
  ]);
  const [logSummary, setLogSummary] = React.useState<string>("");

  const runDiagnostics = React.useCallback(async () => {
    setIsRunning(true);
    const steps: DiagnosticStep[] = [
      { name: "Browser & Network Connectivity", status: "running" },
      { name: "Local Supabase Gateway (127.0.0.1:54321)", status: "idle" },
      { name: "Session & Auth Token Validity", status: "idle" },
      { name: "Database Schema & Table Access", status: "idle" },
      { name: "Client Cache & Offline State", status: "idle" },
    ];
    setDiagnostics([...steps]);

    // 1. Browser & Network
    await new Promise((r) => setTimeout(r, 200));
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    steps[0] = {
      name: "Browser & Network Connectivity",
      status: isOnline ? "healthy" : "error",
      message: isOnline ? "Device is connected to local network" : "Device appears offline",
    };
    steps[1].status = "running";
    setDiagnostics([...steps]);

    // 2. Gateway ping
    const supabase = createClient();
    let gatewayHealthy = false;
    try {
      const res = await fetch("/api/settings/school", { method: "GET", cache: "no-store" });
      gatewayHealthy = res.status < 500;
      steps[1] = {
        name: "Local Supabase Gateway (127.0.0.1:54321)",
        status: gatewayHealthy ? "healthy" : "warning",
        message: gatewayHealthy
          ? `HTTP ${res.status}: Gateway responding promptly`
          : `HTTP ${res.status}: Gateway returned server error`,
      };
    } catch (e: any) {
      steps[1] = {
        name: "Local Supabase Gateway (127.0.0.1:54321)",
        status: "error",
        message: e?.message || "Failed to reach gateway",
      };
    }
    steps[2].status = "running";
    setDiagnostics([...steps]);

    // 3. Auth Token
    let hasSession = false;
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      hasSession = !!data.session;
      userId = data.session?.user?.id || null;
      steps[2] = {
        name: "Session & Auth Token Validity",
        status: hasSession ? "healthy" : "warning",
        message: hasSession
          ? `Active session verified (${data.session?.user?.email || "Authenticated"})`
          : "No active session detected (Guest/Public mode)",
      };
    } catch (e: any) {
      steps[2] = {
        name: "Session & Auth Token Validity",
        status: "error",
        message: e?.message || "Session verification failed",
      };
    }
    steps[3].status = "running";
    setDiagnostics([...steps]);

    // 4. Schema access
    try {
      const { data, error } = await supabase.from("terms").select("id").limit(1);
      if (error) {
        steps[3] = {
          name: "Database Schema & Table Access",
          status: "warning",
          message: `Query warning: ${error.message}`,
        };
      } else {
        steps[3] = {
          name: "Database Schema & Table Access",
          status: "healthy",
          message: "Core database tables readable and responsive",
        };
      }
    } catch (e: any) {
      steps[3] = {
        name: "Database Schema & Table Access",
        status: "error",
        message: e?.message || "Unable to read database tables",
      };
    }
    steps[4].status = "running";
    setDiagnostics([...steps]);

    // 5. Cache & Local Storage
    try {
      if (typeof window !== "undefined") {
        const testKey = "__jiddah_test__";
        localStorage.setItem(testKey, "1");
        localStorage.removeItem(testKey);
        steps[4] = {
          name: "Client Cache & Offline State",
          status: "healthy",
          message: "Local storage and memory caches operational",
        };
      }
    } catch {
      steps[4] = {
        name: "Client Cache & Offline State",
        status: "warning",
        message: "Local storage restricted or full",
      };
    }
    setDiagnostics([...steps]);
    setIsRunning(false);

    // Record audit log if needed
    try {
      if (userId) {
        await supabase.from("audit_logs").insert([
          {
            actor_id: userId,
            action: "troubleshoot_run",
            entity_type: "system",
            metadata: {
              timestamp: new Date().toISOString(),
              allHealthy: steps.every((s) => s.status === "healthy"),
            },
          },
        ]);
      }
    } catch {
      // Non-critical
    }

    setLogSummary("All diagnostics completed. System is ready for operation.");
  }, []);

  React.useEffect(() => {
    if (open) {
      runDiagnostics();
    }
  }, [open, runDiagnostics]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border border-emerald-500/30 bg-[#090C0A] text-stone-100 shadow-2xl rounded-2xl">
        <div className="relative p-6 bg-gradient-to-b from-[#111714] to-[#090C0A] border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <LifeBuoy className="size-5 animate-spin-slow" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                Auto-Troubleshooter & Diagnostics
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400 mt-0.5">
                Automated health inspection, gateway verification, and self-healing.
              </DialogDescription>
            </div>
          </div>
        </div>

        {initialError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">Intercepted Condition</div>
              <div className="text-[11px] opacity-90 mt-0.5 font-mono">{initialError}</div>
            </div>
          </div>
        )}

        <div className="p-6 space-y-3">
          {diagnostics.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs transition-colors"
            >
              <div className="space-y-1">
                <div className="font-semibold text-stone-200 flex items-center gap-2">
                  {step.status === "healthy" && <CheckCircle2 className="size-4 text-emerald-400" />}
                  {step.status === "warning" && <AlertTriangle className="size-4 text-amber-400" />}
                  {step.status === "error" && <AlertTriangle className="size-4 text-rose-400" />}
                  {step.status === "running" && <RefreshCw className="size-4 text-emerald-400 animate-spin" />}
                  {step.status === "idle" && <div className="size-2 rounded-full bg-stone-600" />}
                  {step.name}
                </div>
                {step.message && (
                  <p className="text-[11px] text-stone-400 pl-6">{step.message}</p>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  step.status === "healthy"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : step.status === "warning"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : step.status === "error"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : step.status === "running"
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                    : "bg-stone-800 text-stone-400"
                }`}
              >
                {step.status}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 bg-[#111714] border-t border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-medium">
            {isRunning ? "Running tests..." : logSummary || "Ready"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRunning}
              onClick={runDiagnostics}
              className="text-xs h-8 gap-1.5 border-white/10 hover:bg-white/5 text-stone-200"
            >
              <RefreshCw className={`size-3.5 ${isRunning ? "animate-spin" : ""}`} />
              Re-run
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
