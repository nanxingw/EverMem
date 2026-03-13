#!/usr/bin/env node
/**
 * evermem — CLI entry point
 *
 * Commands:
 *   setup       Interactive configuration wizard
 *   start       Start the daemon (foreground or background)
 *   stop        Stop background daemon
 *   status      Show daemon status and recent runs
 *   run         Manually trigger memory extraction once
 *   web         Open the web dashboard in browser
 */

import { Command } from "commander";
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, updateConfig, PID_FILE, CONFIG_PATH } from "../src/config.js";
import { detectAgents } from "../src/detector.js";
import { getRecentRuns } from "../src/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getDaemonPid() {
  if (!existsSync(PID_FILE)) return null;
  try {
    const pid = parseInt(await readFile(PID_FILE, "utf-8"), 10);
    // Check if process is actually running
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

function printBanner() {
  console.log(`
  ╔═══════════════════════════════╗
  ║      EverMem Async v0.1.0     ║
  ║  CLI Memory Bridge for AI     ║
  ╚═══════════════════════════════╝
`);
}

// ── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();
program.name("evermem").description("One-line memory bridge for AI coding CLI tools").version("0.1.0");

// ── setup ────────────────────────────────────────────────────────────────────
program
  .command("setup")
  .description("Interactive configuration wizard")
  .action(async () => {
    printBanner();
    console.log("Welcome to EverMem Async setup!\n");

    // Dynamic import of inquirer (ESM)
    const { default: inquirer } = await import("inquirer");
    const config = await loadConfig();

    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: "EverMemOS API Key (from https://evermind.ai):",
        default: config.apiKey || "",
        mask: "*",
        validate: (v) => v.trim().length > 0 || "API key is required",
      },
      {
        type: "number",
        name: "interval",
        message: "Auto-sync interval (minutes):",
        default: config.interval ?? 30,
        validate: (v) => (v >= 1 && v <= 1440) || "Must be between 1 and 1440",
      },
      {
        type: "input",
        name: "userId",
        message: "Your user ID for memory storage:",
        default: config.userId ?? "evermem-user",
      },
      {
        type: "number",
        name: "port",
        message: "Web UI port:",
        default: config.port ?? 7349,
      },
    ]);

    // Auto-detect agents
    console.log("\nDetecting installed CLI agents...");
    const agents = await detectAgents();
    const detected = agents.filter((a) => a.detected);

    if (detected.length === 0) {
      console.log("  No agents detected. You can configure them later in the Web UI.");
    } else {
      console.log(`  Detected: ${detected.map((a) => a.name).join(", ")}`);
    }

    const { selectedAgents } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedAgents",
        message: "Select agents to enable:",
        choices: agents.map((a) => ({
          name: `${a.name} ${a.detected ? "(detected)" : "(not found)"}`,
          value: a.id,
          checked: a.detected,
          disabled: !a.detected ? "Not installed" : false,
        })),
      },
    ]);

    await updateConfig({
      apiKey: answers.apiKey,
      interval: answers.interval,
      userId: answers.userId,
      port: answers.port,
      agents: selectedAgents,
    });

    console.log(`\n✓ Configuration saved to ${CONFIG_PATH}`);
    console.log("\nNext steps:");
    console.log("  evermem start --daemon   # Start in background");
    console.log("  evermem web              # Open web dashboard");
    console.log("  evermem run              # Manually sync memories now\n");
  });

