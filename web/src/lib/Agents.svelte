<script>
  import { onMount } from "svelte";

  export let t;

  let agents = [];
  let enabledAgents = new Set();
  let loading = true;
  let detecting = false;
  let savingAgent = null;

  async function loadAgents() {
    try {
      const [detectRes, configRes] = await Promise.all([
        fetch("/api/detect"),
        fetch("/api/config"),
      ]);
      const detectData = await detectRes.json();
      const configData = await configRes.json();
      agents = detectData.agents ?? [];
      enabledAgents = new Set(configData.agents ?? []);
    } finally {
      loading = false;
    }
  }

  async function redetect() {
    detecting = true;
    try {
      const res = await fetch("/api/detect");
      const data = await res.json();
      agents = data.agents ?? [];
    } finally {
      detecting = false;
    }
  }

  async function toggleAgent(agentId, enabled) {
    savingAgent = agentId;
    enabledAgents = new Set(enabledAgents);
    if (enabled) enabledAgents.add(agentId);
    else enabledAgents.delete(agentId);

    try {
      await fetch(`/api/agents/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } finally {
      savingAgent = null;
    }
  }

  onMount(loadAgents);

  // Agent brand styles
  const agentMeta = {
    claude: {
      logo: "/logos/claude.svg",
      bg: "oklch(62% 0.14 38 / 0.1)",
      border: "oklch(62% 0.14 38 / 0.22)",
    },
    codex: {
      logo: "/logos/codex.svg",
      bg: "oklch(20% 0.01 285 / 0.8)",
      border: "oklch(35% 0.02 285 / 0.5)",
    },
    kimi: {
      logo: "/logos/kimi.png",
      bg: "oklch(14% 0.01 285 / 0.9)",
      border: "oklch(35% 0.04 285 / 0.4)",
    },
    qwen: {
      logo: "/logos/qwen.png",
      bg: "oklch(60% 0.2 290 / 0.1)",
      border: "oklch(60% 0.2 290 / 0.25)",
    },
  };
</script>

<div class="agents-page">
  <div class="agents-header">
    <div>
      <h1 class="page-title">{t("agentsTitle")}</h1>
      <p class="page-subtitle">{t("agentsSubtitle") || "Manage which AI coding tools contribute to your memory"}</p>
    </div>
    <button class="btn btn-ghost detect-btn" on:click={redetect} disabled={detecting}>
      {#if detecting}
        <span class="spin-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 10" stroke-linecap="round"/></svg>
        </span>
        {t("detecting") || "Scanning…"}
      {:else}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6.5A4.5 4.5 0 013.1 8.5M2 6.5A4.5 4.5 0 019.9 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 4.5v2h-2M2 8.5v-2h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {t("detectAgents") || "Re-scan"}
      {/if}
    </button>
  </div>

  {#if loading}
    <div class="skeleton-grid">
      {#each [0,1,2,3] as _}
        <div class="skeleton-card"></div>
      {/each}
    </div>
  {:else if agents.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="14" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M18 11v7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <p>{t("noAgents") || "No agents found"}</p>
      <p class="empty-hint">Install Claude Code, Codex, Kimi, or Qwen Code to get started.</p>
    </div>
  {:else}
    <div class="agent-list">
      {#each agents as agent}
        {@const meta = agentMeta[agent.id] ?? { color: "var(--text-3)", bg: "var(--surface-2)", border: "var(--border-soft)" }}
        <div class="agent-row {agent.detected ? '' : 'dimmed'}">
          <!-- Logo badge -->
          <div class="agent-logo" style="background: {meta.bg}; border-color: {meta.border};">
            <img
              src={meta.logo}
              alt="{agent.name} logo"
              class="agent-logo-img {agent.id}"
            />
          </div>

          <!-- Info -->
          <div class="agent-info">
            <div class="agent-name-row">
              <span class="agent-name">{agent.name}</span>
              {#if agent.detected}
                <span class="tag tag-green">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>
                  {t("detected") || "Detected"}
                </span>
              {:else}
                <span class="tag tag-muted">{t("notDetected") || "Not found"}</span>
              {/if}
            </div>
            <div class="agent-desc">{agent.description || ""}</div>
            {#if agent.detected && agent.logDir}
              <div class="agent-path">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 2.5h2.5L5 1h4v8H1V2.5z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>
                <code>{agent.logDir}</code>
              </div>
            {:else if !agent.detected}
              <div class="agent-hint">Install {agent.name} to enable memory sync</div>
            {/if}
          </div>

          <!-- Toggle -->
          {#if agent.detected}
            <div class="agent-toggle-wrap">
              <button
                class="toggle-pill {enabledAgents.has(agent.id) ? 'on' : 'off'}"
                on:click={() => toggleAgent(agent.id, !enabledAgents.has(agent.id))}
                disabled={savingAgent === agent.id}
                aria-label="Toggle {agent.name}"
              >
                <span class="toggle-thumb"></span>
              </button>
              <span class="toggle-state">{enabledAgents.has(agent.id) ? (t("enabled") || "On") : (t("disabled") || "Off")}</span>
            </div>
          {:else}
            <div class="not-available">
              <span class="tag tag-muted">{t("install") || "Not installed"}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .agents-page { display: flex; flex-direction: column; gap: 0; }

  .agents-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .detect-btn { flex-shrink: 0; }

  /* Skeleton */
  .skeleton-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .skeleton-card { height: 80px; border-radius: var(--radius-lg); background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Empty */
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 4rem 1rem; color: var(--text-3); }
  .empty-icon { opacity: 0.35; }
  .empty-state p { font-size: 0.9rem; }
  .empty-hint { font-size: 0.78rem; opacity: 0.7; font-family: var(--font-mono); }

  /* Agent list */
  .agent-list { display: flex; flex-direction: column; gap: 0.75rem; }

  .agent-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    transition: border-color 0.15s;
  }

  .agent-row:hover { border-color: var(--border); }
  .agent-row.dimmed { opacity: 0.55; }

  /* Logo */
  .agent-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .agent-logo-img {
    display: block;
    object-fit: contain;
  }

  /* Claude: orange mark, no background padding needed */
  .agent-logo-img.claude { width: 26px; height: 26px; }
  /* Codex: black circle icon */
  .agent-logo-img.codex  { width: 30px; height: 30px; border-radius: 6px; }
  /* Kimi: dark background image, fill the badge */
  .agent-logo-img.kimi   { width: 44px; height: 44px; border-radius: 11px; }
  /* Qwen: colorful hexagonal icon */
  .agent-logo-img.qwen   { width: 30px; height: 30px; }

  /* Info */
  .agent-info { flex: 1; min-width: 0; }

  .agent-name-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
  .agent-name { font-size: 0.9rem; font-weight: 600; color: var(--text); }

  .agent-desc { font-size: 0.78rem; color: var(--text-3); margin-bottom: 0.35rem; }

  .agent-path {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.71rem;
    color: var(--text-3);
  }
  .agent-path code { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .agent-path svg { flex-shrink: 0; }

  .agent-hint { font-size: 0.75rem; color: var(--text-3); font-style: italic; }

  /* Toggle */
  .agent-toggle-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; flex-shrink: 0; }

  .toggle-pill {
    width: 40px;
    height: 22px;
    border-radius: 11px;
    border: none;
    cursor: pointer;
    position: relative;
    transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    padding: 0;
  }

  .toggle-pill.on { background: var(--accent); }
  .toggle-pill.off { background: var(--surface-3); }
  .toggle-pill:disabled { opacity: 0.5; cursor: not-allowed; }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle-pill.on .toggle-thumb { transform: translateX(18px); }

  .toggle-state { font-size: 0.68rem; color: var(--text-3); font-weight: 500; }

  .not-available { flex-shrink: 0; }

  .spin-icon { display: flex; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .agents-header { flex-direction: column; gap: 0.75rem; }
    .detect-btn { align-self: flex-start; }
    .agent-row { flex-wrap: wrap; }
    .agent-toggle-wrap { flex-direction: row; }
  }
</style>
