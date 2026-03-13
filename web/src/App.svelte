<script>
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

  const tabIcons = {
    dashboard: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".9"/><rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/><rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/><rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity=".3"/></svg>`,
    config: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" fill="currentColor"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    agents: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" fill="currentColor" opacity=".8"/><circle cx="9" cy="4" r="2" fill="currentColor" opacity=".4"/><path d="M1 11c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M9 7c1.66 0 3 1.34 3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".5"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.3"/><path d="M9.5 9.5L13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };
</script>

<div class="app">
  <!-- Ambient background -->
  <div class="ambient" aria-hidden="true">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
  </div>

  <!-- Header -->
  <header class="header">
    <div class="brand">
      <div class="brain-mark">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C6.69 2 4 4.69 4 8c0 1.5.54 2.87 1.43 3.93L4 18h12l-1.43-6.07A5.96 5.96 0 0016 8c0-3.31-2.69-6-6-6z" fill="oklch(68% 0.18 285)"/>
          <path d="M7.5 8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z" fill="oklch(90% 0.06 285)"/>
          <path d="M10 2v4M7 4.27L9 7M13 4.27L11 7" stroke="oklch(80% 0.12 285)" stroke-width="1" stroke-linecap="round" opacity=".6"/>
        </svg>
      </div>
      <span class="brand-name">EverMem</span>
      <span class="brand-version">async</span>
    </div>

    <nav class="nav" role="tablist">
      {#each tabs as tab}
        <button
          role="tab"
          aria-selected={activeTab === tab}
          class="nav-tab {activeTab === tab ? 'active' : ''}"
          on:click={() => activeTab = tab}
        >
          <span class="tab-icon">{@html tabIcons[tab]}</span>
          <span class="tab-label">{t(tab)}</span>
        </button>
      {/each}
    </nav>

    <button class="lang-btn" on:click={toggleLang} aria-label="Switch language">
      {t("lang")}
    </button>
  </header>

  <!-- Content -->
  <main class="content" role="tabpanel">
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
  /* ── Design tokens ── */
  :global(:root) {
    --bg:           oklch(10% 0.02 285);
    --surface:      oklch(14% 0.025 285);
    --surface-2:    oklch(17% 0.03 285);
    --surface-3:    oklch(20% 0.03 285);
    --border:       oklch(25% 0.03 285);
    --border-soft:  oklch(22% 0.025 285);

    --text:         oklch(93% 0.02 285);
    --text-2:       oklch(70% 0.04 285);
    --text-3:       oklch(50% 0.04 285);

    --accent:       oklch(65% 0.2 285);
    --accent-2:     oklch(72% 0.18 285);
    --accent-glow:  oklch(65% 0.2 285 / 0.15);
    --accent-dim:   oklch(65% 0.2 285 / 0.1);

    --green:        oklch(68% 0.18 155);
    --green-glow:   oklch(68% 0.18 155 / 0.2);
    --red:          oklch(62% 0.2 25);
    --amber:        oklch(75% 0.17 75);

    --radius-sm:    6px;
    --radius:       10px;
    --radius-lg:    16px;
    --radius-xl:    20px;

    --font-sans: "DM Sans", "SF Pro Display", -apple-system, sans-serif;
    --font-mono: "Geist Mono", "SF Mono", ui-monospace, monospace;

    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  /* ── Google Fonts ── */
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.55;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  :global(::selection) {
    background: var(--accent-dim);
    color: var(--text);
  }

  :global(:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* ── Ambient orbs ── */
  .ambient {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    top: -200px;
    right: -100px;
    background: oklch(65% 0.2 285 / 0.06);
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    bottom: -150px;
    left: -100px;
    background: oklch(60% 0.15 240 / 0.05);
  }

  /* ── Layout ── */
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 1.5rem;
    height: 52px;
    border-bottom: 1px solid var(--border-soft);
    background: oklch(12% 0.02 285 / 0.85);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  /* Brand */
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-right: 2rem;
  }

  .brain-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--accent-dim);
    border-radius: 7px;
    border: 1px solid oklch(65% 0.2 285 / 0.2);
  }

  .brand-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .brand-version {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--accent-2);
    background: var(--accent-dim);
    border: 1px solid oklch(65% 0.2 285 / 0.2);
    padding: 0.1rem 0.45rem;
    border-radius: 20px;
    letter-spacing: 0.03em;
    text-transform: lowercase;
  }

  /* Nav */
  .nav {
    display: flex;
    gap: 2px;
    flex: 1;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: transparent;
    border: none;
    padding: 0.35rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 400;
    color: var(--text-3);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: color 0.15s, background 0.15s;
    font-family: var(--font-sans);
    letter-spacing: 0.01em;
    position: relative;
  }

  .nav-tab:hover {
    color: var(--text-2);
    background: var(--surface-2);
  }

  .nav-tab.active {
    color: var(--accent-2);
    background: var(--accent-dim);
    font-weight: 500;
  }

  .tab-icon {
    display: flex;
    align-items: center;
    opacity: 0.9;
  }

  .tab-label { line-height: 1; }

  /* Lang */
  .lang-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-3);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-sans);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    margin-left: auto;
  }

  .lang-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-dim);
  }

  /* ── Content ── */
  .content {
    flex: 1;
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  /* ── Shared component styles ── */
  :global(.page-title) {
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.02em;
    margin-bottom: 0.3rem;
  }

  :global(.page-subtitle) {
    font-size: 0.85rem;
    color: var(--text-3);
    margin-bottom: 2rem;
  }

  :global(.btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: none;
    border-radius: var(--radius);
    padding: 0.55rem 1.1rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s var(--ease-out);
    font-family: var(--font-sans);
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  :global(.btn-accent) {
    background: var(--accent);
    color: oklch(100% 0 0);
  }

  :global(.btn-accent:hover:not(:disabled)) {
    background: var(--accent-2);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px var(--accent-glow);
  }

  :global(.btn-accent:active:not(:disabled)) {
    transform: translateY(0);
  }

  :global(.btn-ghost) {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-2);
  }

  :global(.btn-ghost:hover:not(:disabled)) {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-dim);
  }

  :global(.btn:disabled) {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  :global(.field-group) {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  :global(.field-label) {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-2);
    letter-spacing: 0.01em;
  }

  :global(.field-hint) {
    font-size: 0.75rem;
    color: var(--text-3);
    line-height: 1.4;
  }

  :global(.input) {
    background: var(--surface-2);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius);
    padding: 0.6rem 0.85rem;
    color: var(--text);
    font-size: 0.88rem;
    font-family: var(--font-sans);
    width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  :global(.input:focus) {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  :global(.input::placeholder) {
    color: var(--text-3);
  }

  :global(.mono) {
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  :global(.tag) {
    display: inline-flex;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.18rem 0.55rem;
    border-radius: 20px;
    letter-spacing: 0.02em;
  }

  :global(.tag-accent) {
    background: var(--accent-dim);
    color: var(--accent-2);
    border: 1px solid oklch(65% 0.2 285 / 0.2);
  }

  :global(.tag-green) {
    background: oklch(68% 0.18 155 / 0.12);
    color: var(--green);
    border: 1px solid oklch(68% 0.18 155 / 0.2);
  }

  :global(.tag-red) {
    background: oklch(62% 0.2 25 / 0.12);
    color: var(--red);
    border: 1px solid oklch(62% 0.2 25 / 0.2);
  }

  :global(.tag-muted) {
    background: var(--surface-2);
    color: var(--text-3);
    border: 1px solid var(--border-soft);
  }

  :global(.divider) {
    height: 1px;
    background: var(--border-soft);
    margin: 1.5rem 0;
  }

  /* ── Skeleton loading ── */
  :global(.skeleton) {
    background: linear-gradient(
      90deg,
      var(--surface-2) 25%,
      var(--surface-3) 50%,
      var(--surface-2) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
    border-radius: var(--radius-sm);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .header { padding: 0 1rem; }
    .brand-version { display: none; }
    .tab-label { display: none; }
    .nav-tab { padding: 0.4rem 0.6rem; }
    .brand { margin-right: 1rem; }
    .content { padding: 1.25rem 1rem; }
  }
</style>
