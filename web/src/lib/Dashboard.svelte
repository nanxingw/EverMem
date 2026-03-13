<script>
  import { onMount, onDestroy } from "svelte";

  export let t;

  let status = null;
  let loading = true;
  let error = null;
  let syncing = false;
  let countdown = null;
  let timer;

  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      status = await res.json();
      error = null;
      updateCountdown();
    } catch (e) {
      error = t("loadError");
    } finally {
      loading = false;
    }
  }

  function updateCountdown() {
    if (!status?.scheduler?.nextRun) { countdown = null; return; }
    const diff = new Date(status.scheduler.nextRun) - Date.now();
    if (diff <= 0) { countdown = null; return; }
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    countdown = `${min}${t("minutes")} ${sec}${t("seconds")}`;
  }

  async function triggerRun() {
    if (syncing) return;
    syncing = true;
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTimeout(loadStatus, 3000);
    } catch (e) {
      alert(t("runError") + ": " + e.message);
    } finally {
      setTimeout(() => { syncing = false; }, 2000);
    }
  }

  function formatUptime(seconds) {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  onMount(() => {
    loadStatus();
    timer = setInterval(() => {
      loadStatus();
      updateCountdown();
    }, 10000);
  });

  onDestroy(() => clearInterval(timer));
</script>

<div class="dashboard">
  {#if loading}
    <div class="spinner">⟳</div>
  {:else if error}
    <div class="error-card">{error}</div>
  {:else if status}
    <!-- Status Cards -->
    <div class="cards">
      <div class="card status-card {status.daemon ? 'running' : 'stopped'}">
        <div class="card-label">{t("daemonStatus")}</div>
        <div class="card-value">
          <span class="dot"></span>
          {status.daemon ? t("running") : t("stopped")}
        </div>
        {#if status.daemon}
          <div class="card-sub">PID {status.pid} · {t("uptime")}: {formatUptime(status.uptime)}</div>
        {/if}
      </div>

      <div class="card">
        <div class="card-label">{t("nextSync")}</div>
        <div class="card-value">{countdown ?? "—"}</div>
        {#if status.lastRun}
          <div class="card-sub">Last: {formatTime(status.lastRun)}</div>
        {/if}
      </div>

      <div class="card agents-card">
        <div class="card-label">Agents</div>
        <div class="card-value">{status.config?.agents?.join(", ") || "—"}</div>
        <div class="card-sub">Every {status.config?.interval ?? 30} {t("minutes")}</div>
      </div>
    </div>

    <!-- Manual Sync Button -->
    <div class="action-row">
      <button class="btn-primary {syncing ? 'loading' : ''}" on:click={triggerRun} disabled={syncing || !status.config?.hasApiKey}>
        {syncing ? t("syncing") : t("manualRun")}
      </button>
      {#if !status.config?.hasApiKey}
        <span class="hint">{t("apiKeyMissing")}</span>
      {/if}
    </div>

    <!-- Recent Activity -->
    <div class="section">
      <h3>{t("recentActivity")}</h3>
      {#if status.runs?.length > 0}
        <div class="timeline">
          {#each status.runs as run}
            <div class="timeline-item {run.success === false ? 'error' : 'success'}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-time">{formatTime(run.timestamp)}</div>
                <div class="timeline-stats">
                  {#if run.agents}
                    <span class="tag">{run.agents.join(", ")}</span>
                  {/if}
                  <span>{run.sessions ?? 0} {t("sessions")}</span>
                  <span>{run.messages ?? 0} {t("messages")}</span>
                  {#if run.errors > 0}
                    <span class="error-text">{run.errors} {t("errors")}</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty">{t("noActivity")}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dashboard { padding: 1.5rem; }
  .spinner { text-align: center; font-size: 2rem; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; }
  .card-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .card-value { font-size: 1.25rem; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 0.5rem; }
  .card-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem; }

  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
  .status-card.running .dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
  .status-card.stopped .dot { background: #ef4444; }

  .action-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
  .btn-primary { background: var(--accent); color: white; border: none; border-radius: 8px; padding: 0.6rem 1.4rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
  .btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary.loading { animation: pulse 1s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  .hint { font-size: 0.8rem; color: var(--text-muted); }

  .section h3 { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 1rem; }

  .timeline { display: flex; flex-direction: column; gap: 0.75rem; }
  .timeline-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; }
  .timeline-item.error { border-color: #fca5a5; }
  .timeline-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; background: #22c55e; }
  .timeline-item.error .timeline-dot { background: #ef4444; }
  .timeline-content { flex: 1; }
  .timeline-time { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem; }
  .timeline-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text); }
  .tag { background: var(--accent-dim); color: var(--accent); padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
  .error-text { color: #ef4444; }
  .empty { color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem; }
  .error-card { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 1rem; color: #991b1b; }
</style>
