#!/usr/bin/env node
/**
 * extract-cursor.mjs — Extract conversations from Cursor IDE chat sessions
 *
 * Log location: ~/.cursor/chats/<workspace-id>/<session-id>/store.db
 * Format: SQLite database
 *   - meta table:  key=0, value=hex-encoded JSON {agentId, name, createdAt, ...}
 *   - blobs table: mixed JSON (user msgs) + binary protobuf (assistant msgs)
 *
 * Uses Python3's sqlite3 module to correctly handle binary blobs.
 * Python3 is pre-installed on macOS/Linux and available in all target environments.
 *
 * Usage:
 *   node extract-cursor.mjs --since <ISO> [--recent N] [--dry-run] [--output json]
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

const CHATS_DIR = join(homedir(), ".cursor", "chats");

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
  console.log(`Usage: node extract-cursor.mjs [options]
Options:
  --since <ISO>    Only process sessions created after this timestamp
  --recent <N>     Process N most recent sessions (default: 5)
  --max-turns <n>  Max turns per session (default: 200)
  --output json    Output JSON array`);
  process.exit(0);
}

const maxTurns   = args["max-turns"] ? parseInt(args["max-turns"], 10) : 200;
const sinceTime  = args.since ? new Date(args.since).getTime() : 0;
const recentN    = args.recent ? parseInt(args.recent, 10) : 5;
const jsonOutput = args.output === "json";

// ── Python3 extractor ─────────────────────────────────────────────────────────
// Runs an inline Python3 script that reads a store.db and returns JSON to stdout.

const PYTHON_EXTRACTOR = `
import sqlite3, json, sys, re

db_path = sys.argv[1]
max_turns = int(sys.argv[2])

db = sqlite3.connect(db_path)

# Read session metadata
meta = None
for (raw,) in db.execute("SELECT value FROM meta LIMIT 1"):
    try:
        meta = json.loads(bytes.fromhex(raw).decode("utf-8"))
    except Exception:
        pass

if not meta:
    print("[]")
    sys.exit(0)

messages = []

for (data,) in db.execute("SELECT data FROM blobs ORDER BY rowid"):
    if len(messages) >= max_turns * 2:
        break

    text = None
    role = None

    if isinstance(data, str):
        # Pure JSON blob (user messages)
        try:
            obj = json.loads(data)
            role = obj.get("role")
            content = obj.get("content", "")
            if isinstance(content, str):
                text = content.strip() or None
            elif isinstance(content, list):
                parts = [b["text"] for b in content if b.get("type") == "text" and b.get("text")]
                text = "\\n".join(parts).strip() or None
        except Exception:
            pass

    elif isinstance(data, bytes):
        # Binary protobuf blob — search for embedded assistant JSON
        m = re.search(rb'\\{"id":"[^"]+","role":"assistant"', data)
        if m:
            try:
                obj = json.loads(data[m.start():].decode("utf-8", errors="ignore"))
                role = "assistant"
                content = obj.get("content", [])
                parts = [b["text"] for b in content if b.get("type") == "text" and b.get("text")]
                text = "\\n".join(parts).strip() or None
            except Exception:
                pass

    if role in ("user", "assistant") and text:
        messages.append({"role": role, "text": text})

# Deduplicate consecutive duplicate messages (binary blobs may repeat JSON)
deduped = []
seen = set()
for m in messages:
    key = m["role"] + ":" + m["text"][:100]
    if key not in seen:
        seen.add(key)
        deduped.append(m)

result = [{
    "sessionId": meta.get("agentId", db_path),
    "title": meta.get("name", ""),
    "createdAt": meta.get("createdAt", 0),
    "model": meta.get("lastUsedModel", ""),
    "turns": deduped[:max_turns],
}]

print(json.dumps(result, ensure_ascii=False))
`;

function runPythonExtractor(dbPath) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn("python3", ["-c", PYTHON_EXTRACTOR, dbPath, String(maxTurns)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve([]);
      }
    });
  });
}

// ── Find all store.db files ───────────────────────────────────────────────────

async function findStoreDbs() {
  const dbs = [];
  try {
    const workspaces = await readdir(CHATS_DIR);
    for (const ws of workspaces) {
      const wsPath = join(CHATS_DIR, ws);
      try {
        const sessions = await readdir(wsPath);
        for (const sess of sessions) {
          const dbPath = join(wsPath, sess, "store.db");
          try {
            const s = await stat(dbPath);
            dbs.push({ path: dbPath, mtime: s.mtimeMs });
          } catch { /* no store.db */ }
        }
      } catch { /* skip */ }
    }
  } catch { /* chats dir missing */ }
  return dbs;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const allDbs = await findStoreDbs();

if (allDbs.length === 0) {
  if (jsonOutput) process.stdout.write("[]");
  process.exit(0);
}

const sorted = allDbs.sort((a, b) => b.mtime - a.mtime).slice(0, recentN);

const sessions = [];

for (const { path: dbPath } of sorted) {
  const extracted = await runPythonExtractor(dbPath);
  for (const sess of extracted) {
    if (sinceTime && sess.createdAt < sinceTime) continue;
    if (sess.turns.length === 0) continue;
    sessions.push(sess);
  }
}

if (jsonOutput) {
  process.stdout.write(JSON.stringify(sessions));
} else {
  for (const s of sessions) {
    console.log(`\nSession: ${s.sessionId} — ${s.title.slice(0, 60)}`);
    for (const t of s.turns) {
      console.log(`  [${t.role}]: ${t.text.slice(0, 100)}`);
    }
  }
}
