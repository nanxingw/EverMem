/**
 * config.js — Read/write ~/.evermem/config.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const EVERMEM_DIR = join(homedir(), ".evermem");
export const CONFIG_PATH = join(EVERMEM_DIR, "config.json");
export const LOGS_DIR = join(EVERMEM_DIR, "logs");
export const PID_FILE = join(EVERMEM_DIR, "daemon.pid");
export const RUNS_LOG = join(LOGS_DIR, "runs.jsonl");
export const DAEMON_LOG = join(LOGS_DIR, "daemon.log");

const DEFAULTS = {
  apiKey: "",
  interval: 30,
  port: 7349,
  agents: [],
  userId: "evermem-user",
  lastRun: null,
  maxTurnsPerSession: 200,
  autoOpen: true,
};

export async function ensureDirs() {
  await mkdir(EVERMEM_DIR, { recursive: true });
  await mkdir(LOGS_DIR, { recursive: true });
}

export async function loadConfig() {
  await ensureDirs();
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveConfig(config) {
  await ensureDirs();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function updateConfig(patch) {
  const current = await loadConfig();
  const updated = { ...current, ...patch };
  await saveConfig(updated);
  return updated;
}
