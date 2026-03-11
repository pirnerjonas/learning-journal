---
allowed-tools: WebFetch, Read, Write, Edit, Bash(git:*), Bash(cd:*), Bash(date:*)
description: Add a new learning entry to the journal
---

## Context

Recent entries (for dedup awareness):
!`cat data/entries.json | python3 -c "import sys,json; entries=json.load(sys.stdin)['entries'][:5]; [print(f'- {e[\"source\"][\"title\"]} [{\", \".join(e[\"tags\"])}]') for e in entries]" 2>/dev/null || echo "No entries yet"`

Current timestamp:
!`date +%Y-%m-%dT%H-%M-%S`

Current date:
!`date +%Y-%m-%d`

## Your task

Add a new learning entry to the journal. Follow these steps:

### 1. Gather input
Ask the user for:
- **Source**: A URL or text description of what they learned
- **Reason**: Why they're saving this (in their own words)

If the user already provided this information with the command invocation, skip asking.

### 2. Fetch URL (if applicable)
If the source is a URL:
- Use `WebFetch` to get the page content
- Extract the page title and key content
- If fetch fails, ask the user to provide a title manually

If the source is text (not a URL), set `source.type` to `"text"` and use the user's description as the title. No URL field in this case.

### 3. Generate entry
Based on the source content and reason, generate:
- **summary**: 2-3 sentence summary of the key insight or content
- **tags**: 3-7 lowercase tags relevant to the content

Show the complete entry to the user and ask for confirmation. Accept edits if requested.

### 4. Write to JSON
- Read `data/entries.json`
- Prepend the new entry to the `entries` array (newest first)
- Use the current timestamp as the `id` field and current date as the `date` field
- Write back with 2-space JSON indentation

The entry schema:
```json
{
  "id": "<timestamp>",
  "date": "<YYYY-MM-DD>",
  "source": {
    "type": "url | text",
    "url": "https://...",
    "title": "Page Title"
  },
  "reason": "User's reason",
  "summary": "LLM-generated summary",
  "tags": ["tag1", "tag2"]
}
```

For text sources, omit the `url` field from `source`.

### 5. Git commit and push
Run these commands:
```
git pull --rebase
git add data/entries.json
git commit -m "learn: <short title>"
git push
```

### 6. Confirm
Show a brief confirmation with:
- The entry title
- Generated tags
- Link: https://pirnerjonas.github.io/learning-journal/