// ── start ────────────────────────────────────────────────────────────────────
program
  .command("start")
  .description("Start the EverMem daemon")
  .option("-d, --daemon", "Run in background")
  .action(async (opts) => {
    const config = await loadConfig();
    if (!config.apiKey) {
      console.error("Error: API key not configured. Run `evermem setup` first.");
      process.exit(1);
    }

    const daemonScript = join(__dirname, "..", "src", "daemon.js");

    if (opts.daemon) {
      const pid = await getDaemonPid();
      if (pid) {
        console.log(`Daemon already running (PID ${pid}). Use \`evermem stop\` first.`);
        process.exit(0);
      }

      const { DAEMON_LOG } = await import("../src/config.js");
      console.log("Starting EverMem daemon in background...");

      const child = spawn(process.execPath, [daemonScript], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
        env: { ...process.env, EVERMEMOS_API_KEY: config.apiKey },
      });
      child.unref();

      // Wait a moment then check
      await new Promise((r) => setTimeout(r, 1500));
      const newPid = await getDaemonPid();
      if (newPid) {
        console.log(`✓ Daemon started (PID ${newPid})`);
        console.log(`  Web UI: http://localhost:${config.port ?? 7349}`);
        console.log(`  Logs:   ${DAEMON_LOG}`);
        console.log(`  Stop:   evermem stop`);
      } else {
        console.error("Failed to start daemon. Check logs for details.");
        process.exit(1);
      }
    } else {
      // Foreground mode
      console.log("Starting EverMem daemon (foreground)...");
      const { startServer } = await import("../src/daemon.js");
      const port = await startServer();

      const { default: open } = await import("open");
      open(`http://localhost:${port}`).catch(() => {});
    }
  });

// ── stop ─────────────────────────────────────────────────────────────────────
program
  .command("stop")
  .description("Stop the background daemon")
  .action(async () => {
    const pid = await getDaemonPid();
    if (!pid) {
      console.log("No daemon is running.");
      return;
    }
    try {
      process.kill(pid, "SIGTERM");
      console.log(`✓ Daemon stopped (PID ${pid})`);
    } catch (err) {
      console.error(`Failed to stop daemon: ${err.message}`);
    }
  });

// ── status ───────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Show daemon status and recent memory sync runs")
  .action(async () => {
    const pid = await getDaemonPid();
    const config = await loadConfig();
    const runs = await getRecentRuns(5);

    console.log("\n── EverMem Status ──────────────────────");
    console.log(`  Daemon:   ${pid ? `Running (PID ${pid})` : "Stopped"}`);
    console.log(`  API Key:  ${config.apiKey ? "Configured ✓" : "Not set ✗"}`);
    console.log(`  Agents:   ${config.agents?.join(", ") || "None configured"}`);
    console.log(`  Interval: Every ${config.interval ?? 30} minutes`);
    console.log(`  Last Run: ${config.lastRun ?? "Never"}`);
    console.log(`  Web UI:   http://localhost:${config.port ?? 7349}`);

    if (runs.length > 0) {
      console.log("\n── Recent Runs ─────────────────────────");
      for (const run of runs) {
        const time = new Date(run.timestamp).toLocaleString();
        const status = run.success !== false ? "✓" : "✗";
        console.log(`  ${status} ${time} — ${run.messages ?? 0} messages, ${run.sessions ?? 0} sessions`);
      }
    }
    console.log();
  });

// ── run ──────────────────────────────────────────────────────────────────────
program
  .command("run")
  .description("Manually trigger memory extraction once")
  .option("--dry-run", "Print without sending to API")
  .option("--agents <list>", "Comma-separated agents (default: configured agents)")
  .action(async (opts) => {
    const config = await loadConfig();
    if (!config.apiKey && !opts.dryRun) {
      console.error("Error: API key not configured. Run `evermem setup` first.");
      process.exit(1);
    }

    const scriptPath = join(__dirname, "..", "scripts", "add-memories.mjs");
    const args = [];
    if (opts.dryRun) args.push("--dry-run");
    if (opts.agents) args.push("--agents", opts.agents);

    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, EVERMEMOS_API_KEY: config.apiKey },
    });

    child.on("close", (code) => process.exit(code ?? 0));
  });

// ── web ──────────────────────────────────────────────────────────────────────
program
  .command("web")
  .description("Open the web dashboard in browser")
  .action(async () => {
    const config = await loadConfig();
    const url = `http://localhost:${config.port ?? 7349}`;
    const pid = await getDaemonPid();

    if (!pid) {
      console.log("Daemon is not running. Starting it first...");
      console.log("Run `evermem start --daemon` to start in background.");
      process.exit(1);
    }

    console.log(`Opening ${url}...`);
    const { default: open } = await import("open");
    await open(url);
  });

program.parse();
