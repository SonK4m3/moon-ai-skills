# Conversation Visualizer JSON Schema

This file defines the JSON structure (`summary.json`) that represents the structured knowledge extracted from a conversation. All rendered visualizers are built from this schema.

## 1. JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConversationSummary",
  "type": "OBJECT",
  "required": ["title", "summary", "topics", "decisions", "actionItems", "openQuestions"],
  "properties": {
    "title": {
      "type": "STRING",
      "description": "Short, descriptive title of the conversation topic."
    },
    "summary": {
      "type": "STRING",
      "description": "Executive summary of the discussion, main goals, and outcomes."
    },
    "topics": {
      "type": "ARRAY",
      "description": "Key topics discussed during the session.",
      "items": {
        "type": "OBJECT",
        "required": ["name", "insight"],
        "properties": {
          "name": { "type": "STRING", "description": "Name of the topic." },
          "insight": { "type": "STRING", "description": "Key takeaway or technical insight." },
          "status": { "type": "STRING", "enum": ["resolved", "ongoing", "postponed"], "description": "Resolution status." }
        }
      }
    },
    "decisions": {
      "type": "ARRAY",
      "description": "Design or technical decisions made during the conversation.",
      "items": {
        "type": "OBJECT",
        "required": ["decision", "reason"],
        "properties": {
          "decision": { "type": "STRING", "description": "What was decided." },
          "reason": { "type": "STRING", "description": "Rationale or trade-off analysis behind the decision." },
          "status": { "type": "STRING", "description": "E.g., approved, proposed, active." }
        }
      }
    },
    "actionItems": {
      "type": "ARRAY",
      "description": "Follow-up tasks, assignments, and action items.",
      "items": {
        "type": "OBJECT",
        "required": ["task", "owner", "priority"],
        "properties": {
          "task": { "type": "STRING", "description": "Description of the work to be done." },
          "owner": { "type": "STRING", "description": "Person or role assigned to the task." },
          "priority": { "type": "STRING", "enum": ["low", "medium", "high"], "description": "Task priority." },
          "dueDate": { "type": "STRING", "description": "Optional deadline or milestone." }
        }
      }
    },
    "openQuestions": {
      "type": "ARRAY",
      "description": "Unresolved questions or issues that require further investigation.",
      "items": { "type": "STRING" }
    },
    "unresolvedConflicts": {
      "type": "ARRAY",
      "description": "Detected disagreements, alternative proposals, or conflicting constraints that remain active.",
      "items": { "type": "STRING" }
    }
  }
}
```

## 2. CLI Command Arguments

The rendering script accepts:

- `-i, --input <path>`: Path to the `summary.json` file.
- `-o, --output <path>`: Path to write the static HTML output (`summary.html`).
- `-t, --title <string>`: Override the title of the HTML page.
