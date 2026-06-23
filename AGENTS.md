# AGENTS.md

## Project

**youtube-safari** is an **IINA media player plugin** (not a Safari extension). It resolves YouTube streams via yt-dlp with Safari cookies and Referer headers, and provides a browse/now-playing panel (Cmd+Shift+Y).

| Field | Value |
|-------|-------|
| Plugin ID | `com.jarobinson.youtube-safari` |
| Build | Parcel → `dist/` |
| Verify | `npm run build && npm test` |
| Full audit | `scripts/audit.sh` (macOS + IINA + cookies; studio-m4-max only) |

## Toolchain

npm + Parcel + TypeScript. **Not** part of the sarantoga-assistant pnpm monorepo.

```bash
npm install
npm run build
npm test
scripts/install.sh   # local dev: link into IINA
```

## IINA launch guardrails

Preserve patterns enforced by `scripts/audit.sh`:

- Register `mpv.addHook` and `onMessage("openYouTubeWatch")` before `global.postMessage("playerReady")`
- Call `menu.forceUpdate()` only via `scheduleMenuForceUpdate` in `native-menus.ts`
- Defer idle dock bootstrap to `iina.window-loaded`
- Global entry opens standalone panel; does not call `createPlayerInstance`

## Script paths

`Info.json` and several `src/*.ts` defaults use `~/Projects/youtube-safari/scripts/...`. Prefer relative `scripts/...` resolved via `utils.resolvePath()` in new code.
