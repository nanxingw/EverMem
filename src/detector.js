/**
 * detector.js — Auto-detect installed CLI coding agents
 */

import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function dirExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(cmd) {
  try {
    await execAsync(`which ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

async function findLogFiles(dir, pattern) {
  try {
    const entries = await readdir(dir, { recursive: true });
    return entries.filter((f) => {
      const name = typeof f === "string" ? f : f.name;
      return pattern.test(name);
    });
  } catch {
    return [];
  }
}

// Agent definitions
const AGENT_DEFS = [
  {
    id: "claude",
    name: "Claude Code",
    checkDir: join(homedir(), ".claude", "projects"),
    logDir: join(homedir(), ".claude", "projects"),
    logPattern: /\.jsonl$/,
    description: "Anthropic Claude Code CLI",
    extractScript: "extract-claude.mjs",
  },
  {
    id: "cursor",
    name: "Cursor IDE",
    checkDir: join(homedir(), ".cursor", "chats"),
    logDir: join(homedir(), ".cursor", "chats"),
    logPattern: /\.json$/,
    description: "Cursor AI IDE",
    extractScript: "extract-cursor.mjs",
  },
  {
    id: "codex",
    name: "Codex CLI",
    checkDir: join(homedir(), ".codex", "sessions"),
    logDir: join(homedir(), ".codex", "sessions"),
    logPattern: /rollout-.*\.jsonl$/,
    description: "OpenAI Codex CLI",
    extractScript: "extract-codex.mjs",
  },
  {
    id: "kimi",
    name: "Kimi CLI",
    checkDir: join(homedir(), ".kimi", "sessions"),
    logDir: join(homedir(), ".kimi", "sessions"),
    logPattern: /context\.jsonl$/,
    description: "Moonshot AI Kimi CLI",
    extractScript: "extract-kimi.mjs",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    checkDir: process.env.QWEN_SHARE_DIR ?? join(homedir(), ".qwen"),
    logDir: process.env.QWEN_SHARE_DIR ?? join(homedir(), ".qwen"),
    logPattern: /\.jsonl$/,
    description: "Alibaba Qwen Code CLI",
    extractScript: "extract-qwen.mjs",
  },
];

/**
 * Detect which agents are installed on this machine.
 * Returns array of agent objects with detected=true/false.
 */
export async function detectAgents() {
  const results = [];

  for (const def of AGENT_DEFS) {
    const detected = await dirExists(def.checkDir);
    results.push({
      ...def,
      detected,
      logDir: def.logDir,
    });
  }

  return results;
}

/**
 * Get only detected agent IDs.
 */
export async function getDetectedAgentIds() {
  const agents = await detectAgents();
  return agents.filter((a) => a.detected).map((a) => a.id);
}

/**
 * Get agent def by ID.
 */
export function getAgentDef(id) {
  return AGENT_DEFS.find((a) => a.id === id);
}

export { AGENT_DEFS };
