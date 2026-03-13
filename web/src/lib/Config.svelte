<script>
  import { onMount } from "svelte";

  export let t;

  let config = {};
  let loading = true;
  let saving = false;
  let saved = false;
  let showKey = false;
  let form = { apiKey: "", interval: 30, port: 7349, userId: "evermem-user", maxTurnsPerSession: 200 };

  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      config = await res.json();
      form = {
        apiKey: "",
        interval: config.interval ?? 30,
        port: config.port ?? 7349,
        userId: config.userId ?? "evermem-user",
        maxTurnsPerSession: config.maxTurnsPerSession ?? 200,
      };
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    if (saving) return;
    saving = true;
    saved = false;
    try {
      const payload = { ...form };
      if (!payload.apiKey) delete payload.apiKey;
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      config = (await res.json()).config;
      saved = true;
      setTimeout(() => { saved = false; }, 3000);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      saving = false;
    }
  }

  onMount(loadConfig);
</script>

<div class="config-page">
  <div class="page-header">
    <h1 class="page-title">{t("configTitle")}</h1>
    <p class="page-subtitle">{t("configSubtitle") || "Manage API credentials and sync preferences"}</p>
  </div>

  {#if loading}
    <div class="skeleton-form">
      <div class="skeleton-field"></div>
      <div class="skeleton-field short"></div>
      <div class="skeleton-field"></div>
    </div>
  {:else}
    <form on:submit|preventDefault={saveConfig} class="settings-form">

      <!-- API Key section -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1a3 3 0 110 6 3 3 0 010-6zM2 8l5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4 9.5v2M6 9v2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          </span>
          <span class="section-title">{t("apiKey")}</span>
          {#if config.apiKey}
            <span class="tag tag-green">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {t("configured") || "Configured"}
            </span>
          {/if}
        </div>

        <div class="field-group">
          <div class="key-input-wrap">
            {#if showKey}
              <input
                type="text"
                class="input key-input"
                bind:value={form.apiKey}
                placeholder={config.apiKey ? "••••" + config.apiKey.slice(-6) : (t("apiKeyPlaceholder") || "Enter your EverMemOS API key")}
              />
            {:else}
              <input
                type="password"
                class="input key-input"
                bind:value={form.apiKey}
                placeholder={config.apiKey ? "••••" + config.apiKey.slice(-6) : (t("apiKeyPlaceholder") || "Enter your EverMemOS API key")}
              />
            {/if}
            <button type="button" class="eye-btn" on:click={() => showKey = !showKey} aria-label="Toggle visibility">
              {#if showKey}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7c1.5-3.5 5-4.5 6-4.5S11.5 3.5 13 7c-1.5 3.5-5 4.5-6 4.5S2.5 10.5 1 7z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 2l10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              {:else}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7c1.5-3.5 5-4.5 6-4.5S11.5 3.5 13 7c-1.5 3.5-5 4.5-6 4.5S2.5 10.5 1 7z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
              {/if}
            </button>
          </div>
          <p class="field-hint">{t("apiKeyHelp") || "Get your key from"} <span class="hint-link">evermind.ai</span></p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Sync settings -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 4v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="section-title">{t("syncSettings") || "Sync Settings"}</span>
        </div>

        <div class="fields-grid">
          <div class="field-group">
            <label class="field-label">{t("interval")}</label>
            <div class="number-input-wrap">
              <input type="number" class="input number-input" bind:value={form.interval} min="1" max="1440" />
              <span class="input-unit">{t("minutes")}</span>
            </div>
            <p class="field-hint">{t("intervalHelp") || "How often to auto-sync memories (1–1440)"}</p>
          </div>

          <div class="field-group">
            <label class="field-label">{t("port")}</label>
            <div class="number-input-wrap">
              <input type="number" class="input number-input" bind:value={form.port} min="1024" max="65535" />
            </div>
            <p class="field-hint">{t("portHelp") || "Web dashboard port"}</p>
          </div>
        </div>

        <div class="field-group" style="margin-top: 1rem;">
          <label class="field-label">{t("maxTurns")}</label>
          <div class="number-input-wrap">
            <input type="number" class="input number-input" bind:value={form.maxTurnsPerSession} min="10" max="2000" />
            <span class="input-unit">{t("turns") || "turns"}</span>
          </div>
          <p class="field-hint">{t("maxTurnsHelp") || "Maximum conversation turns to extract per session"}</p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Identity -->
      <div class="settings-section">
        <div class="section-header">
          <span class="section-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          </span>
          <span class="section-title">{t("identity") || "Identity"}</span>
        </div>

        <div class="field-group">
          <label class="field-label">{t("userId")}</label>
          <input type="text" class="input" bind:value={form.userId} />
          <p class="field-hint">{t("userIdHelp") || "Used to group your memories in EverMemOS"}</p>
        </div>
      </div>

      <!-- Save -->
      <div class="save-bar">
        <button
          type="submit"
          class="btn btn-accent save-btn {saved ? 'done' : ''}"
          disabled={saving}
        >
          {#if saved}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5 9.5L11 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {t("saved") || "Saved"}
          {:else if saving}
            <span class="spin-icon">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 10" stroke-linecap="round"/></svg>
            </span>
            {t("saving") || "Saving…"}
          {:else}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3.5 3.5L11 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/><path d="M2 2h7l2 2v7H2V2z" stroke="currentColor" stroke-width="1.2"/><rect x="4" y="7" width="5" height="4" rx=".5" stroke="currentColor" stroke-width="1.2"/></svg>
            {t("save") || "Save Changes"}
          {/if}
        </button>
      </div>

    </form>
  {/if}
</div>

<style>
  .config-page { display: flex; flex-direction: column; gap: 0; }

  .page-header { margin-bottom: 2rem; }

  /* Skeleton */
  .skeleton-form { display: flex; flex-direction: column; gap: 1rem; }
  .skeleton-field { height: 56px; border-radius: var(--radius-lg); background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
  .skeleton-field.short { height: 36px; width: 60%; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Form */
  .settings-form { display: flex; flex-direction: column; gap: 0; }

  .settings-section { padding: 1.5rem 0; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.1rem;
  }

  .section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--accent-dim);
    border: 1px solid oklch(65% 0.2 285 / 0.2);
    border-radius: 6px;
    color: var(--accent-2);
    flex-shrink: 0;
  }

  .section-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex: 1;
  }

  .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

  /* Key input */
  .key-input-wrap { position: relative; }
  .key-input { padding-right: 2.8rem; font-family: var(--font-mono); font-size: 0.82rem; letter-spacing: 0.05em; }
  .eye-btn {
    position: absolute;
    right: 0.7rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    display: flex;
    padding: 0.2rem;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .eye-btn:hover { color: var(--text-2); }

  /* Number input */
  .number-input-wrap { position: relative; display: flex; align-items: center; }
  .number-input { width: 100%; padding-right: 3.5rem; }
  .input-unit {
    position: absolute;
    right: 0.85rem;
    font-size: 0.75rem;
    color: var(--text-3);
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .hint-link { color: var(--accent-2); }

  /* Save bar */
  .save-bar {
    padding: 1.5rem 0 0;
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .save-btn { min-width: 140px; justify-content: center; }
  .save-btn.done { background: var(--green); }
  .spin-icon { display: flex; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .fields-grid { grid-template-columns: 1fr; }
  }
</style>
