<script>
  export let t;

  let query = "";
  let method = "hybrid";
  let topK = 10;
  let results = null;
  let searching = false;
  let syncing = false;
  let error = null;

  const methods = ["keyword", "vector", "hybrid", "agentic"];

  async function search() {
    if (!query.trim() || searching) return;
    searching = true;
    error = null;
    results = null;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&method=${method}&topK=${topK}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      results = data.result;
    } catch (e) {
      error = e.message;
    } finally {
      searching = false;
    }
  }

  async function triggerSync() {
    if (syncing) return;
    syncing = true;
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(t("runSuccess"));
    } catch (e) {
      alert(t("runError") + ": " + e.message);
    } finally {
      setTimeout(() => { syncing = false; }, 2000);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") search();
  }

  function scoreColor(score) {
    if (!score) return "#999";
    if (score >= 0.8) return "#22c55e";
    if (score >= 0.5) return "#f59e0b";
    return "#ef4444";
  }
</script>

<div class="search-page">
  <div class="header-row">
    <h2>{t("searchTitle")}</h2>
    <button class="btn-sync" on:click={triggerSync} disabled={syncing}>
      {syncing ? "⟳" : "+"} {t("triggerRun")}
    </button>
  </div>

  <!-- Search Controls -->
  <div class="search-bar">
    <input
      type="text"
      bind:value={query}
      placeholder={t("searchPlaceholder")}
      on:keydown={handleKey}
      class="search-input"
    />
    <button class="btn-search" on:click={search} disabled={searching || !query.trim()}>
      {searching ? t("searching") : t("searchBtn")}
    </button>
  </div>

  <div class="controls">
    <div class="control-group">
      <label>{t("searchMethod")}</label>
      <div class="method-tabs">
        {#each methods as m}
          <button class="method-tab {method === m ? 'active' : ''}" on:click={() => method = m}>
            {t(m)}
          </button>
        {/each}
      </div>
    </div>
    <div class="control-group">
      <label>{t("topK")}</label>
      <input type="number" bind:value={topK} min="1" max="50" class="topk-input" />
    </div>
  </div>

  <!-- Results -->
  {#if error}
    <div class="error-card">{error}</div>
  {:else if searching}
    <div class="loading-state">⟳ {t("searching")}</div>
  {:else if results !== null}
    {#if (results.memories?.length ?? 0) + (results.profiles?.length ?? 0) === 0}
      <div class="empty">{t("noResults")}</div>
    {:else}
      <!-- Profiles -->
      {#if results.profiles?.length > 0}
        <div class="section">
          <h4>Profile Memories ({results.profiles.length})</h4>
          {#each results.profiles as p}
            <div class="result-card">
              <div class="result-header">
                <span class="type-tag profile">{p.item_type ?? "profile"}</span>
                {#if p.score}
                  <span class="score-badge" style="color: {scoreColor(p.score)}">{p.score.toFixed(3)}</span>
                {/if}
              </div>
              <div class="result-title">{p.category ?? p.trait_name ?? "—"}</div>
              <div class="result-content">{p.description ?? "—"}</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Episodic Memories -->
      {#if results.memories?.length > 0}
        <div class="section">
          <h4>Episodic Memories ({results.memories.length})</h4>
          {#each results.memories as m}
            <div class="result-card">
              <div class="result-header">
                <span class="type-tag episodic">{m.memory_type ?? "memory"}</span>
                {#if m.score}
                  <span class="score-badge" style="color: {scoreColor(m.score)}">{m.score.toFixed(3)}</span>
                {/if}
                {#if m.timestamp}
                  <span class="time">{new Date(m.timestamp).toLocaleString()}</span>
                {/if}
              </div>
              <div class="result-content">{m.summary ?? m.content ?? "—"}</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Metadata -->
      {#if results.metadata}
        <div class="meta-bar">
          {#if results.metadata.latency_ms != null}
            <span>⚡ {results.metadata.latency_ms}ms</span>
          {/if}
          {#if results.metadata.total_count != null}
            <span>Total: {results.metadata.total_count}</span>
          {/if}
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .search-page { padding: 1.5rem; }
  .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  h2 { font-size: 1.1rem; font-weight: 600; color: var(--text); margin: 0; }
  .btn-sync { background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
  .btn-sync:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .btn-sync:disabled { opacity: 0.5; cursor: not-allowed; }

  .search-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .search-input { flex: 1; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.65rem 1rem; color: var(--text); font-size: 0.95rem; transition: border-color 0.2s; }
  .search-input:focus { outline: none; border-color: var(--accent); }
  .btn-search { background: var(--accent); color: white; border: none; border-radius: 8px; padding: 0.65rem 1.25rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; }
  .btn-search:hover:not(:disabled) { opacity: 0.85; }
  .btn-search:disabled { opacity: 0.5; cursor: not-allowed; }

  .controls { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .control-group { display: flex; align-items: center; gap: 0.5rem; }
  label { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
  .method-tabs { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .method-tab { background: transparent; border: none; padding: 0.35rem 0.7rem; font-size: 0.8rem; cursor: pointer; color: var(--text-muted); transition: all 0.15s; }
  .method-tab.active { background: var(--accent); color: white; }
  .method-tab:hover:not(.active) { background: var(--card-bg); }
  .topk-input { width: 60px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.5rem; color: var(--text); font-size: 0.85rem; text-align: center; }

  .loading-state { text-align: center; color: var(--text-muted); padding: 2rem; font-size: 1.1rem; }
  .error-card { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 1rem; color: #991b1b; }
  .empty { color: var(--text-muted); text-align: center; padding: 3rem; font-size: 0.95rem; }

  .section { margin-bottom: 1.5rem; }
  .section h4 { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.75rem; }

  .result-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
  .result-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .type-tag { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 500; }
  .type-tag.profile { background: #e0e7ff; color: #3730a3; }
  .type-tag.episodic { background: #fef3c7; color: #92400e; }
  .score-badge { font-size: 0.75rem; font-weight: 600; }
  .time { font-size: 0.75rem; color: var(--text-muted); margin-left: auto; }
  .result-title { font-weight: 500; color: var(--text); font-size: 0.9rem; margin-bottom: 0.25rem; }
  .result-content { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

  .meta-bar { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 0.75rem; }
</style>
