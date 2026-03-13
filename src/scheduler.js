/**
 * scheduler.js — node-cron based scheduler for periodic memory extraction
 */

import cron from "node-cron";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, updateConfig } from "./config.js";
import { logRun } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADD_MEMORIES_SCRIPT = join(__dirname, "..", "scripts", "add-memories.mjs");

let cronTask = null;
let isRunning = false;
let nextRun = null;

/**
 * Run the memory extraction once.
 */
export async function runOnce(config) {
  if (isRunning) {
    console.log("[scheduler] Already running, skipping.");
    return { skipped: true };
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`[scheduler] Starting memory extraction at ${new Date().toISOString()}`);

  return new Promise((resolve) => {
    const args = ["--recent", "5"];
    if (config.lastRun) args.push("--since", config.lastRun);

    const env = { ...process.env };
    if (config.apiKey) env.EVERMEMOS_API_KEY = config.apiKey;

    const child = spawn(process.execPath, [ADD_MEMORIES_SCRIPT, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; process.stdout.write(d); });
    child.stderr.on("data", (d) => { stderr += d; process.stderr.write(d); });

    child.on("close", async (code) => {
      isRunning = false;
      const duration = Date.now() - startTime;

      // Parse stats from output
      const messagesMatch = stdout.match(/(\d+) messages/);
      const sessionsMatch = stdout.match(/(\d+) sessions/);
      const errorsMatch = stdout.match(/(\d+) errors/);

      const stats = {
        success: code === 0,
        exitCode: code,
        duration,
        messages: messagesMatch ? parseInt(messagesMatch[1]) : 0,
        sessions: sessionsMatch ? parseInt(sessionsMatch[1]) : 0,
        errors: errorsMatch ? parseInt(errorsMatch[1]) : 0,
      };

      await logRun(stats);
      if (code === 0) {
        await updateConfig({ lastRun: new Date().toISOString() });
      }

      console.log(`[scheduler] Done in ${duration}ms (exit ${code})`);
      resolve(stats);
    });
  });
}

/**
 * Start the cron scheduler.
 */
export async function startScheduler(getConfig) {
  if (cronTask) stopScheduler();

  const config = await getConfig();
  const intervalMinutes = config.interval ?? 30;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  console.log(`[scheduler] Starting: every ${intervalMinutes} minutes`);

  cronTask = cron.schedule(cronExpression, async () => {
    const currentConfig = await getConfig();
    await runOnce(currentConfig);
    updateNextRun(intervalMinutes);
  });

  updateNextRun(intervalMinutes);
  return { intervalMinutes, cronExpression };
}

function updateNextRun(intervalMinutes) {
  nextRun = new Date(Date.now() + intervalMinutes * 60 * 1000);
}

export function stopScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    nextRun = null;
    console.log("[scheduler] Stopped.");
  }
}

export function getStatus() {
  return {
    running: !!cronTask,
    isExecuting: isRunning,
    nextRun: nextRun?.toISOString() ?? null,
  };
}
