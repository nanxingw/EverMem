#!/usr/bin/env node
/**
 * extract-claude.mjs — Extract conversations from Claude Code session JSONL logs
 *
 * Log location: ~/.claude/projects/**\/*.jsonl
 * Format: JSONL, one message object per line
 *
 * Filters OUT:
 *   - Messages with type "thinking"
 *   - tool_use / tool_result content blocks
 *   - System messages
 *
 * Usage:
 *   node extract-claude.mjs --since <ISO> [--recent N] [--dry-run] [--output json]
 */

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

const { values: args } = parseArgs({
  options: {
    since:    { type: "string" },         // ISO timestamp: only process files newer than this
    recent:   { type: "string" },         // Process N most recent session files
    project:  { type: "string" },         // Filter by project name pattern
    "max-turns": { type: "string" },
    "dry-run":   { type: "boolean", default: false },
    output:      { type: "string", default: "text" }, // "json" or "text"
    help:        { type: "boolean", short: "h" },
  },
  allowPositionals: true,
  strict: false,
});

if (args.help) {
  console.log(`Usage: node extract-claude.mjs [options]
Options:
  --since <ISO>      Only process files modified after this timestamp
  --recent <N>       Process N most recent session files (default: 5)
  --project <pat>    Filter by project name
  --max-turns <n>    Max conversation turns per session (default: 200)
  --dry-run          Print without sending
  --output json      Output JSON array instead of text`);
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

function extractUserText(obj) {
  if (obj.type !== "user") return null;
  const content = obj.message?.content;
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    // Only text blocks, skip tool_result
    const texts = content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text);
    return texts.join("\n").trim() || null;
  }
  return null;
}

function extractAssistantText(obj) {
  if (obj.type !== "assistant") return null;
  const content = obj.message?.content;
  if (!Array.isArray(content)) return null;
  // Only text blocks, skip tool_use and thinking
  const texts = content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text);
  return texts.join("\n").trim() || null;
}

async function extractSession(filePath) {
  const turns = [];
  const assistantBuffer = new Map();
  let turnCount = 0;
  const sessionId = basename(filePath, ".jsonl");

  await streamJsonl(filePath, (obj) => {
    if (maxTurns > 0 && turnCount >= maxTurns) return true;

    const userText = extractUserText(obj);
    if (userText) {
      // Flush assistant buffer
      for (const [, data] of assistantBuffer) {
        const text = data.texts.join("\n").trim();
        if (text) turns.push({ role: "assistant", text, timestamp: data.timestamp });
      }
      assistantBuffer.clear();
      turns.push({ role: "user", text: userText, timestamp: obj.timestamp });
      turnCount++;
      return;
    }

    const assistantText = extractAssistantText(obj);
    if (assistantText) {
      const msgId = obj.message?.id ?? `anon_${turnCount}`;
      if (!assistantBuffer.has(msgId)) {
        assistantBuffer.set(msgId, { timestamp: obj.timestamp, texts: [] });
      }
      assistantBuffer.get(msgId).texts.push(assistantText);
    }
  });

  // Flush remaining
  for (const [, data] of assistantBuffer) {
    const text = data.texts.join("\n").trim();
    if (text) turns.push({ role: "assistant", text, timestamp: data.timestamp });
  }

  return { agent: "claude", sessionId, filePath, turns };
}

// ── Session Discovery ────────────────────────────────────────────────────────

async function listProjectDirs(projectFilter) {
  try {
    let dirs = await readdir(PROJECTS_DIR);
    if (projectFilter) {
      const lower = projectFilter.toLowerCase();
      dirs = dirs.filter((d) => d.toLowerCase().includes(lower));
    }
    return dirs;
  } catch { return []; }
}

async function listSessionFiles(projectDir) {
  const fullDir = join(PROJECTS_DIR, projectDir);
  try {
    const files = await readdir(fullDir);
    const jsonl = files.filter((f) => f.endsWith(".jsonl"));
    const withStats = await Promise.all(jsonl.map(async (f) => {
      const fullPath = join(fullDir, f);
      try {
        const s = await stat(fullPath);
        return { path: fullPath, mtime: s.mtime.getTime(), size: s.size };
      } catch { return null; }
    }));
    return withStats.filter(Boolean);
  } catch { return []; }
}

async function getRecentSessions(n, projectFilter) {
  const dirs = await listProjectDirs(projectFilter);
  const all = [];
  for (const dir of dirs) {
    const sessions = await listSessionFiles(dir);
    all.push(...sessions);
  }
  all.sort((a, b) => b.mtime - a.mtime);
  // Apply sinceTime filter
  const filtered = sinceTime > 0 ? all.filter((s) => s.mtime > sinceTime) : all;
  return filtered.slice(0, n);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const sessions = await getRecentSessions(recentN, args.project);

  if (sessions.length === 0) {
    if (args.output === "json") {
      console.log(JSON.stringify([]));
    } else {
      console.error("No Claude sessions found.");
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
      console.log(`\n[claude] Session: ${r.sessionId} (${r.turns.length} messages)`);
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
