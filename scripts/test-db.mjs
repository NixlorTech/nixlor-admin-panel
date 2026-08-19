#!/usr/bin/env node
/**
 * Isolated PostgreSQL for integration tests.
 *
 * Usage:
 *   node scripts/test-db.mjs start   # start Docker or prepare local test DB
 *   node scripts/test-db.mjs stop    # stop Docker container if we started it
 *   node scripts/test-db.mjs run     # start → db push → test → optional stop
 *   node scripts/test-db.mjs url     # print TEST_DATABASE_URL
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
loadEnv({ path: resolve(ROOT, ".env") });
const STATE_FILE = resolve(ROOT, ".test-db-state.json");
const DOCKER_URL =
  "postgresql://nixlor_test:nixlor_test@localhost:5433/nixlor_test?schema=public";
const LOCAL_URL =
  "postgresql://postgres:postgres@localhost:5432/nixlor_test?schema=public";

function loadState() {
  if (!existsSync(STATE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearState() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

function dockerAvailable() {
  const result = spawnSync("docker", ["info"], { stdio: "ignore" });
  return result.status === 0;
}

function dockerComposeUp() {
  execSync("docker compose -f docker-compose.test.yml up -d", {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function dockerComposeDown() {
  execSync("docker compose -f docker-compose.test.yml down -v", {
    cwd: ROOT,
    stdio: "inherit",
  });
}

async function waitForPostgres(url, attempts = 30) {
  const client = new pg.Client({ connectionString: url });
  for (let i = 0; i < attempts; i++) {
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function ensureLocalDatabase(adminUrl, dbName) {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName],
  );
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
  }
  await client.end();
}

async function start() {
  if (process.env.TEST_DATABASE_URL) {
    const ok = await waitForPostgres(process.env.TEST_DATABASE_URL);
    if (!ok) {
      throw new Error(`TEST_DATABASE_URL is set but unreachable`);
    }
    console.log(`Using TEST_DATABASE_URL from environment`);
    return process.env.TEST_DATABASE_URL;
  }

  if (dockerAvailable()) {
    console.log("Starting Docker PostgreSQL (nixlor-test-pg)...");
    dockerComposeUp();
    const ok = await waitForPostgres(DOCKER_URL);
    if (!ok) throw new Error("Docker PostgreSQL did not become ready");
    saveState({ mode: "docker", url: DOCKER_URL });
    console.log(`Test DB ready: ${DOCKER_URL}`);
    return DOCKER_URL;
  }

  console.log("Docker unavailable — using local PostgreSQL on port 5432...");
  const adminCandidates = [
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://postgres@localhost:5432/postgres",
  ];

  let adminUrl = null;
  for (const candidate of adminCandidates) {
    try {
      const c = new pg.Client({ connectionString: candidate });
      await c.connect();
      await c.end();
      adminUrl = candidate;
      break;
    } catch {
      /* try next */
    }
  }

  if (!adminUrl) {
    throw new Error(
      "No test database available. Start Docker Desktop or set TEST_DATABASE_URL.",
    );
  }

  await ensureLocalDatabase(adminUrl, "nixlor_test");
  const ok = await waitForPostgres(LOCAL_URL);
  if (!ok) throw new Error("Local nixlor_test database is not reachable");
  saveState({ mode: "local", url: LOCAL_URL });
  console.log(`Test DB ready: ${LOCAL_URL}`);
  return LOCAL_URL;
}

function stop() {
  const state = loadState();
  if (state.mode === "docker" && dockerAvailable()) {
    console.log("Stopping Docker test database...");
    dockerComposeDown();
  }
  clearState();
  console.log("Test database stopped.");
}

function runTests(url) {
  const env = {
    ...process.env,
    TEST_DATABASE_URL: url,
    DATABASE_URL: url,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
      process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION ??
      "Apply schema to isolated integration test database (nixlor_test on localhost)",
  };
  console.log("\nApplying schema...");
  execSync("npx prisma db push --accept-data-loss", { cwd: ROOT, stdio: "inherit", env });
  console.log("\nRunning integration tests...");
  execSync("npx tsx --test --test-concurrency=1 tests/integration/**/*.test.ts", {
    cwd: ROOT,
    stdio: "inherit",
    env,
  });
}

async function main() {
  const command = process.argv[2] ?? "run";

  if (command === "url") {
    const state = loadState();
    console.log(state.url ?? process.env.TEST_DATABASE_URL ?? DOCKER_URL);
    return;
  }

  if (command === "stop") {
    stop();
    return;
  }

  if (command === "start") {
    await start();
    return;
  }

  if (command === "run") {
    const url = await start();
    try {
      runTests(url);
    } finally {
      /* keep DB running for faster re-runs; use test:db:stop to tear down */
    }
    return;
  }

  throw new Error(`Unknown command: ${command}. Use start|stop|run|url`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
