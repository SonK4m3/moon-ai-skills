# Moon AI Skills

Reusable AI skills for coding agents.

Works with Claude Code, OpenCode, Kiro, Antigravity, Codex, and any agent that supports the [skills.sh](https://skills.sh) format.

## Skills

| Skill | Domain | Description |
|-------|--------|-------------|
| `conversation-visualizer` | Engineering | Summarize long conversations and render them as interactive HTML decision briefs |

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
