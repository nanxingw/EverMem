# EverMem Async 🧠

> 一行命令，让任何 AI CLI 编程工具接入 EverMemOS 长期记忆系统

**One command to connect any AI coding CLI to [EverMemOS](https://evermind.ai) long-term memory.**

---

## 支持的工具 / Supported Tools

| Tool | Log Location | Status |
|------|-------------|--------|
| [Claude Code](https://claude.ai/claude-code) | `~/.claude/projects/` | ✅ |
| [Codex CLI](https://github.com/openai/codex) | `~/.codex/sessions/` | ✅ |
| [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) | `~/.kimi/sessions/` | ✅ |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | `~/.qwen/` | ✅ |

---

## 快速开始 / Quick Start

### 方式一：一键安装脚本

```bash
curl -fsSL https://raw.githubusercontent.com/nanxingw/EverMem/main/install.sh | bash
```

### 方式二：npm 安装

```bash
npm install -g evermem-async
evermem setup
```

### 启动后台服务

```bash
evermem start --daemon
# Web UI 自动开启于 http://localhost:7349
```

---

## 命令行参考 / CLI Reference

```bash
evermem setup           # 交互式配置向导
evermem start           # 前台启动（含 Web UI）
evermem start --daemon  # 后台静默运行
evermem stop            # 停止后台 daemon
evermem status          # 查看运行状态
evermem run             # 立即手动同步一次
evermem web             # 打开 Web 控制台
```

---

## Web 控制台 / Web Dashboard

访问 `http://localhost:7349`：

- **概览 / Dashboard** — 实时状态、运行时长、历史同步记录
- **配置 / Config** — API Key、同步间隔、用户 ID
- **Agent 管理 / Agents** — 自动检测已安装工具、一键启用/禁用
- **记忆搜索 / Search** — 语义搜索已存储的记忆（支持 keyword/vector/hybrid）

---

## 工作原理 / How It Works

```
CLI Tool Session → JSONL Logs → Extract → Filter (user + final assistant only) → EverMemOS API
```

1. **自动检测** 已安装的 CLI 工具
2. **定期提取** 新对话记录（只提取最终回复，过滤思维过程和工具调用）
3. **上传至 EverMemOS** 进行记忆提取和长期存储
4. **随时搜索** 历史记忆，供任何 Claude 会话调用

---

## 配置 / Configuration

配置存储于 `~/.evermem/config.json`：

```json
{
  "apiKey": "your-evermemos-api-key",
  "interval": 30,
  "port": 7349,
  "agents": ["claude", "codex"],
  "userId": "evermem-user",
  "maxTurnsPerSession": 200
}
```

---

## 脚本调用 / Script Usage

可直接使用提取脚本：

```bash
# 提取 Claude Code 最近 5 个会话
node scripts/extract-claude.mjs --recent 5 --output json

# 搜索记忆
node scripts/search-memories.mjs --query "React hooks" --method hybrid

# 手动添加记忆（指定 agents）
node scripts/add-memories.mjs --agents claude,codex --recent 3
```

---

## 环境变量 / Environment Variables

| Variable | Description |
|----------|-------------|
| `EVERMEMOS_API_KEY` | EverMemOS API Key（优先于配置文件）|
| `QWEN_SHARE_DIR` | Qwen Code 自定义数据目录 |

---

## License

MIT © [nanxingw](https://github.com/nanxingw)
