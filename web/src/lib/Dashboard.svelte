<script>
  import { onMount, onDestroy } from "svelte";

  export let t;

  let status = null;
  let loading = true;
  let error = null;
  let syncing = false;
  let syncDone = false;
  let stopping = false;
  let secondsToNext = null;
  let isExecuting = false;
  let pollTimer;
  let es; // EventSource

  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      status = await res.json();
      error = null;
      recalcFromNextRun(status?.scheduler?.nextRun);
      isExecuting = status?.scheduler?.isExecuting ?? false;
    } catch (e) {
      error = t("loadError");
    } finally {
      loading = false;
    }
  }

  function recalcFromNextRun(nextRunISO) {
    if (!nextRunISO) { secondsToNext = null; return; }
    const diff = new Date(nextRunISO) - Date.now();
    secondsToNext = Math.max(0, Math.floor(diff / 1000));
  }

  $: countdownLabel = secondsToNext !== null
    ? secondsToNext >= 60
      ? `${Math.floor(secondsToNext / 60)}${t("minutes")} ${secondsToNext % 60}${t("seconds")}`
      : `${secondsToNext}${t("seconds")}`
    : "—";

  $: countdownPct = (() => {
    if (!status?.config?.interval || secondsToNext === null) return 0;
    const total = status.config.interval * 60;
    return Math.max(0, Math.min(100, ((total - secondsToNext) / total) * 100));
  })();

  async function stopDaemon() {
    if (stopping) return;
    stopping = true;
    try {
      await fetch("/api/stop", { method: "POST" });
    } catch { /* daemon closed the connection — expected */ }
    // Daemon is gone; reflect in UI
    setTimeout(() => {
      status = status ? { ...status, running: false } : status;
      stopping = false;
    }, 800);
  }

  async function triggerRun() {
    if (syncing) return;
    syncing = true;
    syncDone = false;
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      syncDone = true;
    } catch (e) {
      alert(t("runError") + ": " + e.message);
    } finally {
      setTimeout(() => { syncing = false; syncDone = false; }, 3000);
    }
  }

  function connectSSE() {
    es = new EventSource("/api/events");

    es.addEventListener("tick", (e) => {
      const data = JSON.parse(e.data);
      recalcFromNextRun(data.nextRun);
      isExecuting = data.isExecuting ?? false;
    });

    es.addEventListener("run_started", () => {
      isExecuting = true;
      syncing = true;
    });

    es.addEventListener("run_done", async (e) => {
      const data = JSON.parse(e.data);
      isExecuting = false;
      syncDone = true;
      syncing = false;
      if (data.runs) {
        status = { ...status, runs: data.runs, lastRun: data.lastRun };
      } else {
        await loadStatus();
      }
      setTimeout(() => { syncDone = false; }, 3000);
    });

    es.addEventListener("run_error", () => {
      isExecuting = false;
      syncing = false;
    });

    es.onerror = () => {
      // SSE reconnects automatically; refresh status on reconnect
      loadStatus();
    };
  }

  function formatUptime(s) {
    if (!s) return "—";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${Math.floor(s % 60)}s`;
    return `${Math.floor(s % 60)}s`;
  }

  function formatTimeAgo(iso) {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso);
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("justNow") || "just now";
    if (min < 60) return `${min}${t("minutes")} ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  function formatTimeFull(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  onMount(() => {
    loadStatus();
    connectSSE();
    // Fallback poll every 30s in case SSE misses something
    pollTimer = setInterval(loadStatus, 30000);
  });

  onDestroy(() => {
    clearInterval(pollTimer);
    if (es) es.close();
  });
</script>

<div class="dashboard">
  {#if loading}
    <div class="skeleton-layout">
      <div class="skeleton-hero"></div>
      <div class="skeleton-row">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v5M10 13.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
      <p>{error}</p>
    </div>
  {:else if status}

    <!-- ── Hero status strip ── -->
    <div class="hero">
      <div class="hero-left">
        <div class="status-indicator {status.daemon ? 'online' : 'offline'}">
          <span class="pulse-ring"></span>
          <span class="pulse-dot"></span>
        </div>
        <div>
          <div class="hero-status">{status.daemon ? t("running") : t("stopped")}</div>
          {#if status.daemon}
            <div class="hero-meta">PID {status.pid} · {formatUptime(status.uptime)}</div>
          {/if}
        </div>
      </div>

      <div class="hero-right">
        {#if status.config?.hasApiKey}
          <button
            class="btn btn-accent sync-btn {(syncing || isExecuting) ? 'syncing' : ''} {syncDone ? 'done' : ''}"
            on:click={triggerRun}
            disabled={syncing || isExecuting}
          >
            {#if syncDone}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {t("runSuccess") || "Synced"}
            {:else if syncing || isExecuting}
              <span class="spin-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 12" stroke-linecap="round"/></svg>
              </span>
              {t("syncing")}
            {:else}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7A4 4 0 013.27 9M3 7A4 4 0 0110.73 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11 5v2h-2M3 9v-2h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {t("manualRun")}
            {/if}
          </button>
          <button
            class="btn btn-danger stop-btn"
            on:click={stopDaemon}
            disabled={stopping}
            title="Stop daemon"
          >
            {#if stopping}
              <span class="spin-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="7 9" stroke-linecap="round"/></svg>
              </span>
            {:else}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2.5" width="7" height="7" rx="1.5" fill="currentColor"/></svg>
            {/if}
            {t("stopDaemon") || "停止"}
          </button>
        {:else}
          <span class="no-key-hint">{t("apiKeyMissing")}</span>
        {/if}
      </div>
    </div>

    <!-- ── Info row ── -->
    <div class="info-row">
      <!-- Next sync with arc progress -->
      <div class="next-sync-card">
        <div class="arc-wrap">
          <svg class="arc-svg" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="34" stroke="var(--border)" stroke-width="4"/>
            <circle
              cx="40" cy="40" r="34"
              stroke="var(--accent)"
              stroke-width="4"
              stroke-linecap="round"
              stroke-dasharray="{2 * Math.PI * 34}"
              stroke-dashoffset="{2 * Math.PI * 34 * (1 - countdownPct / 100)}"
              transform="rotate(-90 40 40)"
              style="transition: stroke-dashoffset 1s linear"
            />
          </svg>
          <div class="arc-label">
            <span class="arc-value">{countdownLabel}</span>
          </div>
        </div>
        <div class="next-sync-info">
          <div class="ns-title">{t("nextSync")}</div>
          {#if status.lastRun}
            <div class="ns-sub">{t("uptime") || "Last"}: {formatTimeAgo(status.lastRun)}</div>
          {/if}
          <div class="ns-interval">
            <span class="tag tag-muted">↻ {status.config?.interval ?? 30}{t("minutes")}</span>
          </div>
        </div>
      </div>

      <!-- Agent pills -->
      <div class="agents-card">
        <div class="agents-title">{t("agents") || "Agents"}</div>
        <div class="agent-pills">
          {#if status.config?.agents?.length > 0}
            {#each status.config.agents as agent}
              <div class="agent-pill">
                <span class="agent-dot"></span>
                {agent}
              </div>
            {/each}
          {:else}
            <span class="no-agents">—</span>
          {/if}
        </div>
        {#if status.runs?.[0]}
          <div class="last-sync-nums">
            <span>{status.runs[0].messages ?? 0} {t("messages")}</span>
            <span class="sep">·</span>
            <span>{status.runs[0].sessions ?? 0} {t("sessions")}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- ── Activity log ── -->
    <div class="activity-section">
      <div class="activity-header">
        <span class="section-label">{t("recentActivity")}</span>
        <span class="section-count">{status.runs?.length ?? 0}</span>
      </div>

      {#if status.runs?.length > 0}
        <div class="activity-list">
          {#each status.runs as run, i}
            <div class="activity-row {run.success === false ? 'err' : ''}">
              <div class="act-line {i < status.runs.length - 1 ? 'has-line' : ''}">
                <div class="act-dot {run.success === false ? 'err' : 'ok'}"></div>
              </div>
              <div class="act-content">
                <div class="act-meta">
                  <span class="act-time">{formatTimeFull(run.timestamp)}</span>
                  {#if run.agents}
                    <span class="tag tag-accent">{run.agents.join(", ")}</span>
                  {/if}
                  {#if run.success === false}
                    <span class="tag tag-red">error</span>
                  {/if}
                </div>
                <div class="act-stats">
                  <span class="stat-item">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="1" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M3 5.5h5M3 3.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    {run.sessions ?? 0} {t("sessions")}
                  </span>
                  <span class="stat-item">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6z" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 2.5l4 3 4-3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
                    {run.messages ?? 0} {t("messages")}
                  </span>
                  {#if run.duration}
                    <span class="stat-item muted">{run.duration}ms</span>
                  {/if}
                  {#if run.errors > 0}
                    <span class="stat-item red">{run.errors} {t("errors")}</span>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-activity">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M14 9v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <p>{t("noActivity")}</p>
          <p class="empty-hint">Run `evermem run` or click sync above.</p>
        </div>
      {/if}
    </div>

  {/if}
</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

  /* Loading skeleton */
  .skeleton-layout { display: flex; flex-direction: column; gap: 1rem; }
  .skeleton-hero { height: 72px; border-radius: var(--radius-lg); background: var(--surface); }
  .skeleton-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .skeleton-card { height: 120px; border-radius: var(--radius-lg); }
  .skeleton-hero, .skeleton-card { background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Error state */
  .error-state { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem; background: oklch(52% 0.2 22 / 0.06); border: 1px solid oklch(52% 0.2 22 / 0.18); border-radius: var(--radius-lg); color: var(--red); }
  .error-icon { flex-shrink: 0; }
  .error-state p { font-size: 0.88rem; }

  /* Hero strip */
  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.4rem;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
  }

  .hero-left { display: flex; align-items: center; gap: 1rem; }

  /* Status indicator */
  .status-indicator { position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-3); position: relative; z-index: 1; }
  .pulse-ring { position: absolute; inset: 0; border-radius: 50%; opacity: 0; }
  .status-indicator.online .pulse-dot { background: var(--green); box-shadow: 0 0 8px var(--green-glow); }
  .status-indicator.online .pulse-ring { background: var(--green-glow); animation: pulse-ring 2.5s ease-out infinite; }
  .status-indicator.offline .pulse-dot { background: var(--red); }
  @keyframes pulse-ring { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }

  .hero-status { font-size: 0.95rem; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
  .hero-meta { font-size: 0.77rem; color: var(--text-3); margin-top: 0.1rem; font-variant-numeric: tabular-nums; }

  .no-key-hint { font-size: 0.78rem; color: var(--text-3); max-width: 200px; text-align: right; }

  /* Sync button */
  .btn { display: inline-flex; align-items: center; gap: 0.4rem; border: none; border-radius: var(--radius); padding: 0.55rem 1.1rem; font-size: 0.84rem; font-weight: 500; cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); font-family: inherit; }
  .btn-accent { background: var(--accent); color: #fff; }
  .btn-accent:hover:not(:disabled) { background: var(--accent-2); transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-glow); }
  .btn-accent:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
  .btn-danger { background: oklch(52% 0.2 22 / 0.1); color: oklch(45% 0.2 22); border: 1px solid oklch(52% 0.2 22 / 0.25); }
  .btn-danger:hover:not(:disabled) { background: oklch(52% 0.2 22 / 0.16); transform: translateY(-1px); }
  .btn-danger:active:not(:disabled) { transform: translateY(0); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sync-btn.done { background: var(--green); }
  .hero-right { display: flex; gap: 0.5rem; align-items: center; }
  .spin-icon { display: flex; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Info row */
  .info-row { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; }

  /* Arc countdown */
  .next-sync-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.4rem; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); }
  .arc-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
  .arc-svg { width: 80px; height: 80px; }
  .arc-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .arc-value { font-size: 0.72rem; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; text-align: center; line-height: 1.2; }
  .ns-title { font-size: 0.78rem; font-weight: 600; color: var(--text-2); margin-bottom: 0.3rem; letter-spacing: 0.02em; text-transform: uppercase; }
  .ns-sub { font-size: 0.8rem; color: var(--text-3); margin-bottom: 0.5rem; }
  .ns-interval { }
  .tag { display: inline-flex; align-items: center; font-size: 0.72rem; font-weight: 500; padding: 0.18rem 0.55rem; border-radius: 20px; letter-spacing: 0.02em; }
  .tag-muted { background: var(--surface-2); color: var(--text-3); border: 1px solid var(--border-soft); }
  .tag-accent { background: var(--accent-dim); color: var(--accent-2); border: 1px solid oklch(58% 0.19 45 / 0.2); }
  .tag-red { background: oklch(52% 0.2 22 / 0.08); color: var(--red); border: 1px solid oklch(52% 0.2 22 / 0.2); }

  /* Agents card */
  .agents-card { padding: 1.25rem 1.4rem; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 0.6rem; }
  .agents-title { font-size: 0.78rem; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em; }
  .agent-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .agent-pill { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 500; color: var(--text-2); background: var(--surface-2); border: 1px solid var(--border-soft); padding: 0.25rem 0.65rem; border-radius: 20px; }
  .agent-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--green); }
  .no-agents { color: var(--text-3); font-size: 0.85rem; }
  .last-sync-nums { display: flex; gap: 0.4rem; align-items: center; font-size: 0.78rem; color: var(--text-3); }
  .sep { opacity: 0.4; }

  /* Activity */
  .activity-section { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); overflow: hidden; }
  .activity-header { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.4rem; border-bottom: 1px solid var(--border-soft); }
  .section-label { font-size: 0.78rem; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em; }
  .section-count { font-size: 0.72rem; font-weight: 600; background: var(--surface-2); color: var(--text-3); padding: 0.1rem 0.5rem; border-radius: 20px; border: 1px solid var(--border-soft); }

  .activity-list { padding: 0.5rem 0; }
  .activity-row { display: flex; gap: 0; padding: 0.6rem 1.4rem; transition: background 0.12s; }
  .activity-row:hover { background: var(--surface-2); }

  .act-line { display: flex; flex-direction: column; align-items: center; width: 24px; flex-shrink: 0; padding-top: 3px; }
  .act-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .act-dot.ok { background: var(--green); box-shadow: 0 0 6px var(--green-glow); }
  .act-dot.err { background: var(--red); }
  .act-line.has-line::after { content: ""; display: block; width: 1px; flex: 1; background: var(--border-soft); margin-top: 4px; min-height: 18px; }

  .act-content { flex: 1; padding-left: 0.5rem; }
  .act-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
  .act-time { font-size: 0.78rem; color: var(--text-3); font-variant-numeric: tabular-nums; }
  .act-stats { display: flex; gap: 0.85rem; flex-wrap: wrap; }
  .stat-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.79rem; color: var(--text-2); }
  .stat-item.muted { color: var(--text-3); }
  .stat-item.red { color: var(--red); }

  /* Empty */
  .empty-activity { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 3rem 1rem; color: var(--text-3); }
  .empty-icon { opacity: 0.4; }
  .empty-activity p { font-size: 0.88rem; }
  .empty-hint { font-size: 0.78rem; opacity: 0.7; font-family: var(--font-mono); }

  @media (max-width: 600px) {
    .info-row { grid-template-columns: 1fr; }
    .next-sync-card { flex-direction: row; }
    .hero { flex-direction: column; gap: 1rem; align-items: flex-start; }
  }
</style>
