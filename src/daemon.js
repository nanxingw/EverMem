/**
 * daemon.js — Express HTTP server + cron scheduler
 *
 * Serves:
 *   - Web UI (Svelte build from web/dist/)
 *   - REST API for frontend
 */

import express from "express";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, updateConfig, PID_FILE } from "./config.js";
import { detectAgents } from "./detector.js";
import { searchMemories } from "./evermemos.js";
import { getRecentRuns } from "./logger.js";
import { startScheduler, stopScheduler, runOnce, getStatus, setBroadcast } from "./scheduler.js";
import { writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(__dirname, "..", "web", "dist");

const app = express();
app.use(express.json());

// ── SSE broadcast ─────────────────────────────────────────────────────────────

const sseClients = new Set();

/**
 * Broadcast a JSON event to all connected SSE clients.
 * @param {string} event  Event name
 * @param {object} data   JSON-serialisable payload
 */
export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// ── Serve Svelte frontend ────────────────────────────────────────────────────

app.use(express.static(WEB_DIST));

// ── REST API ─────────────────────────────────────────────────────────────────

// Status + recent runs
app.get("/api/status", async (req, res) => {
  try {
    const config = await loadConfig();
    const schedulerStatus = getStatus();
    const runs = await getRecentRuns(20);
    res.json({
      daemon: true,
      pid: process.pid,
      uptime: process.uptime(),
      scheduler: schedulerStatus,
      lastRun: config.lastRun,
      config: {
        interval: config.interval,
        port: config.port,
        agents: config.agents,
        userId: config.userId,
        hasApiKey: !!config.apiKey,
      },
      runs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get config (mask API key)
app.get("/api/config", async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({
      ...config,
      apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save config
app.post("/api/config", async (req, res) => {
  try {
    const { apiKey, interval, port, agents, userId, maxTurnsPerSession } = req.body;
    const patch = {};
    if (apiKey && !apiKey.startsWith("***")) patch.apiKey = apiKey;
    if (interval) patch.interval = parseInt(interval, 10);
    if (port) patch.port = parseInt(port, 10);
    if (agents) patch.agents = agents;
    if (userId) patch.userId = userId;
    if (maxTurnsPerSession) patch.maxTurnsPerSession = parseInt(maxTurnsPerSession, 10);

    const updated = await updateConfig(patch);

    // Restart scheduler if interval changed
    if (interval) {
      stopScheduler();
      await startScheduler(loadConfig);
    }

    res.json({ success: true, config: { ...updated, apiKey: updated.apiKey ? "***" + updated.apiKey.slice(-4) : "" } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE — real-time push events
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  sseClients.add(res);

  // Send initial heartbeat
  res.write(": ping\n\n");

  // Heartbeat every 25 s to keep the connection alive
  const hbTimer = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* client gone */ }
  }, 25_000);

  req.on("close", () => {
    clearInterval(hbTimer);
    sseClients.delete(res);
  });
});

// Detect agents
app.get("/api/detect", async (req, res) => {
  try {
    const agents = await detectAgents();
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enable/disable an agent
app.post("/api/agents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const config = await loadConfig();
    const agentSet = new Set(config.agents ?? []);
    if (enabled) agentSet.add(id);
    else agentSet.delete(id);
    await updateConfig({ agents: [...agentSet] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual run
app.post("/api/run", async (req, res) => {
  try {
    const config = await loadConfig();
    if (!config.apiKey) {
      return res.status(400).json({ error: "API key not configured" });
    }
    broadcast("run_started", { timestamp: new Date().toISOString() });
    // Run async, respond immediately
    runOnce(config).then(async () => {
      const runs = await getRecentRuns(20);
      const cfg = await loadConfig();
      broadcast("run_done", { timestamp: new Date().toISOString(), runs, lastRun: cfg.lastRun });
    }).catch((err) => {
      broadcast("run_error", { error: err.message, timestamp: new Date().toISOString() });
    });
    res.json({ success: true, message: "Memory extraction started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search memories
app.get("/api/search", async (req, res) => {
  try {
    const config = await loadConfig();
    const apiKey = config.apiKey;
    if (!apiKey) return res.status(400).json({ error: "API key not configured" });

    const { q, method = "hybrid", topK = 10 } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query parameter `q`" });

    const data = await searchMemories(q, {
      userId: config.userId,
      method,
      topK: parseInt(topK, 10),
    }, apiKey);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(join(WEB_DIST, "index.html"));
});

// ── Start server ─────────────────────────────────────────────────────────────

export async function startServer() {
  const config = await loadConfig();
  const port = config.port ?? 7349;

  await new Promise((resolve, reject) => {
    app.listen(port, "127.0.0.1", (err) => {
      if (err) reject(err);
      else {
        console.log(`[evermem] Web UI: http://localhost:${port}`);
        resolve();
      }
    });
  });

  // Write PID file
  await writeFile(PID_FILE, String(process.pid), "utf-8");

  // Wire scheduler broadcast → SSE
  setBroadcast(broadcast);

  // Start scheduler
  await startScheduler(loadConfig);

  // Broadcast scheduler status every second (countdown tick)
  const tickInterval = setInterval(() => {
    const s = getStatus();
    if (s.nextRun) broadcast("tick", { nextRun: s.nextRun, isExecuting: s.isExecuting });
  }, 1000);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[evermem] Shutting down...");
    clearInterval(tickInterval);
    stopScheduler();
    try { await unlink(PID_FILE); } catch { /* ignore */ }
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return port;
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch((err) => {
    console.error(`Failed to start: ${err.message}`);
    process.exit(1);
  });
}
