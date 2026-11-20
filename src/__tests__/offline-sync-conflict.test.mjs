import test from "node:test";
import assert from "node:assert/strict";
import {
  enqueueOfflineMutation,
  flushOfflineOutbox,
  getPendingOutboxCount,
  clearOfflineCaches,
  getDeadLetterQueue,
  getDeadLetterQueueCount,
  retryDlqItem,
  discardDlqItem,
  getSyncConflicts,
  getSyncConflictCount,
  flagSyncConflict,
  resolveSyncConflict,
  computeVersionHash,
  getOfflineSyncStatus,
} from "../lib/offline-sync.ts";

test("Epic 3: Version hash generation produces deterministic hashes", () => {
  const payload1 = { enrollment_id: "e1", mot_score: 85, subject_id: "s1" };
  const payload2 = { enrollment_id: "e1", mot_score: 85, subject_id: "s1" };
  const payload3 = { enrollment_id: "e1", mot_score: 90, subject_id: "s1" };

  const hash1 = computeVersionHash(payload1);
  const hash2 = computeVersionHash(payload2);
  const hash3 = computeVersionHash(payload3);

  assert.equal(hash1, hash2, "Identical payloads must produce identical hashes");
  assert.notEqual(hash1, hash3, "Different payloads must produce different hashes");
  assert.ok(hash1.startsWith("v_"), "Hash must follow v_ format");
});

