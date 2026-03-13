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
import { readFile, copyFile, mkdir, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig, updateConfig, PID_FILE, CONFIG_PATH } from "../src/config.js";
import { detectAgents } from "../src/detector.js";
import { getRecentRuns } from "../src/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// ── Skill installer ───────────────────────────────────────────────────────────
// skills/ mirrors the ~/.claude/skills/ layout exactly — one subdirectory per
// skill. Each directory is copied verbatim into the target tool's skills folder.
//
// skills/
//   evermem/                → ~/.claude/skills/evermem/               (/evermem)
//   evermem-sync-context/   → ~/.claude/skills/evermem-sync-context/  (/evermem-sync-context)
//
// To add a new skill: create skills/<name>/SKILL.md. No installer changes needed.

const SKILL_TARGETS = [
  { id: "claude", skillsDir: join(homedir(), ".claude", "skills"), presence: join(homedir(), ".claude") },
  { id: "cursor", skillsDir: join(homedir(), ".cursor", "skills"), presence: join(homedir(), ".cursor") },
  { id: "codex",  skillsDir: join(homedir(), ".codex",  "skills"), presence: join(homedir(), ".codex") },
  { id: "kimi",   skillsDir: join(homedir(), ".config", "agents", "skills"), presence: join(homedir(), ".kimi") },
  { id: "kimi2",  skillsDir: join(homedir(), ".kimi",   "skills"), presence: join(homedir(), ".kimi") },
  { id: "qwen",   skillsDir: join(homedir(), ".qwen",   "skills"), presence: join(homedir(), ".qwen") },
];

async function installSkill({ allTargets = false } = {}) {
  const { readdir } = await import("node:fs/promises");
  const SKILLS_SRC = join(__dirname, "..", "skills");
  const results = [];

  // Enumerate skill directories (e.g. ["evermem", "evermem-sync-context"])
  let skillDirs = [];
  try {
    const entries = await readdir(SKILLS_SRC, { withFileTypes: true });
    skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { /* skills/ missing */ }

  for (const target of SKILL_TARGETS) {
    if (!allTargets && !existsSync(target.presence)) continue;

    try {
      await mkdir(target.skillsDir, { recursive: true });
      for (const name of skillDirs) {
        await cp(join(SKILLS_SRC, name), join(target.skillsDir, name), { recursive: true, force: true });
      }
      results.push({ id: target.id, skillsDir: target.skillsDir, ok: true, installed: skillDirs });
    } catch (err) {
      results.push({ id: target.id, skillsDir: target.skillsDir, ok: false, error: err.message });
    }
  }

  return results;
}

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

    // Install skill to all detected AI CLI tools
    console.log("\nInstalling evermem skill to detected AI tools...");
    const skillResults = await installSkill();
    if (skillResults.length === 0) {
      console.log("  No AI CLI tools detected. Run `evermem install-skill` after installing your tools.");
    } else {
      for (const r of skillResults) {
        if (r.ok) console.log(`  ✓ ${r.id.replace("2", " (fallback)")} → ${r.skillsDir}`);
        else console.warn(`  ✗ ${r.id}: ${r.error}`);
      }
    }

    console.log("\nNext steps:");
    console.log("  evermem start --daemon   # Start background daemon");
    console.log("  evermem web              # Open Web UI");
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

// ── install-skill ────────────────────────────────────────────────────────────
program
  .command("install-skill")
  .description("Install the evermem skill to all detected AI CLI tools")
  .option("--all", "Install to all supported tools even if not detected")
  .action(async (opts) => {
    const toolNames = {
      claude: "Claude Code",
      cursor: "Cursor IDE",
      codex:  "Codex CLI",
      kimi:   "Kimi CLI",
      kimi2:  "Kimi CLI (fallback)",
      qwen:   "Qwen Code",
    };
    console.log("Installing evermem skill to AI CLI tools...\n");
    const results = await installSkill({ allTargets: !!opts.all });
    if (results.length === 0) {
      console.log("No AI CLI tools detected on this machine.");
      console.log("Install Claude Code, Codex CLI, Kimi, or Qwen Code first,");
      console.log("then run `evermem install-skill` again.");
      console.log("\nTo force install for all tools: evermem install-skill --all");
      return;
    }
    for (const r of results) {
      const name = toolNames[r.id] ?? r.id;
      if (r.ok) {
        console.log(`  ✓ ${name}`);
        console.log(`    → ${r.skillsDir} (${r.installed?.join(", ")}`);
      } else {
        console.warn(`  ✗ ${name}: ${r.error}`);
      }
    }
    console.log("\nRestart your AI tool to pick up the new skills.");
    console.log("  Claude Code: /evermem               — memory search & sync");
    console.log("  Claude Code: /evermem-sync-context  — load project context into CLAUDE.md");
    console.log("  Codex CLI:   $evermem");
    console.log("  Kimi CLI:    /skill:evermem");
    console.log("  Qwen Code:   /skills");
  });

// ── search ───────────────────────────────────────────────────────────────────
program
  .command("search")
  .description("Search stored memories in EverMemOS")
  .requiredOption("--query <text>", "Search query")
  .option("--method <method>", "keyword | vector | hybrid | agentic", "hybrid")
  .option("--top-k <n>", "Number of results", "10")
  .option("--json", "Output raw JSON")
  .action(async (opts) => {
    const config = await loadConfig();
    const scriptPath = join(__dirname, "..", "scripts", "search-memories.mjs");
    const args = ["--query", opts.query, "--method", opts.method, "--top-k", opts.topK];
    if (opts.json) args.push("--json");

    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: { ...process.env, EVERMEMOS_API_KEY: config.apiKey },
    });
    child.on("close", (code) => process.exit(code ?? 0));
  });

program.parse();
