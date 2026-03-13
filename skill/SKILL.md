---
name: evermem
description: "EverMemOS-powered long-term memory for Claude Code. Provides two tools: (1) add-memories — auto-detects installed CLI agents (Claude Code, Codex, Kimi, Qwen Code), extracts user/assistant messages from session logs and stores them in EverMemOS cloud memory, (2) search-memories — semantic search across all stored memories using keyword, vector, or hybrid retrieval. Requires EVERMEMOS_API_KEY environment variable. Use this skill to persist important conversation context across sessions and retrieve relevant past knowledge."
allowed-tools:
  - Read
  - Bash
  - Glob
---

# EverMem — Multi-Agent Cloud Memory via EverMemOS

This skill connects AI coding CLI tools to [EverMemOS](https://docs.evermind.ai) for persistent, semantically searchable long-term memory.

## Supported Agents (auto-detected)

| Agent | Log Location |
|-------|-------------|
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Codex CLI | `~/.codex/sessions/**/rollout-*.jsonl` |
| Kimi CLI | `~/.kimi/sessions/**/context.jsonl` |
| Qwen Code | `~/.qwen/` or `$QWEN_SHARE_DIR` |

## Tools

### 1. add-memories — Ingest conversations from any agent

Auto-detects installed CLI agents, extracts **only final responses** (no thinking, no tool calls), uploads to EverMemOS.

```bash
# Auto-detect all installed agents, process recent 5 sessions each
evermem run

# Specific agents only
evermem run --agents claude,codex

# Only sessions newer than a timestamp
evermem run --since 2026-03-01T00:00:00Z

# Dry run (print turns without uploading)
evermem run --dry-run
```

### 2. search-memories — Semantic retrieval

```bash
# Hybrid search (recommended)
evermem search --query "React hooks patterns"

# Choose retrieval method
evermem search --query "user preferences" --method vector --top-k 5

# Raw JSON output
evermem search --query "debug session" --json
```

**Search methods:** `keyword` | `vector` | `hybrid` (default) | `agentic`

## When to Use

| When | Command |
|------|---------|
| Before starting work | `evermem search --query "project context"` |
| After finishing a session | `evermem run` |
| Scheduled background sync | Handled automatically by daemon |

## Filtering Logic

Each agent's extractor captures only:
- ✅ User text messages
- ✅ Final assistant text responses

And filters out:
- ❌ `thinking` / reasoning blocks (Claude extended thinking)
- ❌ `tool_use` / `tool_result` / `tool_call` messages
- ❌ System messages
- ❌ Kimi protocol layer (`wire.jsonl`)
- ❌ Streaming deduplication artifacts

## Configuration

Stored at `~/.evermem/config.json`. Managed via:
- CLI: `evermem setup`
- Web UI: `http://localhost:7349` (when daemon is running)
