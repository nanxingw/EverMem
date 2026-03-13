<script>
  export let t;

  let query = "";
  let method = "hybrid";
  let topK = 10;
  let results = null;
  let searching = false;
  let syncing = false;
  let syncDone = false;
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

  function handleKey(e) {
    if (e.key === "Enter") search();
  }

  function scoreColor(score) {
    if (!score) return "var(--text-3)";
    if (score >= 0.8) return "var(--green)";
    if (score >= 0.5) return "var(--amber)";
    return "var(--red)";
  }

  function scoreLabel(score) {
    if (!score) return "";
    return (score * 100).toFixed(0) + "%";
  }

  $: totalResults = (results?.memories?.length ?? 0) + (results?.profiles?.length ?? 0);
</script>

<div class="search-page">
  <div class="search-header">
    <div>
      <h1 class="page-title">{t("searchTitle")}</h1>
      <p class="page-subtitle">{t("searchSubtitle") || "Semantic search across your stored memories"}</p>
    </div>
    <button
      class="btn btn-ghost sync-trigger {syncDone ? 'done' : ''}"
      on:click={triggerSync}
      disabled={syncing}
    >
      {#if syncDone}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {t("runSuccess") || "Synced"}
      {:else if syncing}
        <span class="spin-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 10" stroke-linecap="round"/></svg>
        </span>
        {t("syncing") || "Syncing…"}
      {:else}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 6.5A4.5 4.5 0 013.1 8.5M2 6.5A4.5 4.5 0 019.9 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 4.5v2h-2M2 8.5v-2h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        {t("triggerRun") || "Sync Now"}
      {/if}
    </button>
  </div>

  <!-- Search input -->
  <div class="search-box">
    <div class="search-input-wrap">
      <div class="search-icon">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </div>
      <input
        type="text"
        class="search-input"
        bind:value={query}
        placeholder={t("searchPlaceholder") || "Search your memories…"}
        on:keydown={handleKey}
      />
      {#if query}
        <button class="clear-btn" on:click={() => { query = ""; results = null; error = null; }} aria-label="Clear">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
      {/if}
    </div>
    <button
      class="btn btn-accent search-btn"
      on:click={search}
      disabled={searching || !query.trim()}
    >
      {#if searching}
        <span class="spin-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 10" stroke-linecap="round"/></svg>
        </span>
        {t("searching") || "Searching…"}
      {:else}
        {t("searchBtn") || "Search"}
      {/if}
    </button>
  </div>

  <!-- Controls -->
  <div class="search-controls">
    <div class="method-group">
      <span class="ctrl-label">{t("searchMethod") || "Method"}</span>
      <div class="method-pills">
        {#each methods as m}
          <button
            class="method-pill {method === m ? 'active' : ''}"
            on:click={() => method = m}
          >{t(m) || m}</button>
        {/each}
      </div>
    </div>
    <div class="topk-group">
      <span class="ctrl-label">{t("topK") || "Top"}</span>
      <div class="topk-stepper">
        <button class="stepper-btn" on:click={() => topK = Math.max(1, topK - 5)} disabled={topK <= 1}>−</button>
        <span class="topk-val">{topK}</span>
        <button class="stepper-btn" on:click={() => topK = Math.min(50, topK + 5)} disabled={topK >= 50}>+</button>
      </div>
    </div>
  </div>

  <!-- Results area -->
  {#if error}
    <div class="error-banner">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M7 4.5V7M7 9.5v.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      {error}
    </div>
  {:else if searching}
    <div class="searching-state">
      <div class="search-shimmer"></div>
      <div class="search-shimmer short"></div>
      <div class="search-shimmer"></div>
    </div>
  {:else if results !== null}
    {#if totalResults === 0}
      <div class="empty-results">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M21.5 21.5L28 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <p>{t("noResults") || "No memories found"}</p>
        <p class="empty-hint">Try a different query or sync first</p>
      </div>
    {:else}
      <div class="results-meta">
        <span class="results-count">{totalResults} {totalResults === 1 ? "result" : "results"}</span>
        {#if results.metadata?.latency_ms != null}
          <span class="results-latency">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1.5v4l2.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1"/></svg>
            {results.metadata.latency_ms}ms
          </span>
        {/if}
      </div>

      <!-- Profile memories -->
      {#if results.profiles?.length > 0}
        <div class="result-section">
          <div class="section-label-row">
            <span class="section-label">{t("profileMemories") || "Profile"}</span>
            <span class="section-count">{results.profiles.length}</span>
          </div>
          {#each results.profiles as p}
            <div class="result-card profile-card">
              <div class="result-top">
                <span class="type-badge profile">{p.item_type ?? "profile"}</span>
                {#if p.score}
                  <span class="score-chip" style="color: {scoreColor(p.score)}">{scoreLabel(p.score)}</span>
                {/if}
              </div>
              {#if p.category ?? p.trait_name}
                <div class="result-title">{p.category ?? p.trait_name}</div>
              {/if}
              <div class="result-body">{p.description ?? "—"}</div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Episodic memories -->
      {#if results.memories?.length > 0}
        <div class="result-section">
          <div class="section-label-row">
            <span class="section-label">{t("episodicMemories") || "Episodic"}</span>
            <span class="section-count">{results.memories.length}</span>
          </div>
          {#each results.memories as m}
            <div class="result-card">
              <div class="result-top">
                <span class="type-badge episodic">{m.memory_type ?? "memory"}</span>
                {#if m.score}
                  <span class="score-chip" style="color: {scoreColor(m.score)}">{scoreLabel(m.score)}</span>
                {/if}
                {#if m.timestamp}
                  <span class="result-time">{new Date(m.timestamp).toLocaleDateString()}</span>
                {/if}
              </div>
              <div class="result-body">{m.summary ?? m.content ?? "—"}</div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {:else}
    <!-- Idle: search prompt illustration -->
    <div class="idle-state">
      <div class="idle-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="18" cy="18" r="12" stroke="var(--border)" stroke-width="1.5"/>
          <circle cx="18" cy="18" r="12" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.5"/>
          <circle cx="18" cy="18" r="6" stroke="var(--accent)" stroke-width="1.2" opacity="0.3"/>
          <path d="M27 27l7 7" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="idle-text">{t("searchIdle") || "Search across your conversation history"}</p>
      <p class="idle-hint">{t("searchIdleHint") || "Supports keyword, vector, and hybrid retrieval"}</p>
    </div>
  {/if}
</div>

<style>
  .search-page { display: flex; flex-direction: column; gap: 0; }

  .search-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }

  .sync-trigger.done { color: var(--green); border-color: oklch(50% 0.15 145 / 0.4); }

  /* Search box */
  .search-box { display: flex; gap: 0.65rem; margin-bottom: 1rem; }

  .search-input-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.85rem;
    color: var(--text-3);
    display: flex;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius);
    padding: 0.65rem 2.5rem 0.65rem 2.5rem;
    color: var(--text);
    font-size: 0.9rem;
    font-family: var(--font-sans);
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .search-input::placeholder { color: var(--text-3); }

  .clear-btn {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    display: flex;
    padding: 0.2rem;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .clear-btn:hover { color: var(--text-2); }

  .search-btn { flex-shrink: 0; }

  /* Controls */
  .search-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
  }

  .ctrl-label {
    font-size: 0.75rem;
    color: var(--text-3);
    font-weight: 500;
    white-space: nowrap;
  }

  .method-group, .topk-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .method-pills { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-sm); padding: 2px; }
  .method-pill {
    background: transparent;
    border: none;
    padding: 0.28rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    border-radius: calc(var(--radius-sm) - 2px);
    transition: all 0.15s;
    font-family: var(--font-sans);
    white-space: nowrap;
  }
  .method-pill:hover:not(.active) { color: var(--text-2); background: var(--surface-2); }
  .method-pill.active { background: var(--accent); color: #fff; }

  .topk-stepper { display: flex; align-items: center; gap: 0; background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius-sm); overflow: hidden; }
  .stepper-btn {
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    width: 28px;
    height: 28px;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
    font-family: var(--font-sans);
  }
  .stepper-btn:hover:not(:disabled) { color: var(--text); background: var(--surface-2); }
  .stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .topk-val { font-size: 0.8rem; font-weight: 600; color: var(--text); min-width: 28px; text-align: center; font-variant-numeric: tabular-nums; }

  /* States */
  .error-banner { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: oklch(52% 0.2 22 / 0.06); border: 1px solid oklch(52% 0.2 22 / 0.18); border-radius: var(--radius); color: var(--red); font-size: 0.85rem; }

  .searching-state { display: flex; flex-direction: column; gap: 0.75rem; }
  .search-shimmer { height: 80px; border-radius: var(--radius-lg); background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
  .search-shimmer.short { height: 56px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .empty-results { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3.5rem 1rem; color: var(--text-3); }
  .empty-icon { opacity: 0.35; }
  .empty-results p { font-size: 0.9rem; }
  .empty-hint { font-size: 0.75rem; opacity: 0.7; font-family: var(--font-mono); }

  .idle-state { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 4rem 1rem; }
  .idle-icon { opacity: 0.6; }
  .idle-text { font-size: 0.9rem; color: var(--text-2); font-weight: 500; }
  .idle-hint { font-size: 0.78rem; color: var(--text-3); font-family: var(--font-mono); }

  /* Results */
  .results-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .results-count { font-size: 0.8rem; font-weight: 600; color: var(--text-2); }
  .results-latency { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: var(--text-3); font-variant-numeric: tabular-nums; }

  .result-section { margin-bottom: 1.5rem; }

  .section-label-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .section-label { font-size: 0.72rem; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
  .section-count { font-size: 0.7rem; font-weight: 600; background: var(--surface-2); color: var(--text-3); padding: 0.08rem 0.45rem; border-radius: 20px; border: 1px solid var(--border-soft); }

  .result-card {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    margin-bottom: 0.6rem;
    transition: border-color 0.12s;
  }
  .result-card:hover { border-color: var(--border); }

  .result-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }

  .type-badge {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .type-badge.profile { background: var(--accent-dim); color: var(--accent-2); border: 1px solid oklch(58% 0.19 45 / 0.2); }
  .type-badge.episodic { background: oklch(62% 0.17 72 / 0.1); color: var(--amber); border: 1px solid oklch(62% 0.17 72 / 0.2); }

  .score-chip { font-size: 0.72rem; font-weight: 600; font-variant-numeric: tabular-nums; }

  .result-time { font-size: 0.72rem; color: var(--text-3); margin-left: auto; font-variant-numeric: tabular-nums; }

  .result-title { font-size: 0.88rem; font-weight: 600; color: var(--text); margin-bottom: 0.3rem; }
  .result-body { font-size: 0.82rem; color: var(--text-2); line-height: 1.55; }

  .spin-icon { display: flex; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .search-header { flex-direction: column; gap: 0.75rem; }
    .search-box { flex-direction: column; }
    .search-controls { gap: 1rem; }
  }
</style>
