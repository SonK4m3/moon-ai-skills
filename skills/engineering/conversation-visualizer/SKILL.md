---
name: conversation-visualizer
description: Summarize long conversations and turn them into structured HTML briefs with topics, decisions, action items, and open questions. Make sure to use this skill whenever the user mentions visualizer, html brief, decision brief, summary report, conversation summary, or wants a visual summary of the chat instead of markdown.
version: 1.0.0
domain: engineering
---

# Goal

Transform a long conversation or transcript into a structured, visual HTML decision brief.

# When to use

Use this skill when the user provides or asks for:
- A long AI conversation summary.
- A meeting transcript or customer chat log.
- A technical/architectural discussion overview.
- A decision log of a project.

# Process

1. **Analyze Transcript**: Review the conversation logs to identify:
   - The primary objective of the discussion.
   - Core topics and technical insights.
   - Specific decisions made and their technical rationales/tradeoffs.
   - Concrete action items, assignees, and priorities.
   - Unresolved questions or conflicts.
2. **Generate JSON Contract**: Construct a structured JSON file (e.g., `summary.json`) that strictly adheres to the schema specified in `schema.md`.
3. **Execute HTML Rendering**: Run the `render-html.ts` rendering script using `npx tsx` to compile the JSON structure into an interactive tabbed HTML brief (`summary.html`). Resolve the script path relative to this skill's directory (i.e., the directory containing this `SKILL.md`).
   ```bash
   npx tsx <SKILL_DIR>/scripts/render-html.ts \
     --input <path-to-summary.json> \
     --output <path-to-summary.html>
   ```
   Where `<SKILL_DIR>` is the absolute path to this skill's installation directory.
4. **Deliver to User**: Output the resulting file paths as clickable file URL links. Do not dump the entire generated HTML code into the chat; instead, point the user to the generated artifacts.

# Output

Always produce:
1. `summary.json` (Structured, reusable knowledge contract)
2. `summary.html` (Beautiful, responsive, tabbed visualization page containing Overview, Decision Log, and Action Items views)

# Rules
- **XSS Prevention**: When editing the template or script, ensure all user-derived text strings are processed safely via DOM element setters (`textContent`) rather than arbitrary `innerHTML` concatenation.
- **Preserve Technical Context**: Do not genericize or simplify important technical terms, paths, library names, or structural code choices. Keep them intact in the JSON.
- **Focus on Actionability**: Separate assumptions from hard decisions, and capture owner/priority for every single action item.
