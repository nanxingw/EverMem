<script>
  import { writable } from "svelte/store";
  import Dashboard from "./lib/Dashboard.svelte";
  import Config from "./lib/Config.svelte";
  import Agents from "./lib/Agents.svelte";
  import Search from "./lib/Search.svelte";
  import { createI18n } from "./lib/i18n.js";

  let lang = localStorage.getItem("evermem-lang") || "zh";
  $: t = createI18n(lang);

  function toggleLang() {
    lang = lang === "zh" ? "en" : "zh";
    localStorage.setItem("evermem-lang", lang);
  }

  let activeTab = "dashboard";
  const tabs = ["dashboard", "config", "agents", "search"];
</script>

<div class="app">
  <!-- Header -->
  <header class="header">
    <div class="brand">
      <span class="logo">🧠</span>
      <span class="brand-name">EverMem</span>
      <span class="brand-sub">Async</span>
    </div>

    <nav class="nav">
      {#each tabs as tab}
        <button
          class="nav-tab {activeTab === tab ? 'active' : ''}"
          on:click={() => activeTab = tab}
        >
          {t(tab)}
        </button>
      {/each}
    </nav>

    <button class="lang-btn" on:click={toggleLang}>{t("lang")}</button>
  </header>

  <!-- Content -->
  <main class="content">
    {#if activeTab === "dashboard"}
      <Dashboard {t} />
    {:else if activeTab === "config"}
      <Config {t} />
    {:else if activeTab === "agents"}
      <Agents {t} />
    {:else if activeTab === "search"}
      <Search {t} />
    {/if}
  </main>
</div>

<style>
  :global(:root) {
    --bg: #0f0f13;
    --card-bg: #1a1a22;
    --border: #2a2a38;
    --text: #e8e8f0;
    --text-muted: #6b6b8a;
    --accent: #7c6af7;
    --accent-dim: rgba(124, 106, 247, 0.15);
    --input-bg: #13131a;
  }

  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
    min-height: 100vh;
  }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1.5rem;
    height: 56px;
    border-bottom: 1px solid var(--border);
    background: rgba(26, 26, 34, 0.9);
    backdrop-filter: blur(12px);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .brand { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
  .logo { font-size: 1.2rem; }
  .brand-name { font-size: 1rem; font-weight: 700; color: var(--text); }
  .brand-sub { font-size: 0.75rem; color: var(--accent); font-weight: 500; background: var(--accent-dim); padding: 0.1rem 0.4rem; border-radius: 4px; }

  .nav { display: flex; gap: 0.25rem; flex: 1; justify-content: center; }
  .nav-tab { background: transparent; border: none; padding: 0.4rem 0.85rem; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; border-radius: 6px; transition: all 0.15s; }
  .nav-tab:hover { color: var(--text); background: var(--card-bg); }
  .nav-tab.active { color: var(--accent); background: var(--accent-dim); font-weight: 500; }

  .lang-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); border-radius: 6px; padding: 0.3rem 0.65rem; font-size: 0.8rem; cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
  .lang-btn:hover { border-color: var(--accent); color: var(--accent); }

  .content { flex: 1; max-width: 900px; width: 100%; margin: 0 auto; padding: 1rem 0; }

  @media (max-width: 600px) {
    .header { padding: 0 1rem; }
    .brand-sub { display: none; }
    .nav-tab { padding: 0.4rem 0.5rem; font-size: 0.8rem; }
  }
</style>
