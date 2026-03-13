<script>
  import { onMount } from "svelte";

  export let t;

  let agents = [];
  let enabledAgents = new Set();
  let loading = true;
  let detecting = false;

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
    enabledAgents = new Set(enabledAgents);
    if (enabled) enabledAgents.add(agentId);
    else enabledAgents.delete(agentId);

    await fetch(`/api/agents/${agentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  onMount(loadAgents);

  const agentIcons = {
    claude: "🤖",
    codex: "⚡",
    kimi: "🌙",
    qwen: "🐉",
  };
</script>

<div class="agents">
  <div class="header">
    <h2>{t("agentsTitle")}</h2>
    <button class="btn-detect" on:click={redetect} disabled={detecting}>
      {detecting ? t("detecting") : t("detectAgents")}
    </button>
  </div>

  {#if loading}
    <div class="spinner">⟳</div>
  {:else if agents.length === 0}
    <div class="empty">{t("noAgents")}</div>
  {:else}
    <div class="agent-grid">
      {#each agents as agent}
        <div class="agent-card {agent.detected ? 'detected' : 'missing'}">
          <div class="agent-header">
            <span class="agent-icon">{agentIcons[agent.id] ?? "🔧"}</span>
            <div class="agent-info">
              <div class="agent-name">{agent.name}</div>
              <div class="agent-desc">{agent.description}</div>
            </div>
            <div class="agent-badge {agent.detected ? 'ok' : 'no'}">
              {agent.detected ? t("detected") : t("notDetected")}
            </div>
          </div>

          {#if agent.detected}
            <div class="agent-path">
              <span class="path-label">{t("logPath")}:</span>
              <code>{agent.logDir}</code>
            </div>

            <div class="agent-toggle">
              <label class="toggle">
                <input
                  type="checkbox"
                  checked={enabledAgents.has(agent.id)}
                  on:change={(e) => toggleAgent(agent.id, e.target.checked)}
                />
                <span class="slider"></span>
              </label>
              <span class="toggle-label">
                {enabledAgents.has(agent.id) ? t("enabled") : t("disabled")}
              </span>
            </div>
          {:else}
            <div class="not-installed">
              Install <strong>{agent.id}</strong> to enable memory sync
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .agents { padding: 1.5rem; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  h2 { font-size: 1.1rem; font-weight: 600; color: var(--text); margin: 0; }
  .btn-detect { background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
  .btn-detect:hover:not(:disabled) { background: var(--accent); color: white; }
  .btn-detect:disabled { opacity: 0.5; cursor: not-allowed; }
  .spinner { text-align: center; font-size: 2rem; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { color: var(--text-muted); text-align: center; padding: 2rem; }

  .agent-grid { display: flex; flex-direction: column; gap: 1rem; }
  .agent-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; transition: border-color 0.2s; }
  .agent-card.detected { border-color: var(--border); }
  .agent-card.missing { opacity: 0.6; }

  .agent-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
  .agent-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
  .agent-info { flex: 1; }
  .agent-name { font-weight: 600; color: var(--text); font-size: 0.95rem; }
  .agent-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.1rem; }
  .agent-badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: 500; white-space: nowrap; }
  .agent-badge.ok { background: #dcfce7; color: #15803d; }
  .agent-badge.no { background: #f5f5f5; color: #666; }

  .agent-path { background: var(--input-bg); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .path-label { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
  code { font-size: 0.75rem; color: var(--text); word-break: break-all; }

  .agent-toggle { display: flex; align-items: center; gap: 0.75rem; }
  .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background: #ccc; border-radius: 24px; transition: 0.3s; }
  .slider::before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  input:checked + .slider { background: var(--accent); }
  input:checked + .slider::before { transform: translateX(20px); }
  .toggle-label { font-size: 0.85rem; color: var(--text-muted); }

  .not-installed { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
</style>
