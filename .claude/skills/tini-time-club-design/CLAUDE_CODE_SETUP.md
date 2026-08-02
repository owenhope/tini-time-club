# Using Tini Time Club in Claude Code

This design system already ships as an **Agent Skill** (`SKILL.md`), so Claude Code can load it natively. Two ways in — pick one.

---

## Option A — Install as a Skill (recommended)

Gives Claude Code the brand rules, tokens, assets and component source as a skill it can invoke on demand, in any project.

1. Download this project (zip) and unzip it.
2. Copy the whole folder into your skills directory, renaming it to the skill name:

```bash
# project-scoped (checked into your repo, shared with your team)
mkdir -p .claude/skills
cp -R ~/Downloads/tini-time-club-design-system .claude/skills/tini-time-club-design

# or user-scoped (available in every project on your machine)
mkdir -p ~/.claude/skills
cp -R ~/Downloads/tini-time-club-design-system ~/.claude/skills/tini-time-club-design
```

The folder must contain `SKILL.md` at its top level. Result:

```
.claude/skills/tini-time-club-design/
├── SKILL.md
├── readme.md            ← the full brand + system spec
├── styles.css           ← single entry point, @imports tokens/
├── tokens/              ← colors, typography, spacing, effects, fonts, base
├── components/          ← 36 components, each with .jsx + .d.ts + .prompt.md
├── guidelines/          ← foundation specimen cards
├── ui_kits/             ← mobile app + marketing site reference screens
└── assets/              ← logos, app icons, badge, photography
```

3. Restart Claude Code (or run `/doctor` to confirm it loaded). Then use it:

```
/tini-time-club-design
```

or just ask in context — "build the bar detail screen using the Tini Time Club design system" — and it will pull the skill in.

---

## Option B — Vendor the tokens + components into your app

If you want the CSS and components living in your repo permanently rather than as reference:

1. Copy `styles.css` and `tokens/` into your app (e.g. `src/styles/tini/`).
2. Link the entry point once, above your own styles:

```html
<link rel="stylesheet" href="/styles/tini/styles.css" />
```

or in a bundler:

```js
import "./styles/tini/styles.css";
```

`styles.css` only `@import`s — keep `tokens/` as a sibling folder or the imports break.

3. Copy `components/` for the pieces you need. Each component is a plain `.jsx` with a sibling `.d.ts` (props contract) and `.prompt.md` (usage rules). They read CSS custom properties from the tokens, so no theme provider or config is required.
4. Copy `assets/` for logos and app icons. Never re-type the wordmark — use the supplied cuts.

Then point Claude Code at it:

```
Read src/styles/tini/ and components/ — that's our design system.
Follow readme.md for brand rules. Build X.
```

Do **both** if you like: vendor the CSS/components for runtime, and install the skill so Claude Code knows the rules behind them.

---

## What to tell Claude Code first

Paste this once at the start of a session:

> Our design system is Tini Time Club. Read `readme.md` for brand rules before writing UI. Use tokens from `tokens/*.css` — never hardcode hex values. Controls are pill-radius, surfaces are soft-square (cards 22px, sheets 28px). Max two brand colours per surface plus neutrals. Copy voice is second person, sentence case, lowercase display headlines.

---

## Two substitutions to resolve before production

Both are flagged in `readme.md` §7:

- **Font** — Figtree stands in for the real wordmark family. Drop licensed `.woff2` files in and swap `tokens/fonts.css`.
- **Icons** — Lucide via CDN stands in for an unspecified icon set. Replace inside `components/core/Icon.jsx` if you have the real set.

## Ignore these files

`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` and `thumbnail.html` are build artifacts for the design-system tooling. Harmless, but nothing in your app should import them.
