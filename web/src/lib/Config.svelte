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
      if (!payload.apiKey) delete payload.apiKey; // Don't overwrite with empty
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

<div class="config">
  <h2>{t("configTitle")}</h2>

  {#if loading}
    <div class="spinner">⟳</div>
  {:else}
    <form on:submit|preventDefault={saveConfig} class="form">

      <!-- API Key -->
      <div class="field">
        <label>{t("apiKey")}</label>
        <div class="input-row">
          {#if showKey}
            <input
              type="text"
              bind:value={form.apiKey}
              placeholder={config.apiKey ? "***" + (config.apiKey.slice(-4) ?? "") : t("apiKeyPlaceholder")}
            />
          {:else}
            <input
              type="password"
              bind:value={form.apiKey}
              placeholder={config.apiKey ? "***" + (config.apiKey.slice(-4) ?? "") : t("apiKeyPlaceholder")}
            />
          {/if}
          <button type="button" class="btn-ghost" on:click={() => showKey = !showKey}>
            {showKey ? t("hide") : t("show")}
          </button>
        </div>
        <div class="help">{t("apiKeyHelp")} — evermind.ai</div>
        {#if config.apiKey}
          <div class="status-ok">✓ Configured ({config.apiKey})</div>
        {/if}
      </div>

      <!-- Interval -->
      <div class="field-row">
        <div class="field">
          <label>{t("interval")}</label>
          <input type="number" bind:value={form.interval} min="1" max="1440" />
          <div class="help">{t("intervalHelp")}</div>
        </div>

        <div class="field">
          <label>{t("port")}</label>
          <input type="number" bind:value={form.port} min="1024" max="65535" />
        </div>
      </div>

      <!-- User ID -->
      <div class="field">
        <label>{t("userId")}</label>
        <input type="text" bind:value={form.userId} />
        <div class="help">{t("userIdHelp")}</div>
      </div>

      <!-- Max Turns -->
      <div class="field">
        <label>{t("maxTurns")}</label>
        <input type="number" bind:value={form.maxTurnsPerSession} min="10" max="2000" />
        <div class="help">{t("maxTurnsHelp")}</div>
      </div>

      <!-- Submit -->
      <div class="actions">
        <button type="submit" class="btn-primary" disabled={saving}>
          {saving ? t("saving") : saved ? t("saved") : t("save")}
        </button>
        {#if saved}
          <span class="success-text">{t("configSaved")}</span>
        {/if}
      </div>

    </form>
  {/if}
</div>

<style>
  .config { padding: 1.5rem; max-width: 560px; }
  h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1.5rem; color: var(--text); }
  .spinner { text-align: center; font-size: 2rem; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .form { display: flex; flex-direction: column; gap: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  label { font-size: 0.85rem; font-weight: 500; color: var(--text); }
  input { background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.55rem 0.75rem; color: var(--text); font-size: 0.9rem; width: 100%; box-sizing: border-box; transition: border-color 0.2s; }
  input:focus { outline: none; border-color: var(--accent); }
  .help { font-size: 0.75rem; color: var(--text-muted); }
  .status-ok { font-size: 0.75rem; color: #22c55e; }

  .input-row { display: flex; gap: 0.5rem; }
  .input-row input { flex: 1; }
  .btn-ghost { background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 0.55rem 0.75rem; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  .actions { display: flex; align-items: center; gap: 1rem; padding-top: 0.5rem; }
  .btn-primary { background: var(--accent); color: white; border: none; border-radius: 8px; padding: 0.65rem 1.5rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
  .btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .success-text { color: #22c55e; font-size: 0.85rem; }
</style>