test("Epic 3: Dead-Letter Queue (DLQ) moves 4xx mutations and prevents queue blocking", async () => {
  await clearOfflineCaches();

  // 1. Enqueue 3 mutations:
  // Item 1: Will fail with 401 Unauthorized
  await enqueueOfflineMutation({
    url: "/api/marks",
    method: "POST",
    mutation_type: "marks:save",
    body: { enrollment_id: "e1", score: 85 },
    label: "Failing 401 auth mutation",
  });

  // Item 2: Will succeed with 200 OK
  await enqueueOfflineMutation({
    url: "/api/attendance",
    method: "POST",
    mutation_type: "attendance:save",
    body: { class_id: "c1", status: "present" },
    label: "Successful attendance mutation",
  });

  // Item 3: Will fail with 422 Unprocessable
  await enqueueOfflineMutation({
    url: "/api/students",
    method: "POST",
    mutation_type: "students:update",
    body: { student_id: "s1", name: "" },
    label: "Failing 422 validation mutation",
  });

  assert.equal(await getPendingOutboxCount(), 3);
  assert.equal(await getDeadLetterQueueCount(), 0);

  const mockFetcher = async (url, init) => {
    if (url === "/api/marks") {
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === "/api/attendance") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === "/api/students") {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const flushResult = await flushOfflineOutbox({ fetcher: mockFetcher });

  // Verify:
  // - 1 mutation synced (attendance)
  // - 2 mutations failed and moved to DLQ (marks & students)
  // - 0 remaining in pending outbox (queue was NOT blocked by item 1!)
  assert.equal(flushResult.synced, 1, "Successful mutation must sync");
  assert.equal(flushResult.failed, 2, "4xx errors must be counted as failed");
  assert.equal(flushResult.remaining, 0, "Outbox must be empty because 4xx errors moved to DLQ");

  const dlqItems = await getDeadLetterQueue();
  assert.equal(dlqItems.length, 2, "Both 4xx mutations must be in DLQ");
  assert.equal(dlqItems[0].status, "dlq");
  assert.ok(dlqItems[0].lastError?.includes("Session expired"));
  assert.ok(dlqItems[1].lastError?.includes("Name is required"));

  // Verify retry and discard DLQ operations
  const itemToRetry = dlqItems[0].id;
  const retried = await retryDlqItem(itemToRetry);
  assert.ok(retried, "Item must be retried");
  assert.equal(await getPendingOutboxCount(), 1, "Retried item moves back to outbox");
  assert.equal(await getDeadLetterQueueCount(), 1, "DLQ count decrements");

  const itemToDiscard = dlqItems[1].id;
  const discarded = await discardDlqItem(itemToDiscard);
  assert.ok(discarded, "Item must be discarded");
  assert.equal(await getDeadLetterQueueCount(), 0, "DLQ now empty");
});

test("Epic 3: Conflict detection flags server timestamp mismatch and resolves cleanly", async () => {
  await clearOfflineCaches();

  const baseServerTimestamp = "2026-11-20T10:00:00.000Z";
  const newerServerTimestamp = "2026-11-20T11:30:00.000Z";

  // Enqueue mutation with base_server_updated_at
  const queued = await enqueueOfflineMutation({
    url: "/api/marks",
    method: "POST",
    mutation_type: "marks:save",
    entity_type: "circular_marks",
    entity_id: "mark-row-1",
    base_server_updated_at: baseServerTimestamp,
    body: { enrollment_id: "e1", mot_score: 85 },
    label: "Teacher offline edit to 85",
  });

  const mockFetcher = async (url, init) => {
    // 1. Timestamp validation endpoint mock
    if (url === "/api/sync/validate-timestamps") {
      return new Response(
        JSON.stringify({
          success: true,
          validations: [
            {
              id: queued.id,
              entity_type: "circular_marks",
              entity_id: "mark-row-1",
              has_conflict: true, // Server has newer timestamp!
              server_updated_at: newerServerTimestamp,
              server_data: { enrollment_id: "e1", mot_score: 92, updated_by: "DOS" },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url === "/api/marks") {
      // Overwrite request
      const hasOverride = init.headers?.["x-conflict-override"] === "true";
      if (hasOverride) {
        return new Response(JSON.stringify({ success: true, overridden: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Conflict" }), { status: 409 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  const result = await flushOfflineOutbox({ fetcher: mockFetcher });

  assert.equal(result.conflicts, 1, "Conflict must be detected");
  assert.equal(result.synced, 0, "Conflicting item must not sync automatically");
  assert.equal(await getPendingOutboxCount(), 0, "Item moved from pending outbox into conflicts");

  const conflicts = await getSyncConflicts();
  assert.equal(conflicts.length, 1, "Conflict store must have 1 flagged conflict");
  assert.equal(conflicts[0].entity_id, "mark-row-1");
  assert.equal(conflicts[0].local_data.mot_score, 85);
  assert.equal(conflicts[0].server_data.mot_score, 92);

  // Test resolution: 'keep_server'
  await resolveSyncConflict(conflicts[0].id, "keep_server");
  assert.equal(await getSyncConflictCount(), 0, "Conflict must be resolved and removed");

  // Test resolution: 'overwrite_with_mine'
  await flagSyncConflict({
    id: "conflict-2",
    mutation: {
      id: "mut-2",
      url: "/api/marks",
      method: "POST",
      body: { enrollment_id: "e2", mot_score: 88 },
      timestamp: Date.now(),
      createdAt: Date.now(),
      retries: 0,
      status: "conflict",
    },
    entity_type: "circular_marks",
    entity_id: "mark-row-2",
    local_data: { mot_score: 88 },
    server_data: { mot_score: 90 },
    local_timestamp: Date.now(),
    server_updated_at: newerServerTimestamp,
    flagged_at: Date.now(),
    status: "unresolved",
  });

  assert.equal(await getSyncConflictCount(), 1);
  await resolveSyncConflict("conflict-2", "overwrite_with_mine", { fetcher: mockFetcher });
  assert.equal(await getSyncConflictCount(), 0, "Conflict must be resolved after overwrite");
});

test("Epic 3: OfflineSyncStatusSnapshot reflects pending, DLQ, and conflict counts", async () => {
  await clearOfflineCaches();

  const status1 = await getOfflineSyncStatus();
  assert.equal(status1.pendingCount, 0);
  assert.equal(status1.dlqCount, 0);
  assert.equal(status1.conflictCount, 0);

  await enqueueOfflineMutation({ url: "/api/test", method: "POST", body: {} });
  const status2 = await getOfflineSyncStatus();
  assert.equal(status2.pendingCount, 1);
});
