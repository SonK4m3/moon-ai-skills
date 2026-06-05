# Conversation Visualizer Examples

This document contains reference examples for using the Conversation Visualizer in a JSON-contract first workflow.

## 1. CLI Commands

### Basic Generation
Reads the default `summary.json` in the current working directory and outputs `summary.html`:
```bash
npx tsx scripts/render-html.ts
```

### Specifying Paths
Explicitly point to a specific input JSON file and define a custom output HTML path:
```bash
npx tsx <SKILL_DIR>/scripts/render-html.ts \
  --input "artifacts/note-detail-brief.json" \
  --output "artifacts/note-detail-brief.html" \
  --title "Custom Title Override"
```

---

## 2. Example `summary.json`

This is a complete, valid example of `summary.json` containing structured analysis of a technical discussion:

```json
{
  "title": "Refactor Note Detail State Architecture",
  "summary": "This session resolved state synchronization issues in the NoteDetail layout by introducing a dedicated Zustand UI slice and isolating API-driven Server Data Context.",
  "topics": [
    {
      "name": "State Duplication",
      "insight": "Avoid maintaining duplicate note selection lists in both local workspace context and global Redux store.",
      "status": "resolved"
    },
    {
      "name": "Audio Player Sync",
      "insight": "Keep audio controls inside the local view controller to prevent unnecessary parent component re-renders.",
      "status": "ongoing"
    }
  ],
  "decisions": [
    {
      "decision": "Isolate UI states like collapse-expand toggles into a tab.slice.ts Zustand slice.",
      "reason": "Zustand slices allow fine-grained, selector-based renders without the boilerplate of Redux or the context-invalidation cascades of React Context.",
      "status": "approved"
    },
    {
      "decision": "Retain server-fetched model data in the existing NoteDetailContext.",
      "reason": "Allows us to keep existing data-fetching logic and hook caching in place without risk of regressions.",
      "status": "approved"
    }
  ],
  "actionItems": [
    {
      "task": "Create src/features/note/store/tab.slice.ts with collapse state",
      "owner": "developer",
      "priority": "high",
      "dueDate": "2026-06-08"
    },
    {
      "task": "Migrate SidePanel component to select from the new Zustand store",
      "owner": "frontend-dev",
      "priority": "medium"
    }
  ],
  "openQuestions": [
    "Should audio state eventually be moved to a shared Zustand media slice?"
  ],
  "unresolvedConflicts": [
    "Disagreement over whether tab state should be synchronized with the URL hash parameters for bookmarking."
  ]
}
```
