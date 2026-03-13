/**
 * logger.js — File-based logging for Web UI display
 */

import { appendFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { LOGS_DIR, RUNS_LOG } from "./config.js";

export async function logRun(entry) {
  await mkdir(LOGS_DIR, { recursive: true });
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  await appendFile(RUNS_LOG, line, "utf-8");
}

export async function getRecentRuns(limit = 20) {
  if (!existsSync(RUNS_LOG)) return [];
  try {
    const raw = await readFile(RUNS_LOG, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const parsed = lines.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return parsed.slice(-limit).reverse();
  } catch {
    return [];
  }
}
