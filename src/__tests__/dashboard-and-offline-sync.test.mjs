import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  resolveActiveTermAndMatchingIds,
  filterMarksByMatchingTerms,
  buildClassStatuses,
  computeExamBreakdown,
  buildDashboardAlerts,
  resolveActivityRows,
} from "../lib/dashboard-telemetry.ts";
import { detectDeviceTier } from "../lib/device-tier.ts";
import {
  enqueueOfflineMutation,
  flushOfflineOutbox,
  getPendingOutboxCount,
  clearOfflineCaches,
  submitMutationWithOfflineFallback,
} from "../lib/offline-sync.ts";

describe("Workstream 1: Real-Time Dashboard Telemetry", () => {
  test("resolveActiveTermAndMatchingIds handles is_active/is_current and groups canonical term rows", () => {
    const terms = [
      { id: "t-old", name: "Term 2", academic_year: 2025, is_current: false },
      { id: "t-act-1", label: "Term 3", academic_year: 2026, is_current: true },
      { id: "t-act-dup", name: " term  3 ", academic_year: "2026", is_current: false },
    ];
    const { activeTerm, matchingTermIds } = resolveActiveTermAndMatchingIds(terms);
    assert.equal(activeTerm?.id, "t-act-1");
    assert.ok(matchingTermIds.has("t-act-1"));
    assert.ok(matchingTermIds.has("t-act-dup"));
    assert.ok(!matchingTermIds.has("t-old"));
  });

  test("buildClassStatuses & computeExamBreakdown accurately count secular & theology marks without dummy values", () => {
    const enrollments = [
      { id: "e1", circular_class_id: "c1", theology_class_id: "th1" },
      { id: "e2", circular_class_id: "c1", theology_class_id: "th1" },
    ];
    const circularClasses = [{ id: "c1", class_name: "P.5 North", section: "Primary" }];
    const theologyClasses = [
      { id: "th1", class_name_english: "Ibadat Level 2", level: "Primary" },
    ];
    const circularSubjects = [
      { id: "cs1", section: "Primary" },
      { id: "cs2", section: "Primary" },
    ];
    const theologySubjects = [{ id: "ts1", level: "Primary" }];

    const circularMarks = [
      { id: "m1", enrollment_id: "e1", subject_id: "cs1", term_id: "t1", bot_score: 70, mot_score: 80, eot_score: 90 },
      { id: "m2", enrollment_id: "e1", subject_id: "cs2", term_id: "t1", bot_score: 60, mot_score: 70, eot_score: null },
      { id: "m3", enrollment_id: "e2", subject_id: "cs1", term_id: "t1", bot_score: null, mot_score: null, eot_score: null }, // empty row should not count
      { id: "m4", enrollment_id: "e2", subject_id: "cs2", term_id: "t-other", bot_score: 55, mot_score: 60, eot_score: 65 },
    ];
    const theologyMarks = [
      { id: "tm1", enrollment_id: "e1", subject_id: "ts1", term_id: "t1", mot_score: 85, eot_score: 95 },
      { id: "tm2", enrollment_id: "e2", subject_id: "ts1", term_id: "t1", mot_score: 105, eot_score: null }, // outlier > 100
    ];

    const matchingTermIds = new Set(["t1"]);
    const scopedCirc = filterMarksByMatchingTerms(circularMarks, matchingTermIds);
    const scopedTheo = filterMarksByMatchingTerms(theologyMarks, matchingTermIds);

    const { secularClassStatuses, theologyClassStatuses, classStatuses } = buildClassStatuses({
      department: "both",
      enrollments,
      circularClasses,
      theologyClasses,
      circularMarks: scopedCirc,
      theologyMarks: scopedTheo,
      circularSubjects,
      theologySubjects,
    });

    assert.equal(secularClassStatuses.length, 1);
    assert.equal(secularClassStatuses[0].marksEntered, 2);
    assert.equal(secularClassStatuses[0].totalRequired, 4);
    assert.equal(secularClassStatuses[0].percent, 50);

    assert.equal(theologyClassStatuses.length, 1);
    assert.equal(theologyClassStatuses[0].marksEntered, 2);
    assert.equal(theologyClassStatuses[0].anomalies, 1);
    assert.equal(classStatuses.length, 2, "Both secular & theology tracks included");

    const breakdown = computeExamBreakdown({
      department: "both",
      circularMarks: scopedCirc,
      theologyMarks: scopedTheo,
      totalRequiredSecular: 4,
      totalRequiredTheology: 2,
    });

    assert.equal(breakdown.bot.entered, 2);
    assert.equal(breakdown.bot.averageScore, 65);
    assert.equal(breakdown.mot.entered, 3); // 80, 70, 85 (105 excluded from clean mean)
    assert.equal(breakdown.eot.entered, 2); // 90, 95
    assert.equal(breakdown.progressionDelta, 27.5); // 92.5 - 65
  });

  test("buildDashboardAlerts & resolveActivityRows emit live conditions and human names", () => {
    const alerts = buildDashboardAlerts({
      storedNotifications: [],
      classStatuses: [
        {
          className: "P.1 South",
          totalStudents: 25,
          marksEntered: 10,
          totalRequired: 100,
          missingMarks: 90,
          stage: "marks_in",
          stageLabel: "Marks In Progress",
          percent: 10,
          anomalies: 2,
        },
      ],
      examLocks: { bot: true, mot: false, eot: false },
    });

    assert.ok(alerts.some((a) => a.id === "live-outliers" && a.title.includes("2")));
    assert.ok(alerts.some((a) => a.id === "live-low-completion"));
    assert.ok(alerts.some((a) => a.id === "live-exam-locks" && a.title.includes("BOT")));

    const activity = resolveActivityRows(
      [
        { id: "1", action: "school_customization_config", user_id: "u1", created_at: "2026-01-01T00:00:00Z" },
        { id: "2", action: "Entered Marks", user_id: "u1", created_at: "2026-01-01T01:00:00Z" },
      ],
      [{ id: "t1", auth_user_id: "u1", name: "Ustadh Ibrahim" }]
    );
    assert.equal(activity.length, 1);
    assert.equal(activity[0].user_name, "Ustadh Ibrahim");
  });
});

