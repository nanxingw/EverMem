---
name: evermem
description: >
  EverMemOS long-term memory for AI coding tools. Use this skill when the user
  wants to remember past conversations, search previous sessions, recall project
  context, or sync memories from Claude Code / Codex / Kimi / Qwen Code.
  Triggers on: "remember", "recall", "what did we discuss", "search memory",
  "sync memories", "past sessions", "previous context", "what have I worked on".
  Provides evermem run (sync) and evermem search (retrieve).
license: MIT
compatibility: Requires evermem CLI installed globally (npm install -g evermem-async)
metadata:
  author: nanxingw
  version: "0.1.0"
allowed-tools:
  - Bash
  - Read
  - Glob
---

# EverMem — Cross-Tool Long-Term Memory via EverMemOS

Connects Claude Code, Codex CLI, Kimi, and Qwen Code to [EverMemOS](https://docs.evermind.ai)
for persistent, semantically searchable memory across all your AI coding sessions.

## Invocation

| Tool | Command |
|------|---------|
| Claude Code | This skill auto-loads |
| Codex CLI | `$evermem` |
| Kimi CLI | `/skill:evermem` |
| Qwen Code | `/skills` → select evermem |

## Core Commands

### Search memories (use BEFORE starting work)

```bash
evermem search --query "React hooks patterns"
evermem search --query "user preferences" --method vector --top-k 5
evermem search --query "debug session" --json
```

**Search methods:** `keyword` | `vector` | `hybrid` (default) | `agentic`

### Sync memories (use AFTER finishing a session)

```bash
evermem run                          # auto-detect all agents
evermem run --agents claude,codex    # specific agents only
evermem run --since 2026-01-01T00:00:00Z
evermem run --dry-run                # preview without uploading
```

## When to Use

| Situation | Action |
|-----------|--------|
| Starting a new session | `evermem search --query "<topic>"` to recall past context |
| User asks "what did we work on?" | `evermem search --query "<topic>"` |
| Finishing a long session | `evermem run` to persist memories |
| Background auto-sync | Daemon handles this automatically every N minutes |

## Supported Agents (auto-detected)

| Agent | Log Location |
|-------|-------------|
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| Codex CLI | `~/.codex/sessions/**/rollout-*.jsonl` |
| Kimi CLI | `~/.kimi/sessions/**/context.jsonl` |
| Qwen Code | `~/.qwen/` or `$QWEN_SHARE_DIR` |

## Filtering Logic

Only stores meaningful content:
- ✅ User messages and final assistant responses
- ❌ Thinking blocks, tool calls, system messages, streaming artifacts

## Configuration

```bash
evermem setup    # interactive wizard: API key, interval, agents
evermem status   # show daemon status and recent runs
evermem web      # open web dashboard (http://localhost:7349)
```

Config stored at `~/.evermem/config.json`.
