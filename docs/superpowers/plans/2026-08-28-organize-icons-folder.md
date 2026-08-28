# Organize Icons Subfolder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move top-level `icon-*.png` files into a dedicated `icons/` directory and update references in `index.html`, `manifest.json`, and `README.md`.

**Architecture:** 
1. Create `icons/` directory and move `icon-16.png`, `icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`.
2. Update `<link rel="...">` paths in `index.html` to `icons/icon-*.png`.
3. Update `"src"` paths in `manifest.json` to `icons/icon-*.png`.
4. Update asset documentation references in `README.md`.

---

### Task 1: Move Icon Files & Update References

**Files:**
- Create: `icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-180.png`, `icons/icon-192.png`, `icons/icon-512.png`
- Delete: `icon-16.png`, `icon-32.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`
- Modify: `index.html`, `manifest.json`, `README.md`

- [x] **Step 1: Move icon files to `icons/`**

Move all top-level `icon-*.png` files into `icons/`.

- [x] **Step 2: Update `index.html`**

Change:
```html
<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
```
to:
```html
<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="icons/icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="icons/icon-180.png">
```

- [x] **Step 3: Update `manifest.json`**

Change:
```json
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
```
to:
```json
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
```

- [x] **Step 4: Update `README.md`**

Update project structure in `README.md` to show `icons/` folder.

- [ ] **Step 5: Commit changes**

```bash
git add icons/ index.html manifest.json README.md
git rm icon-16.png icon-32.png icon-180.png icon-192.png icon-512.png
git commit -m "chore: organize icon assets into icons/ subfolder"
```
