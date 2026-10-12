# Moon AI Skills

Reusable AI skills for coding agents.

Works with Claude Code, OpenCode, Kiro, Antigravity, Codex, and any agent that supports the [skills.sh](https://skills.sh) format.

## Skills

| Skill | Domain | Description |
|-------|--------|-------------|
| [`ledger`](./skills/ledger) | Workflow | Giữ sổ công việc: chuẩn hoá yêu cầu từ Chat thành work-item, theo dõi mỗi việc đã tới môi trường nào, nói hôm nay nên làm gì |
| [`astra-orchestrator`](./skills/astra-luna-orchestrator) | Orchestration | Orchestrate complex Codex work with root planner/integrator, Luna subagents, and an Astra reviewer |
| [`tech-team-chat-communication`](./skills/tech-team-chat-communication) | Workflow | Viết message/reply trên Google Chat theo vai trò Lead hoặc Member |
| [`feature-design`](./skills/engineering/feature-design) | Engineering | Design software features from requirements |
| [`feature-layer-pattern`](./skills/engineering/feature-layer-pattern) | Engineering | 5-layer feature module pattern (types→api→keys→queries→mutations→store) |
| [`fe-memory-and-perf-audit`](./skills/engineering/fe-memory-and-perf-audit) | Engineering | Optimization philosophy for frontend JS/TS/React — architecture before memo/cache/virtualization |
| [`react-composition-architect`](./skills/engineering/react-composition-architect) | Engineering | Progressive composition patterns for React components |
| [`conversation-visualizer`](./skills/engineering/conversation-visualizer) | Engineering | Summarize long conversations into interactive HTML decision briefs |
| [`write-pr-description`](./skills/engineering/write-pr-description) | Engineering | Tạo PR và mô tả thay đổi theo template chuẩn |
| [`notex-fe-gitflow`](./skills/engineering/notex-fe-gitflow) | Engineering | Git flow 4 môi trường: cherry-pick để test trước, PR luôn target `main`, cách resolve conflict |

Thiết kế của `ledger`: [`docs/agent-ledger/DESIGN.md`](./docs/agent-ledger/DESIGN.md) · Quy ước: [`skills/ledger/references/conventions.md`](./skills/ledger/references/conventions.md)

## Install

### List available skills

```bash
npx skills add SonK4m3/moon-ai-skills --list
```

### Install a skill

```bash
npx skills add SonK4m3/moon-ai-skills --skill conversation-visualizer
```

### Install for specific agents

```bash
npx skills add SonK4m3/moon-ai-skills \
  --skill conversation-visualizer \
  -a claude-code \
  -a opencode
```

### Install via direct path

If the CLI doesn't detect the nested folder, use a direct path:

```bash
npx skills add https://github.com/SonK4m3/moon-ai-skills/tree/main/skills/engineering/conversation-visualizer
```

## Domains

- **Engineering** — code review, architecture, debugging, conversation visualization
- **Business** — proposals, objection handling, sales consulting
- **Language** — English coaching, Chinese coaching

## Philosophy

Workflow > Prompt

Checklist > Magic

Reusable > Tool-specific

## License

[MIT](./LICENSE)
