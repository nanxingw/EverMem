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
<!-- last synced: 2026-03-13 -->

### 开发现状 / Current State
- v0.1.0，已发布至 GitHub（https://github.com/nanxingw/EverMem），npm 包名 `evermem-async`
- 核心功能全部可用：CLI、后台 daemon（每 30 分钟 cron）、Web UI（Dashboard / Config / Search 三 Tab）
- 支持四大 AI 代理：Claude Code、Codex CLI、Qwen Code、Kimi CLI，自动检测并安装对应 skill
- Daemon 通过 SSE 向前端推送实时状态，运行日志写入 `~/.evermem/runs.jsonl`
- 端口自动分配（`port: 0`），实际端口写入 `~/.evermem/config.json` 供前端使用，避免硬编码冲突
- 配置持久化于 `~/.evermem/config.json`，包含 API Key、lastRun、同步间隔、已启用 agents 列表
- UI 已升级为亮色暖调主题（2026-03），带毛玻璃 Header 和 ambient orbs

### 开发历程 / Key Decisions
- 从 skill-evolver 项目中剥离 evermem 技能，独立成 npm 包——目标是"单行命令接入"
- 记忆同步采用增量策略：首次同步最近 5 会话，后续以 `lastRun` 时间戳防重复上传
- JSONL 日志提取过滤 `reasoning` 和 `tool_use` 块，只保留用户消息 + 助手最终回复
- Skill 通过 `evermem install-skill` 自动部署到各工具目录，SKILL.md 格式兼容各平台字段差异
- Cursor 曾因旧版 `detector.js` 未显示，重启后修复；端口冲突通过 `port: 0` 彻底解决
- 引入 `evermem-sync-context` skill，让 AI 工具可一键加载项目历史上下文（flat skills/ 布局）

### 未来方向 / Roadmap
- P0：npm 正式发布（当前为 GitHub 仓库安装，需走 npm publish 流程）
- P1：Web UI Search 功能完善（当前后端已有 `/search` 接口，前端体验可深化）
- P1：更多 agent 支持（如 Windsurf、Gemini CLI 等新兴工具）
- P2：Web UI 国际化（i18n）状态与布局稳定性验证
- P2：skill-evolver 与 evermem-async 的生态协同（技能自动进化触发记忆同步）
