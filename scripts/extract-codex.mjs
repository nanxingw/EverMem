#!/usr/bin/env node
/**
 * extract-codex.mjs — Extract conversations from OpenAI Codex CLI session logs
 *
 * Log location: ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
 * Format: JSONL per session
 *
 * Filters OUT:
 *   - Tool call messages (function calls, tool invocations)
 *   - Internal reasoning / intermediate steps
 *   - System messages
 *
 * Usage:
 *   node extract-codex.mjs --since <ISO> [--recent N] [--dry-run] [--output json]
 */

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

const SESSIONS_DIR = join(homedir(), ".codex", "sessions");

const { values: args } = parseArgs({
  options: {
    since:       { type: "string" },
    recent:      { type: "string" },
    "max-turns": { type: "string" },
    "dry-run":   { type: "boolean", default: false },
    output:      { type: "string", default: "text" },
    help:        { type: "boolean", short: "h" },
  },
  allowPositionals: true,
  strict: false,
});

if (args.help) {
  console.log(`Usage: node extract-codex.mjs [options]
Options:
  --since <ISO>    Only process files modified after this timestamp
  --recent <N>     Process N most recent session files (default: 5)
  --max-turns <n>  Max turns per session (default: 200)
  --output json    Output JSON array`);
  process.exit(0);
}

const maxTurns = args["max-turns"] ? parseInt(args["max-turns"], 10) : 200;
const sinceTime = args.since ? new Date(args.since).getTime() : 0;
const recentN = args.recent ? parseInt(args.recent, 10) : 5;

// ── JSONL Parsing ────────────────────────────────────────────────────────────

async function streamJsonl(filePath, handler) {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (handler(obj) === true) { rl.close(); stream.destroy(); return; }
    } catch { /* skip */ }
  }
}

/**
 * Codex JSONL format varies by version. We handle two common formats:
 * 1. OpenAI chat format: { role: "user"|"assistant", content: "..." }
 * 2. Codex event format: { type: "message", message: { role, content } }
 */
function parseCodexLine(obj) {
  // Format 1: direct chat message
  if (obj.role && obj.content) {
    return { role: obj.role, content: obj.content, timestamp: obj.timestamp };
  }
  // Format 2: event wrapper
  if (obj.type === "message" && obj.message) {
    return { role: obj.message.role, content: obj.message.content, timestamp: obj.timestamp };
  }
  // Format 3: input/output events
  if (obj.type === "input_text") {
    return { role: "user", content: obj.text, timestamp: obj.timestamp };
  }
  if (obj.type === "output_text") {
    return { role: "assistant", content: obj.text, timestamp: obj.timestamp };
  }
  return null;
}

function extractText(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
  return null;
}

async function extractSession(filePath) {
  const turns = [];
  let turnCount = 0;
  const sessionId = basename(filePath, ".jsonl");

  await streamJsonl(filePath, (obj) => {
    if (maxTurns > 0 && turnCount >= maxTurns) return true;

    const parsed = parseCodexLine(obj);
    if (!parsed) return;

    const { role, content, timestamp } = parsed;
    if (role !== "user" && role !== "assistant") return;

    // Skip tool-related messages
    if (Array.isArray(content)) {
      const hasToolCall = content.some((b) =>
        b.type === "tool_use" || b.type === "tool_call" || b.type === "function_call"
      );
      if (hasToolCall && role === "assistant") return;
    }

    const text = extractText(content);
    if (!text) return;

    turns.push({ role, text, timestamp });
    turnCount++;
  });

  return { agent: "codex", sessionId, filePath, turns };
}

// ── Session Discovery ────────────────────────────────────────────────────────

async function walkDir(dir, depth = 3) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && depth > 0) {
        files.push(...await walkDir(fullPath, depth - 1));
      } else if (entry.isFile() && entry.name.match(/rollout-.*\.jsonl$|\.jsonl$/)) {
        try {
          const s = await stat(fullPath);
          files.push({ path: fullPath, mtime: s.mtime.getTime() });
        } catch { /* skip */ }
      }
    }
  } catch { /* dir not found */ }
  return files;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const allFiles = await walkDir(SESSIONS_DIR);
  allFiles.sort((a, b) => b.mtime - a.mtime);

  const filtered = sinceTime > 0
    ? allFiles.filter((f) => f.mtime > sinceTime)
    : allFiles;

  const sessions = filtered.slice(0, recentN);

  if (sessions.length === 0) {
    if (args.output === "json") {
      console.log(JSON.stringify([]));
    } else {
      console.error("No Codex sessions found.");
    }
    return;
  }

  const results = [];
  for (const session of sessions) {
    const data = await extractSession(session.path);
    if (data.turns.length > 0) results.push(data);
  }

  if (args.output === "json") {
    console.log(JSON.stringify(results));
  } else {
    for (const r of results) {
      console.log(`\n[codex] Session: ${r.sessionId} (${r.turns.length} messages)`);
      for (const t of r.turns) {
        console.log(`  [${t.role}]: ${t.text.slice(0, 100)}...`);
      }
    }
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
