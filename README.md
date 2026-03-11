# Learning Journal

Personal knowledge base for capturing learnings and educational resources.

## Usage

Add entries via Claude Code:

```
/learn
```

Browse entries at: https://pirnerjonas.github.io/learning-journal/

## Local preview

Serve the site locally (needed because `app.js` fetches JSON via `fetch()`):

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Structure

- `data/entries.json` — All entries (newest first)
- `index.html` / `style.css` / `app.js` — Static site (Alpine.js)
