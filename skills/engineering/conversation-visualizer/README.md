# Conversation Visualizer

Transform long AI conversations, meeting transcripts, and technical discussions into structured, interactive HTML decision briefs.

## What it does

This skill analyzes a conversation and extracts:
- **Topics** — key subjects discussed, with resolution status
- **Decisions** — what was decided, why, and current status
- **Action Items** — tasks, owners, priorities, and deadlines
- **Open Questions** — unresolved issues requiring follow-up
- **Unresolved Conflicts** — active disagreements or competing proposals

The output is a beautiful, interactive HTML page with tabbed navigation (Overview, Decision Log, Action Items), dark/light mode toggle, and responsive layout.

## Input / Output

| Direction | File | Description |
|-----------|------|-------------|
| Input | `summary.json` | Structured JSON following `summary.schema.json` |
| Output | `summary.html` | Self-contained interactive HTML brief |

## Quick Start

```bash
# 1. Install dependencies (one-time)
cd skills/engineering/conversation-visualizer
npm install

# 2. Validate your summary JSON
npx tsx scripts/validate-summary.ts --input summary.json

# 3. Render HTML
npx tsx scripts/render-html.ts --input summary.json --output summary.html
```

## Schema Reference

The full schema is defined in [`summary.schema.json`](./summary.schema.json). Here's a quick field reference:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✓ | Short, descriptive title |
| `summary` | string | ✓ | Executive summary of the discussion |
| `topics` | array | ✓ (min: 1) | Key topics with `name`, `insight`, optional `status` |
| `decisions` | array | ✓ | Decisions with `decision`, `reason`, optional `status` |
| `actionItems` | array | ✓ | Tasks with `task`, `owner`, `priority`, optional `dueDate` |
| `openQuestions` | array | ✓ | Unresolved questions (strings) |
| `unresolvedConflicts` | array | — | Active disagreements (strings) |
| `metadata` | object | — | Generation metadata (`skillName`, `skillVersion`, `generatedAt`) |

### Topic Status Values
`resolved` · `ongoing` · `postponed`

### Action Item Priority Values
`low` · `medium` · `high`

## CLI Commands

### Validate

Check a JSON file against the schema before rendering:

```bash
npx tsx scripts/validate-summary.ts --input <path-to-json>
```

On success: prints `✓ Valid` and exits with code 0.
On failure: prints each error with the field path and exits with code 1.

### Render

Generate the interactive HTML brief:

```bash
npx tsx scripts/render-html.ts --input <path-to-json> --output <path-to-html>
```

Options:
- `-i, --input <path>` — Path to summary JSON (default: `./summary.json`)
- `-o, --output <path>` — Output HTML path (default: `./summary.html`)
- `-t, --title <string>` — Override the brief title

## Fixtures

The `fixtures/` directory contains test data for different scenarios:

| File | Scenario |
|------|----------|
| `technical.summary.json` | Architecture/engineering discussion |
| `sales.summary.json` | Business/sales strategy review |
| `learning.summary.json` | Tutorial session (minimal decisions, many questions) |
| `empty-arrays.summary.json` | Valid schema with empty decisions/actions/questions |
| `long-conversation.summary.json` | Large dataset (12 topics, 8 decisions, 15 action items) |
| `malicious-xss.summary.json` | XSS payloads in all fields (security test) |

### Validate all fixtures

```bash
for f in fixtures/*.summary.json; do npx tsx scripts/validate-summary.ts --input "$f"; done
```

### Render a fixture

```bash
npx tsx scripts/render-html.ts --input fixtures/technical.summary.json --output fixtures/output/technical.html
```

## Security

### XSS Prevention

All user-derived text is rendered via DOM `textContent` setters, never via `innerHTML` with raw data. The HTML template uses `document.createElement()` + `.textContent` for every dynamic field:

```javascript
// Safe — payload appears as visible text, not executed
name.textContent = topic.name;  // Even if name is "<script>alert(1)</script>"
```

The `malicious-xss.summary.json` fixture validates this by injecting script tags, event handlers, javascript: URIs, and template injection vectors into every field. When rendered, all payloads display as escaped text.

### JSON Injection Prevention

Data is injected into the HTML template via `JSON.stringify()`, which properly escapes special characters. The rendered HTML contains no raw user strings outside of JSON context.

## Roadmap

Future improvements planned (in priority order):

1. ~~JSON Schema~~ ✓
2. ~~Validator Script~~ ✓
3. ~~Fixture Samples~~ ✓
4. ~~XSS Fixture~~ ✓
5. Semantic Types — separate facts, decisions, assumptions, recommendations, risks
6. Privacy Redaction — detect and redact sensitive data for public export
7. Metadata Block — skill version, generation timestamp in footer
8. ~~README~~ ✓
9. CLI standardization — npm scripts for common workflows
10. Unit Tests — Vitest test suite
11. Security Tests — dedicated XSS assertion tests
12. No Raw innerHTML Rule — audit and enforce
13. Print / PDF Mode
14. Search & Filter
15. Copy Buttons
16. Anchor Links
17. Mobile Responsive
18. Theme Simplification
19. Multi-renderer (Markdown, Mermaid)
20. Public Package Readiness

## License

Part of [Moon AI Skills](../../README.md) ecosystem. [MIT License](../../LICENSE).
