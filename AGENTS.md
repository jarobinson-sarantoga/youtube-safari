# AGENTS.md

Guidance for AI agents working in this repository.

## Project

Thin YouTube-only **IINA plugin** that uses Safari cookies + Referer headers.

- Language: TypeScript, bundled with **Parcel**.
- Entry targets (see `package.json` → `targets`): `src/index.ts`, `src/global.ts`, `src/sidebar/shell.ts`, `src/sidebar/parse-core.ts`.
- Web UI lives in `pref.html` (preferences) and `sidebar/` (player/feed shell). Plugin manifest is `Info.json`.

## Build

```bash
npm run build
```

- Runs `parcel build` then `node --check` on the bundles.
- **Must run outside the sandbox** — invoke with `required_permissions: ["all"]`. Parcel's LMDB cache fails under the default sandbox.

## Tests

```bash
npm test
```

- Coverage is **limited**: only `parse-core` has real tests (`scripts/parse.test.mjs`); the rest is a `node --check` smoke check.
- Behavior-critical refactors need tests written **first** — do not assume existing tests will catch regressions.

## UI / Apple HIG

macOS Human Interface Guidelines apply to `pref.html` and everything in `sidebar/`.

- **Use the `hig-composer` skill** for any HIG work — do not audit from memory.
- "HIG compliant" means a **full checklist pass**, not partial fixes. Required categories:
  - System fonts; **rem-based** type scale.
  - Semantic / system colors; full **dark mode** support.
  - Contrast **≥ 4.5:1** for text.
  - Visible **focus rings**; proper `tabindex` / keyboard navigation.
  - Accessible **labels** on all controls.
  - Respect **reduced motion** (`prefers-reduced-motion`).
  - **Materials (HIG):** Liquid Glass for nav/controls only (`sidebar/css/materials.css`); standard translucent materials for content. Never flat opaque `Canvas`/`ButtonFace` panels in the normal path.
  - Spacing via `--sp-*` tokens in `sidebar/css/base.css` — no raw rem/px for layout gaps/padding (1px hairlines and fixed thumbnail dimensions excepted).
- Partial improvements are NOT compliance. Produce a pass/fail checklist; any FAIL = not done.

## File size (150 LOC)

Every source file (`.ts`, `.mjs`, `.css`, `.html`, `.sh` under `src/`, `sidebar/`, `scripts/`) must be **≤150 lines** (`wc -l`). Excludes `node_modules/`, `dist/`, `.parcel-cache/`.

When a module grows past the limit, split into a **directory + `index.ts` barrel** (e.g. `qualities/` with `parse.ts`, `cache.ts`, `list.ts`) so existing import paths like `./qualities` keep working. Top-level shims (`qualities.ts` → `export * from "./qualities"`) are OK for audit/grep probes. CSS: keep `sidebar/shell.css` as a thin `@import` entry; split sections into `sidebar/css/`.

Verify with: `find . -type f \( -name '*.ts' -o -name '*.mjs' -o -name '*.css' -o -name '*.html' -o -name '*.sh' \) ! -path './node_modules/*' ! -path './dist/*' ! -path './.parcel-cache/*' -exec sh -c 'test $(wc -l < "$1") -le 150 || echo FAIL "$1"' _ {} \;`

## Delivery

After making code changes, **rebuild and land on `main`**:

1. `npm run build` (outside sandbox) and `npm test` when relevant.
2. Commit on a branch, open a PR, merge to `main`, delete the branch.
3. Report the merged PR URL.

See `.cursor/rules/delivery-workflow.mdc` and `.cursor/rules/pr-auto-merge.mdc`. Skip only for read-only tasks or when the user says not to commit/merge.

## Conventions

- Match existing code style and structure; keep changes **minimal in scope**.
- In `pref.html`, **preserve `data-pref-key` bindings** — they wire controls to IINA preferences. Don't rename or drop them.
- Don't introduce build tooling or dependencies without cause.

## Orchestration Notes (lessons learned)

From a failed "100% HIG compliant" run:

- Absolute claims ("100%", "fully compliant", "production-ready") require **written acceptance criteria** and a completeness gate — fixing audit findings is not the same as 100%.
- **Invoke domain skills** (`hig-composer`) when the task matches; don't skip them.
- **QA against the user's stated bar** (full checklist pass/fail), not just diff safety.
- Deliver the **requested scope completely** before deferring other work; don't conflate partial delivery with success.