describe("Workstream 2: Adaptive Hardware Tiering", () => {
  test("detectDeviceTier assigns lite vs high accurately from hardware signals", () => {
    assert.equal(
      detectDeviceTier({ deviceMemory: 2, hardwareConcurrency: 8, saveData: false }),
      "lite"
    );
    assert.equal(
      detectDeviceTier({ deviceMemory: 8, hardwareConcurrency: 4, saveData: false }),
      "lite"
    );
    assert.equal(
      detectDeviceTier({ deviceMemory: 8, hardwareConcurrency: 8, saveData: true }),
      "lite"
    );
    assert.equal(
      detectDeviceTier({ deviceMemory: 8, hardwareConcurrency: 8, prefersReducedMotion: true }),
      "lite"
    );
    assert.equal(
      detectDeviceTier({ deviceMemory: 8, hardwareConcurrency: 8, saveData: false }),
      "high"
    );
  });
});

describe("Workstream 4: Native IndexedDB Outbox Queue & Replay", () => {
  test("queues offline marks mutation and replays cleanly in FIFO order on flush", async () => {
    await clearOfflineCaches();

    await enqueueOfflineMutation({
      url: "/api/marks",
      method: "POST",
      label: "First queued marks write",
      body: { enrollment_id: "e1", score_type: "mot" },
    });
    await enqueueOfflineMutation({
      url: "/api/attendance",
      method: "POST",
      label: "Second queued roll call",
      body: { class_id: "c1", date: "2026-11-12", rows: [{ student_id: "s1", status: "present" }] },
    });

    assert.equal(await getPendingOutboxCount(), 2);

    const replayed = [];
    const mockFetch = async (url, init) => {
      replayed.push({ url, method: init.method });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await flushOfflineOutbox({ fetcher: mockFetch });
    assert.equal(result.synced, 2);
    assert.equal(result.remaining, 0);
    assert.equal(result.failed, 0);
    assert.deepEqual(replayed, [
      { url: "/api/marks", method: "POST" },
      { url: "/api/attendance", method: "POST" },
    ]);
  });

  test("submitMutationWithOfflineFallback queues cleanly when navigator.onLine is false", async () => {
    await clearOfflineCaches();
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: false },
    });

    try {
      const res = await submitMutationWithOfflineFallback({
        url: "/api/circular-marks",
        method: "POST",
        body: { enrollment_id: "e1", subject_id: "sub1", term_id: "t1", mot_score: 88 },
      });
      assert.equal(res.queued, true);
      assert.equal(await getPendingOutboxCount(), 1);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "navigator", originalDescriptor);
      } else {
        delete globalThis.navigator;
      }
      await clearOfflineCaches();
    }
  });
});

describe("Workstream 5: Zero PowerSync WASM & Zero Dummy Dashboard Constants", () => {
  test("no active components or routes import @powersync/* and no +4.2% remains on dashboard", () => {
    const root = process.cwd();
    const walk = (dir) => {
      const out = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
      }
      return out;
    };

    const uiFiles = [
      ...walk(path.join(root, "src/app")),
      ...walk(path.join(root, "src/components")),
    ];

    for (const file of uiFiles) {
      const content = fs.readFileSync(file, "utf8");
      assert.ok(
        !content.includes("@powersync/"),
        `Unexpected @powersync import found in ${path.relative(root, file)}`
      );
    }

    const dashboardContent = fs.readFileSync(
      path.join(root, "src/components/layout/dashboard-content.tsx"),
      "utf8"
    );
    assert.ok(!dashboardContent.includes("+4.2%"), "Hardcoded +4.2% dummy metric must be removed");
  });
});

