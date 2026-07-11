import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  completeBackstageEntry,
  deleteBackstageEntryById,
} from "../src/lib/backstage-management.ts";
import { readBackstageFeed } from "../src/lib/backstage-retrieval.ts";
import {
  listEntries,
  saveEntry,
  setEntryCompletion,
} from "../src/lib/backstage-store.ts";
import { PASSCODE_HEADER } from "../src/lib/passcode.ts";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATION_0001_SQL = readFileSync(
  join(here, "..", "migrations", "0001_create_backstage_entries.sql"),
  "utf8",
);
const MIGRATION_0002_SQL = readFileSync(
  join(here, "..", "migrations", "0002_add_backstage_entry_completion.sql"),
  "utf8",
);

const PASSCODE = "open-the-backstage-door";
const COMPLETED_AT = "2026-07-11T20:15:30.000Z";
const ROUTE_URL = "https://demo.example/api/backstage/entries/";

// Use real SQLite and the committed migrations through the same narrow D1
// surface production consumes. Each test owns and closes its database.
function createEntryStore(t) {
  const db = new DatabaseSync(":memory:");
  db.exec(MIGRATION_0001_SQL);
  db.exec(MIGRATION_0002_SQL);
  t.after(() => db.close());

  return {
    prepare(sql) {
      const statement = db.prepare(sql);
      const withParams = (params) => ({
        async run() {
          return statement.run(...params);
        },
        async all() {
          return { results: statement.all(...params) };
        },
        bind(...more) {
          return withParams([...params, ...more]);
        },
      });
      return withParams([]);
    },
  };
}

const entry = (overrides = {}) => ({
  type: "reference",
  url: "https://example.com/reference",
  text: "a backstage note",
  submittedAt: "2026-07-11T18:00:00.000Z",
  ...overrides,
});

function managementRequest(id, passcode = PASSCODE, method = "PATCH") {
  const headers = {};
  if (passcode !== undefined) headers[PASSCODE_HEADER] = passcode;
  return new Request(`${ROUTE_URL}${id ?? ""}`, { method, headers });
}

const routeEnv = (store, configured = PASSCODE) => ({
  DEMO_PASSCODE: configured,
  ...(store === undefined ? {} : { BACKSTAGE_DB: store }),
});

async function seedThree(store) {
  await saveEntry(
    store,
    entry({ text: "first", url: "https://example.com/1" }),
  );
  await saveEntry(
    store,
    entry({ type: "feedback", text: "second", url: "https://example.com/2" }),
  );
  await saveEntry(
    store,
    entry({ text: "third", url: "https://example.com/3" }),
  );
  return listEntries(store);
}

async function feed(store) {
  const response = await readBackstageFeed({
    request: new Request("https://demo.example/api/backstage/feed", {
      headers: { [PASSCODE_HEADER]: PASSCODE },
    }),
    configured: PASSCODE,
    db: store,
  });
  return { response, body: await response.json() };
}

test("valid-passcode PATCH completes exactly the addressed entry and the feed reflects it", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);

  const response = await completeBackstageEntry(
    managementRequest("2"),
    "2",
    routeEnv(store),
    () => new Date(COMPLETED_AT),
  );

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assert.deepStrictEqual(await response.json(), {
    boundary: "backstage_management",
    entry: { id: 2, completedAt: COMPLETED_AT },
  });

  const after = await listEntries(store);
  assert.deepStrictEqual(after, [
    before[0],
    { ...before[1], completedAt: COMPLETED_AT },
    before[2],
  ]);

  const read = await feed(store);
  assert.equal(read.response.status, 200);
  assert.deepStrictEqual(read.body.entries, after);
});

test("valid-passcode DELETE removes exactly the addressed entry and the feed reflects it", async (t) => {
  const store = createEntryStore(t);
  await seedThree(store);
  await setEntryCompletion(store, 3, COMPLETED_AT);
  const before = await listEntries(store);

  const response = await deleteBackstageEntryById(
    managementRequest("2", PASSCODE, "DELETE"),
    "2",
    routeEnv(store),
  );

  assert.equal(response.status, 200);
  assert.deepStrictEqual(await response.json(), {
    boundary: "backstage_management",
    deleted: { id: 2 },
  });
  const after = await listEntries(store);
  assert.deepStrictEqual(after, [before[0], before[2]]);

  const read = await feed(store);
  assert.equal(read.response.status, 200);
  assert.equal(read.body.count, 2);
  assert.deepStrictEqual(read.body.entries, after);
});

