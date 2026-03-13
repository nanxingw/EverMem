#!/usr/bin/env node
/**
 * search-memories.mjs — Search EverMemOS for stored memories
 *
 * Usage:
 *   node search-memories.mjs --query "your query" [--method hybrid] [--top-k 10]
 */

import { parseArgs } from "node:util";
import { loadConfig } from "../src/config.js";
import { searchMemories } from "../src/evermemos.js";

const { values: args } = parseArgs({
  options: {
    query:       { type: "string" },
    "user-id":   { type: "string" },
    method:      { type: "string" },
    "top-k":     { type: "string" },
    types:       { type: "string" },
    "group-ids": { type: "string" },
    json:        { type: "boolean", default: false },
    help:        { type: "boolean", short: "h" },
  },
  allowPositionals: true,
  strict: false,
});

if (args.help || !args.query) {
  console.log(`Usage: node search-memories.mjs --query <text> [options]

Options:
  --user-id <id>       User ID (default: from config)
  --method <method>    keyword | vector | hybrid | agentic (default: hybrid)
  --top-k <n>          Number of results (default: 10)
  --types <list>       Comma-separated: profile, episodic_memory, event_log, foresight
  --group-ids <list>   Comma-separated group IDs to filter
  --json               Output raw JSON response`);
  process.exit(args.help ? 0 : 1);
}

const config = await loadConfig();
const apiKey = process.env.EVERMEMOS_API_KEY ?? config.apiKey;

if (!apiKey) {
  console.error("Error: EVERMEMOS_API_KEY not set. Run `evermem setup` first.");
  process.exit(1);
}

const userId = args["user-id"] ?? config.userId ?? "evermem-user";
const method = args.method ?? "hybrid";
const topK = args["top-k"] ? parseInt(args["top-k"], 10) : 10;

const options = {
  userId,
  method,
  topK,
  types: args.types ? args.types.split(",").map((t) => t.trim()) : undefined,
  groupIds: args["group-ids"] ? args["group-ids"].split(",").map((g) => g.trim()) : undefined,
};

const data = await searchMemories(args.query, options, apiKey).catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

if (args.json) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// ── Formatted output ─────────────────────────────────────────────────────────

const result = data.result;
if (!result) { console.log("No results returned."); process.exit(0); }

const memories = result.memories ?? [];
const profiles = result.profiles ?? [];
const totalCount = result.total_count ?? (memories.length + profiles.length);

console.log(`\n=== EverMem Search Results ===`);
console.log(`Query: "${args.query}" | Method: ${method} | Found: ${totalCount}\n`);

if (profiles.length > 0) {
  console.log("── Profile Memories ──");
  for (const p of profiles) {
    const score = p.score ? ` (score: ${p.score.toFixed(2)})` : "";
    console.log(`  [${p.item_type ?? "profile"}] ${p.category ?? p.trait_name ?? "—"}: ${p.description}${score}`);
  }
  console.log();
}

if (memories.length > 0) {
  console.log("── Episodic / Event Memories ──");
  for (const m of memories) {
    const score = m.score ? ` (score: ${m.score.toFixed(2)})` : "";
    const time = m.timestamp ? ` @ ${m.timestamp}` : "";
    console.log(`  [${m.memory_type ?? "memory"}]${time}${score}`);
    console.log(`    ${m.summary ?? m.content ?? "—"}`);
  }
  console.log();
}

if (memories.length === 0 && profiles.length === 0) {
  console.log("  No matching memories found.");
}

if (result.metadata) {
  const { episodic_count, profile_count, latency_ms } = result.metadata;
  const parts = [];
  if (episodic_count != null) parts.push(`episodic: ${episodic_count}`);
  if (profile_count != null) parts.push(`profile: ${profile_count}`);
  if (latency_ms != null) parts.push(`latency: ${latency_ms}ms`);
  if (parts.length > 0) console.log(`── Metadata: ${parts.join(", ")} ──\n`);
}
