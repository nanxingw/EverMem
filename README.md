# EverMem Async

> 一行命令，让任何 AI 编程 CLI 工具接入 EverMemOS 长期记忆系统

**One command to connect any AI coding CLI to [EverMemOS](https://evermind.ai) long-term memory.**

---

## 支持的工具 / Supported Tools

| Tool | Log Location | Status |
|------|-------------|--------|
| [Claude Code](https://claude.ai/claude-code) | `~/.claude/projects/**/*.jsonl` | ✅ |
| [Cursor IDE](https://cursor.com) | `~/.cursor/chats/**/<session>/store.db` | ✅ |
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/sessions/**/rollout-*.jsonl` | ✅ |
| [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) | `~/.kimi/sessions/**/context.jsonl` | ✅ |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | `~/.qwen/` or `$QWEN_SHARE_DIR` | ✅ |

---

## 快速开始 / Quick Start

### 方式一：npm 安装（推荐）

```bash
npm install -g evermem-async
evermem setup
evermem start --daemon
```

### 方式二：一键安装脚本

```bash
curl -fsSL https://raw.githubusercontent.com/nanxingw/EverMem/main/install.sh | bash
```

### 配置向导 `evermem setup`

交互式向导会引导你完成：

1. 输入 **EverMemOS API Key**（从 [evermind.ai](https://evermind.ai) 获取）
2. 设置**自动同步间隔**（分钟，默认 30）
3. 设置**用户 ID**（用于记忆隔离，默认 `evermem-user`）
4. 设置 **Web UI 端口**（默认 7349）
5. 自动检测并选择要启用的 AI 工具
6. 自动把 evermem skill 安装到所有已检测到的工具

---

## 命令行参考 / CLI Reference

```bash
evermem setup                      # 交互式配置向导（首次使用必跑）
evermem start                      # 前台启动，自动打开 Web UI
evermem start --daemon             # 后台静默运行
evermem stop                       # 停止后台 daemon
evermem status                     # 查看运行状态和最近同步记录
evermem run                        # 立即手动同步一次
evermem run --dry-run              # 预览将同步的内容，不实际上传
evermem run --agents claude,codex  # 只同步指定工具
evermem web                        # 在浏览器打开 Web 控制台
evermem search --query "React hooks"          # 搜索已存储的记忆
evermem search --query "debug" --method vector --top-k 5
evermem install-skill              # 重新安装 skill 到所有已检测工具
evermem install-skill --all        # 强制安装到所有支持的工具
```

---

## Web 控制台 / Web Dashboard

访问 `http://localhost:7349`（端口自动检测，被占用时自动切换）：

- **Dashboard** — 实时状态指示灯、daemon 运行时长、倒计时、历史同步记录，支持一键立即同步 / 停止 daemon
- **Agents** — 自动检测已安装工具，显示每个工具的 logo 和日志路径，一键启用/禁用
- **Config** — API Key、同步间隔、用户 ID、端口等全部配置项
- **Search** — 语义搜索已存储记忆，支持 `keyword` / `vector` / `hybrid` / `agentic` 四种搜索模式

Web UI 使用 **SSE（Server-Sent Events）** 实时推送 daemon 状态，无需手动刷新。

---

## 工作原理 / How It Works

```
AI Tool Session → JSONL Logs → Extract & Filter → EverMemOS API → Long-term Memory
```

1. **自动检测**：扫描本机已安装的 AI 编程工具（检测 `~/.claude`、`~/.cursor`、`~/.codex` 等目录）
2. **定期提取**：按配置间隔（默认 30 分钟）提取新的对话记录
3. **智能过滤**：只保留有意义的内容——用户消息 + 助手最终回复；过滤思维过程（thinking blocks）、工具调用、系统消息、流式片段
4. **上传至 EverMemOS**：进行记忆提取、向量化和长期存储
5. **随时搜索**：通过 `evermem search` 或 Web UI 检索历史记忆，供任何会话调用

---

## Skill 集成 / AI Tool Skill Integration

`evermem setup` 或 `evermem install-skill` 会自动把两个 skill 安装到所有已检测到的工具：

| Tool | `/evermem` | `/evermem-sync-context` |
|------|-----------|------------------------|
| Claude Code | 自动加载，或 `/evermem` | `/evermem-sync-context` |
| Cursor IDE | 自动加载，或 `/evermem` | `/evermem-sync-context` |
| Codex CLI | `$evermem` | — |
| Kimi CLI | `/skill:evermem` | — |
| Qwen Code | `/skills` 选择 evermem | — |

---

## /evermem-sync-context — 项目上下文一键同步

> 每次开新会话都要重新解释项目背景？这个 skill 解决这个问题。

在任意项目目录下运行 `/evermem-sync-context`，AI 自动完成：

1. **跨工具记忆聚合** — 同时搜索你在 Claude Code、Cursor、Codex 等所有工具中关于这个项目的历史对话，不遗漏任何工具的上下文
2. **五维度智能检索** — 分别搜索开发进展、架构决策、Bug 修复、Roadmap、现状评估，覆盖项目全貌
3. **Git 历史融合** — 结合最近 30 条提交记录，让 AI 理解真实的演进节奏，而非仅靠对话推测
4. **多工具 config 文件适配** — 自动写入当前 AI 工具对应的配置文件：Claude Code → `CLAUDE.md`、Cursor → `.cursorrules`、Codex → `AGENTS.md`，无需手动指定
5. **非破坏性写入** — 保留 `CLAUDE.md` 中所有已有内容，只更新 `## Project Context` 区块，不会覆盖你手写的设计规范、品牌准则等
6. **三层结构输出** — 固定输出「开发现状 / Key Decisions / Roadmap」三段，让 AI 每次都能快速定位项目坐标
7. **防幻觉机制** — 只基于搜索到的 EverMem 记忆和 git log 撰写，不允许 AI 自行推断或捏造功能
8. **同步时间戳** — 自动写入 `<!-- last synced: YYYY-MM-DD -->`，下次打开 CLAUDE.md 一眼知道上下文新鲜度
9. **可重复运行** — 项目演进后随时重跑，每次都会用最新记忆覆盖旧的 Project Context，保持上下文始终最新
10. **零配置，随项目走** — 任意项目目录下都可运行，无需提前配置项目名或路径，自动从 `package.json` / `pyproject.toml` 等读取

```bash
# 在任意项目目录，开新会话时运行一次
/evermem-sync-context
```

运行后，`CLAUDE.md` 会自动追加类似：

```markdown
## Project Context
<!-- last synced: 2026-03-13 -->

### 开发现状 / Current State
- v0.1.0：CLI + Web UI + Daemon 全链路完成，5 个 AI 工具全部接入
- 技术栈：Node.js ESM + Express + Svelte + SQLite（Cursor）+ EverMemOS API

### 开发历程 / Key Decisions
- Cursor 使用 SQLite store.db，需用 Python3 处理 binary protobuf blob
- skill 安装采用平铺 skills/ 目录，每个 skill 独立子目录，安装器自动扫描

### 未来方向 / Roadmap
- P0: npm publish 发布 v0.1.0
- P1: Kimi / Qwen skill 调用方式验证
```

---

## 配置 / Configuration

配置存储于 `~/.evermem/config.json`：

```json
{
  "apiKey": "your-evermemos-api-key",
  "interval": 30,
  "port": 7349,
  "agents": ["claude", "cursor", "codex"],
  "userId": "evermem-user",
  "maxTurnsPerSession": 200
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | EverMemOS API Key | — |
| `interval` | 自动同步间隔（分钟） | `30` |
| `port` | Web UI 端口（被占用时自动切换） | `7349` |
| `agents` | 启用的工具列表 | `[]` |
| `userId` | 记忆存储用户 ID | `"evermem-user"` |
| `maxTurnsPerSession` | 每个会话最多提取的对话轮数 | `200` |

---

## 文件结构 / File Layout

```
~/.evermem/
├── config.json        # 主配置文件
├── daemon.pid         # Daemon 进程 ID（运行时存在）
└── logs/
    ├── runs.jsonl     # 每次同步的运行记录
    └── daemon.log     # Daemon 日志
```

---

## 环境变量 / Environment Variables

| Variable | Description |
|----------|-------------|
| `EVERMEMOS_API_KEY` | EverMemOS API Key（优先于配置文件中的 apiKey）|
| `QWEN_SHARE_DIR` | Qwen Code 自定义数据目录（默认 `~/.qwen`）|

---

## 系统要求 / Requirements

- Node.js >= 18
- npm >= 8

---

## License

MIT © [nanxingw](https://github.com/nanxingw)