test("wrong-passcode PATCH is 403, does not call the clock, and changes nothing", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);
  let clockCalls = 0;

  const response = await completeBackstageEntry(
    managementRequest("2", "wrong-code"),
    "2",
    routeEnv(store),
    () => {
      clockCalls += 1;
      return new Date(COMPLETED_AT);
    },
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "passcode_mismatch");
  assert.equal(clockCalls, 0);
  assert.deepStrictEqual(await listEntries(store), before);
});

test("wrong-passcode DELETE is 403 and changes nothing", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);

  const response = await deleteBackstageEntryById(
    managementRequest("2", "wrong-code", "DELETE"),
    "2",
    routeEnv(store),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "passcode_mismatch");
  assert.deepStrictEqual(await listEntries(store), before);
});

test("the passcode gate runs before id validation", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);

  const response = await completeBackstageEntry(
    managementRequest("not-an-id", "wrong-code"),
    "not-an-id",
    routeEnv(store),
  );

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, "passcode_mismatch");
  assert.equal("boundary" in body, false);
  assert.deepStrictEqual(await listEntries(store), before);
});

test("authorized PATCH of an unknown id is a distinct 404 no-op", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);

  const response = await completeBackstageEntry(
    managementRequest("999"),
    "999",
    routeEnv(store),
    () => new Date(COMPLETED_AT),
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "entry_not_found");
  assert.deepStrictEqual(await listEntries(store), before);
});

test("authorized DELETE of an unknown id is a distinct 404 no-op", async (t) => {
  const store = createEntryStore(t);
  const before = await seedThree(store);

  const response = await deleteBackstageEntryById(
    managementRequest("999", PASSCODE, "DELETE"),
    "999",
    routeEnv(store),
  );

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "entry_not_found");
  assert.deepStrictEqual(await listEntries(store), before);
});

test("authorized malformed ids are 400 no-ops before clock or store access", async () => {
  const malformedIds = [
    undefined,
    "",
    "0",
    "-1",
    "1.5",
    "1e2",
    "01",
    "9007199254740992",
  ];

  for (const rawId of malformedIds) {
    let clockCalls = 0;
    let prepareCalls = 0;
    const untouchedStore = {
      prepare() {
        prepareCalls += 1;
        throw new Error("the store must not be reached");
      },
    };
    const response = await completeBackstageEntry(
      managementRequest(rawId),
      rawId,
      routeEnv(untouchedStore),
      () => {
        clockCalls += 1;
        return new Date(COMPLETED_AT);
      },
    );

    assert.equal(response.status, 400, `raw id ${String(rawId)}`);
    assert.equal((await response.json()).error, "invalid_entry_id");
    assert.equal(clockCalls, 0);
    assert.equal(prepareCalls, 0);
  }
});

test("a missing store is a safe 500 after valid authorization and id parsing", async () => {
  const response = await completeBackstageEntry(
    managementRequest("1"),
    "1",
    routeEnv(undefined),
  );

  assert.equal(response.status, 500);
  assert.deepStrictEqual(await response.json(), {
    boundary: "backstage_management",
    error: "store_misconfigured",
    detail: "the backstage entry store is not configured",
  });
});

function failingStore(sensitiveMessage) {
  return {
    prepare() {
      return {
        bind() {
          return this;
        },
        async run() {
          throw new Error(sensitiveMessage);
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

test("completion store failures return a safe operation-specific 500", async () => {
  const sensitiveMessage = "SQLITE_SECRET_COMPLETION_DETAILS";
  const response = await completeBackstageEntry(
    managementRequest("1"),
    "1",
    routeEnv(failingStore(sensitiveMessage)),
    () => new Date(COMPLETED_AT),
  );
  const text = await response.text();

  assert.equal(response.status, 500);
  assert.match(text, /entry_completion_failed/);
  assert.equal(text.includes(sensitiveMessage), false);
});

test("delete store failures return a safe operation-specific 500", async () => {
  const sensitiveMessage = "SQLITE_SECRET_DELETE_DETAILS";
  const response = await deleteBackstageEntryById(
    managementRequest("1", PASSCODE, "DELETE"),
    "1",
    routeEnv(failingStore(sensitiveMessage)),
  );
  const text = await response.text();

  assert.equal(response.status, 500);
  assert.match(text, /entry_delete_failed/);
  assert.equal(text.includes(sensitiveMessage), false);
});
