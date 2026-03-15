# CLAUDE.md — EverMem Async

## Design Context

### Users

开发者，主要使用 AI 编程 CLI 工具（Claude Code、Codex、Kimi、Qwen Code）。他们安装 evermem-async 是为了让记忆系统"自动在后台工作"——大多数时候不需要关注 UI。偶尔打开 Web UI 有两种场景：（1）快速确认 daemon 在跑、同步正常；（2）主动搜索历史记忆 / 调试某个 agent 有没有同步成功。UI 必须同时服务好这两种模式：静默时一眼即懂，深入时层次清晰。

### Brand Personality

**优雅 · 现代 · 灵动**

参照系：Raycast、Notion、Linear 的交叉点——有工具的精准，有产品的设计感，有自己的记忆点。

- 不是冷酷的终端风，也不是消费级 App 的甜腻感
- 深色底 + 紫色主调，传递 AI / 记忆 / 技术的气质
- 克制的动效：有呼吸感，不抢戏

三词口诀：**沉稳 · 流畅 · 有记忆点**

### Aesthetic Direction

**已确定（来自代码）**
- 主背景：`#0f0f13`（接近纯黑，有蓝紫冷调）
- 卡片层：`#1a1a22`
- 边框：`#2a2a38`
- 主强调色：`#7c6af7`（中饱和紫，既有技术感又不过于刺眼）
- 文字：`#e8e8f0`（暖白，不刺眼）
- 辅助文字：`#6b6b8a`

**当前主题：亮色暖调（2026-03 更新）**

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `oklch(97% 0.012 75)` | 奶油白底 |
| `--surface` | `oklch(99% 0.006 80)` | 卡片白 |
| `--accent` | `oklch(58% 0.19 45)` | 暖橙主色 |
| `--text` | `oklch(22% 0.04 55)` | 深棕文字 |
| `--green` | `oklch(50% 0.15 145)` | 成功绿 |
| `--red` | `oklch(52% 0.2 22)` | 错误红 |

Ambient orbs：右上暖橙 + 左下暖黄，低不透明度，制造有温度的空间感。
Header：毛玻璃奶油白半透明，`backdrop-filter: blur(20px) saturate(1.8)`。

**反参照（不要做成）**
- 不是暗紫调 AI 工具的刻板印象
- 不是炫技的赛博朋克
- 不是消费级 App 的甜腻渐变

### Design Principles

1. **静默优先，深入可达**
   Dashboard 是"一眼即懂"的监控面板。Config 和 Search 才是深操作区。

2. **动效传递状态，而非装饰**
   只在有意义的地方加动画：指示灯呼吸、骨架屏、条目滑入。

3. **暖橙是唯一的"活跃信号"**
   `--accent` 专用于选中 Tab、启用 Toggle、主操作按钮。成功=绿、错误=红，语义色不用橙色稀释。

4. **密度与呼吸的平衡**
   卡片内适当留白（1rem+ padding），列表项之间有间距，标签不堆叠。

5. **中英无缝**
   语言切换不应有布局抖动，共享同一套间距和字号体系。

## Project Context
<!-- last synced: 2026-03-15 -->

### 开发现状 / Current State
- **v0.1.0 已发布至 npm**（`npm install -g evermem-async`），GitHub: https://github.com/nanxingw/EverMem
- 支持四大 AI 工具：Claude Code、Codex CLI、Cursor IDE、Qwen/Kimi
- Daemon 已全局运行：支持 cron（每 30 分钟）、CLI 手动触发、HTTP API 触发，具备幂等性、去重、并发控制
- SSE 实时推送同步状态到 Web UI，日志记录于 `~/.evermem/runs.jsonl`
- Web UI（Svelte，端口 7349）：Dashboard / Agents / Config / Search 四模块，中英双语 i18n，当前为暖色亮调主题
- 配置持久化于 `~/.evermem/config.json`（API Key、lastRun、同步间隔、启用 agents 列表）
- 技能自动部署：`evermem install-skill` 写入 `~/.claude/skills/evermem`、`~/.codex/skills/evermem`、`~/.config/agents/skills/evermem`、`~/.qwen/skills/evermem`

### 开发历程 / Key Decisions
- **Cursor 提取难点**：Cursor 的 `store.db` 为 SQLite，用户消息是 JSON，助手消息是 protobuf 二进制 → 用 Python3 内联脚本 + 正则解析解决（`extract-cursor.mjs`）
- **技能部署路径**：`evermem-sync-context` 采用平级目录（不是命名空间子目录），确保 Claude Code 等工具能正确加载
- **npm 发包踩坑**：需要 `.npmignore` 防止 `.claude/`、`.env`、`node_modules/`、`web/dist/` 泄露；`bin` 字段路径格式必须与实际文件名完全一致
- **端口自动检测**：`findFreePort` 逻辑有 bug，后修复为自动探测可用端口
- **UI 主题演进**：从初版暗紫调 → 全面重设计为暖橙亮调（奶油白底 + 暖橙 accent），参照系 Raycast/Linear

### 未来方向 / Roadmap
- **P0**：`evermem-sync-context` 功能打磨（10 项核心能力已实现，需更多实战验证）
- **P0**：Cursor IDE 提取稳定性提升（protobuf 解析仍依赖正则，存在边缘 case）
- **P1**：Web UI Search 页深化——支持跨 agent 过滤、时间范围筛选
- **P1**：README / 文档补全（用户反馈 API key 获取路径不清晰，已加 console.evermind.ai 说明）
- **P2**：支持更多 agent（Windsurf、Zed AI 等新兴工具）
- **P2**：v0.2.0 路线图待定（可能包含：记忆去重优化、搜索质量提升、移动端 Web UI）

