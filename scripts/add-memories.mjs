#!/usr/bin/env node
/**
 * add-memories.mjs — Universal memory ingestion entry point
 *
 * Auto-detects installed CLI agents, extracts conversations,
 * and uploads to EverMemOS.
 *
 * Usage:
 *   node add-memories.mjs [--agents claude,codex] [--since <ISO>] [--recent N] [--dry-run]
 */

import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "../src/config.js";
import { detectAgents } from "../src/detector.js";
import { sendMessages } from "../src/evermemos.js";
import { logRun } from "../src/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values: args } = parseArgs({
  options: {
    agents:      { type: "string" },     // comma-separated: claude,codex,kimi,qwen
    since:       { type: "string" },
    recent:      { type: "string" },
    "max-turns": { type: "string" },
    "dry-run":   { type: "boolean", default: false },
    flush:       { type: "boolean", default: false },
    help:        { type: "boolean", short: "h" },
  },
  allowPositionals: true,
  strict: false,
});

if (args.help) {
  console.log(`Usage: node add-memories.mjs [options]

Options:
  --agents <list>   Comma-separated agents to process (default: auto-detect)
  --since <ISO>     Only process sessions newer than this timestamp
  --recent <N>      Process N most recent sessions per agent (default: 5)
  --max-turns <n>   Max conversation turns per session (default: from config)
  --dry-run         Print without sending to API
  --flush           Force immediate EverMem extraction on last message`);
  process.exit(0);
}

const config = await loadConfig();
const apiKey = process.env.EVERMEMOS_API_KEY ?? config.apiKey;

if (!apiKey && !args["dry-run"]) {
  console.error("Error: EVERMEMOS_API_KEY not set. Run `evermem setup` first.");
  process.exit(1);
}

const dryRun = args["dry-run"] ?? false;
const recentN = args.recent ?? "5";
const since = args.since ?? config.lastRun ?? null;
const maxTurns = args["max-turns"] ?? String(config.maxTurnsPerSession ?? 200);

// Determine which agents to process
let agentIds;
if (args.agents) {
  agentIds = args.agents.split(",").map((a) => a.trim());
} else {
  const detected = await detectAgents();
  const enabledSet = new Set(config.agents ?? []);
  agentIds = detected
    .filter((a) => a.detected && (enabledSet.size === 0 || enabledSet.has(a.id)))
    .map((a) => a.id);
}

if (agentIds.length === 0) {
  console.log("No agents detected. Run `evermem setup` to configure.");
  process.exit(0);
}

console.log(`Processing agents: ${agentIds.join(", ")}`);
if (since) console.log(`Since: ${since}`);

// ── Run extraction and ingestion ─────────────────────────────────────────────

async function runExtractScript(agentId) {
  const scriptPath = join(__dirname, `extract-${agentId}.mjs`);
  const scriptArgs = ["--output", "json", "--recent", recentN, "--max-turns", maxTurns];
  if (since) scriptArgs.push("--since", since);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`extract-${agentId} exited ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || "[]"));
      } catch {
        resolve([]);
      }
    });
  });
}

const totalStats = { sessions: 0, messages: 0, errors: 0 };

for (const agentId of agentIds) {
  console.log(`\n── ${agentId.toUpperCase()} ──`);
  let sessions;
  try {
    sessions = await runExtractScript(agentId);
  } catch (err) {
    console.warn(`  Skipping ${agentId}: ${err.message}`);
    continue;
  }

  if (!sessions.length) {
    console.log("  No new sessions.");
    continue;
  }

  for (const session of sessions) {
    const { sessionId, turns } = session;
    if (!turns || turns.length === 0) continue;

    console.log(`  Session: ${sessionId} (${turns.length} messages)`);
    totalStats.sessions++;

    if (dryRun) {
      for (const t of turns) {
        console.log(`    [${t.role}]: ${t.text.slice(0, 80)}...`);
      }
      totalStats.messages += turns.length;
      continue;
    }

    const groupId = `${agentId}_${sessionId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const groupName = `${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Session ${sessionId.slice(0, 8)}`;

    const { sent, errors } = await sendMessages(turns, {
      groupId,
      groupName,
      userId: config.userId ?? "evermem-user",
      agentName: agentId,
      apiKey,
      dryRun,
      onProgress: (sent, total) => {
        process.stdout.write(`\r    Uploading: ${sent}/${total}`);
      },
    });
    process.stdout.write("\n");

    console.log(`    Done: ${sent} sent, ${errors} errors`);
    totalStats.messages += sent;
    totalStats.errors += errors;
  }
}

console.log(`\n✓ Finished: ${totalStats.sessions} sessions, ${totalStats.messages} messages, ${totalStats.errors} errors`);

// Update lastRun timestamp
if (!dryRun) {
  const { updateConfig } = await import("../src/config.js");
  await updateConfig({ lastRun: new Date().toISOString() });

  await logRun({
    agents: agentIds,
    sessions: totalStats.sessions,
    messages: totalStats.messages,
    errors: totalStats.errors,
    since,
  });
}
