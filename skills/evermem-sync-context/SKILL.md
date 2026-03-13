---
name: evermem-sync-context
description: >
  Query EverMemOS for this project's development history, current state, and future
  roadmap, then write the result into the current AI tool's context file (CLAUDE.md,
  .cursorrules, AGENTS.md, etc). Use when starting a session on a familiar project
  and want to skip the "re-explain everything" overhead. Triggers on: "sync context",
  "load project context", "update context file with memory", "what have we done on
  this project", "bootstrap project context", "load my memory into CLAUDE.md".
license: MIT
compatibility: Requires evermem CLI installed globally (npm install -g evermem-async)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
---

# evermem: Sync Project Context

Queries EverMemOS for everything you've discussed about this project across all past
sessions, synthesizes it into structured context, and writes it into the **current
tool's config file** — so future sessions start with full context without re-explaining.

Run this **once per project** to bootstrap, then re-run whenever context drifts.

---

## Steps

Execute in order. Do not skip steps.

### Step 1 — Identify the project and current tool

Read `package.json`, `pyproject.toml`, `Cargo.toml`, or equivalent to get the project name.

Detect which context file(s) to write by checking what exists in the current directory:

| Config file found | Tool | Write target |
|-------------------|------|--------------|
| `CLAUDE.md` | Claude Code / Kimi / Qwen | Update `CLAUDE.md` |
| `.cursorrules` | Cursor IDE | Update `.cursorrules` |
| `AGENTS.md` | Codex CLI | Update `AGENTS.md` |
| None of the above | Unknown | Create `CLAUDE.md` (default) |

If multiple exist, write to **all** of them.

### Step 2 — Search EverMemOS (run all queries)

Replace `<project>` with the actual project name, then run **all five** searches:

```bash
evermem search --query "<project> 开发进展 功能 实现" --top-k 10
evermem search --query "<project> architecture design decisions tech stack" --top-k 8
evermem search --query "<project> bug fix problem 问题 解决" --top-k 6
evermem search --query "<project> future plan roadmap next steps 计划 方向" --top-k 6
evermem search --query "<project> current status 现状 已完成 待完成" --top-k 8
```

Collect all results. Deduplicate overlapping memories by content.

### Step 3 — Read git history

```bash
git log --oneline -30
git log --since="30 days ago" --format="%ad %s" --date=short
```

### Step 4 — Read existing config files

Read all target config files identified in Step 1. Note what sections exist — preserve
everything except the `## Project Context` section (which you will replace).

### Step 5 — Synthesize and write to CLAUDE.md / AGENTS.md

For markdown config files (`CLAUDE.md`, `AGENTS.md`), write the following section:

```markdown
## Project Context
<!-- last synced: YYYY-MM-DD -->

### 开发现状 / Current State
- (已实现的核心功能，一句话一条)
- (当前技术架构要点)
- (版本状态)

### 开发历程 / Key Decisions
- (重大技术选型/架构决策，及原因)
- (解决过的关键问题)
- (踩过的坑，后人避免重复)

### 未来方向 / Roadmap
- (P0: 计划中的下一个功能)
- (P1: 已知问题/技术欠债)
- (P2: 长线方向)
```

**Rules for markdown files:**
- Preserve ALL existing content — only add/replace the `## Project Context` section
- If the section already exists, replace it entirely
- Update `<!-- last synced: YYYY-MM-DD -->` to today's date
- Write in the same language style as the rest of the file
- Bullet points only, not paragraphs
- Only write what appears in memories or git log — do NOT hallucinate

### Step 6 — Write to .cursorrules

`.cursorrules` is plain-text (not markdown). Write the Project Context block **at the
top** of the file, before any existing rules:

```
# Project Context (synced YYYY-MM-DD)
Current State:
- ...
Key Decisions:
- ...
Roadmap:
- ...

---
[existing .cursorrules content continues below]
```

If `.cursorrules` already has a `# Project Context` block at the top, replace it.

### Step 7 — Report

Tell the user:
- How many memories were found across the five searches
- Which files were written or updated
- One-line summary of the project state you synthesized
