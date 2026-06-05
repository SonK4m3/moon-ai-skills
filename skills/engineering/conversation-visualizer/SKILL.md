---
name: conversation-visualizer
description: Summarize and visualize long conversations into an interactive HTML brief. USE THIS SKILL WHENEVER the user asks to summarize, export, or visualize the current chat, transcript, log, or thread into an HTML report, visual report, web page, summary.json, summary.html, decision log, or interactive dashboard with tabs. DO NOT use this skill if the user asks for a simple markdown summary, plain text bullet points, writing raw UI code/CSS/templates, creating PRDs, translating, or summarizing non-conversation articles.
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

1. **Analyze Transcript**: Review the entire conversation log carefully to extract accurate information:
   - **Identify Pivot Points**: Look for moments where the user changes their mind or corrects the AI. Always capture the *final* decision rather than the initial draft.
   - **Extract Core Topics**: Do not write generic summaries. Identify and preserve the exact technical terms (jargon), library names, and contextual details discussed.
   - **Extract Decisions & Rationale**: Identify moments where a choice was made between alternatives. Capture the final choice and *why* it was chosen.
   - **Assign Action Items Contextually**: When extracting tasks, read the surrounding context to determine the assignee (e.g., if the user says "I will do X", assignee is 'user'; if "bot, please do Y", assignee is 'AI') and set realistic priorities.
   - **Capture Unresolved Issues**: Note any questions that were raised but never explicitly answered.
2. **Generate JSON Contract**: Construct a structured JSON file (e.g., `summary.json`) that strictly adheres to the schema specified in `schema.md`. Always include the optional `metadata` block with `skillName` set to `"conversation-visualizer"`, `skillVersion` set to `"1.0.0"`, and `generatedAt` set to the current ISO 8601 timestamp.
3. **Validate JSON**: Run the validator script before rendering to catch schema errors early:
   ```bash
   npx tsx <SKILL_DIR>/scripts/validate-summary.ts --input <path-to-summary.json>
   ```
   If validation fails, fix the JSON and re-validate before proceeding.
4. **Execute HTML Rendering**: Run the `render-html.ts` rendering script using `npx tsx` to compile the JSON structure into an interactive tabbed HTML brief (`summary.html`). Resolve the script path relative to this skill's directory (i.e., the directory containing this `SKILL.md`).

   ```bash
   npx tsx <SKILL_DIR>/scripts/render-html.ts \
     --input <path-to-summary.json> \
     --output <path-to-summary.html>
   ```

   Where `<SKILL_DIR>` is the absolute path to this skill's installation directory.
5. **Deliver to User**: Output the resulting file paths as clickable file URL links. Do not dump the entire generated HTML code into the chat; instead, point the user to the generated artifacts.

# Output

Always produce:

1. `summary.json` (Structured, reusable knowledge contract)
2. `summary.html` (Beautiful, responsive, tabbed visualization page containing Overview, Decision Log, and Action Items views)

# Rules

- **XSS Prevention**: When editing the template or script, ensure all user-derived text strings are processed safely via DOM element setters (`textContent`) rather than arbitrary `innerHTML` concatenation.
- **Preserve Technical Context**: Do not genericize or simplify important technical terms, paths, library names, or structural code choices. Keep them intact in the JSON.
- **Focus on Actionability**: Separate assumptions from hard decisions, and capture owner/priority for every single action item.
- **Quality Rationale**: For each decision, explain *why* it was chosen over alternatives. Include trade-off analysis (what was gained, what was sacrificed), rejected alternatives, and downstream implications. Avoid vague reasoning like "it's better" — be specific about the technical or business justification.
