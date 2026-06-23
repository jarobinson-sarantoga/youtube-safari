# AGENTS.md

## Project

**youtube-safari** is an **IINA media player plugin** (not a Safari extension). It resolves YouTube streams via yt-dlp with Safari cookies and Referer headers, and provides a browse/now-playing panel (Cmd+Shift+Y).

| Field | Value |
|-------|-------|
| Plugin ID | `com.jarobinson.youtube-safari` |
| Build | Parcel → `dist/` |
| Verify (Ubuntu CI) | `npm run build && npm test` |
| Full audit (mac CI) | `scripts/audit.sh` via **mac-audit** on studio-m4-max |

## Toolchain

npm + Parcel + TypeScript. **Not** part of the sarantoga-assistant pnpm monorepo.

```bash
npm install
npm run build
npm test
scripts/install.sh   # local dev: link into IINA
scripts/audit.sh     # full macOS audit (IINA + cookies required)
```

## Runner provisioning (studio-m4-max)

CI **mac-audit** runs on a dedicated self-hosted runner (`studio-m4-max-youtube-safari`) on the Mac Studio M4 Max (LAN `192.168.1.247`, Tailscale `100.119.31.70`).

**One-time setup on studio-m4-max:**

1. Install IINA, ripgrep (`brew install ripgrep`), Node 22
2. Export Safari cookies: `bash scripts/refresh-cookies.sh` (IINA needs Full Disk Access)
3. Preflight: `bash scripts/provision-runner.sh`
4. Download GitHub Actions runner into `~/actions-runner-youtube-safari`
5. Register: `GITHUB_TOKEN=<token> bash scripts/setup-studio-m4-max-runner.sh`
6. Start: `./svc.sh install && ./svc.sh start`

Refresh cookies periodically — live yt-dlp resolve checks in `audit.sh` fail when cookies expire.

PRs must pass **both** Ubuntu `verify` and studio-m4-max `mac-audit` before sarantoga auto-merge.

## IINA launch guardrails

Preserve patterns enforced by `scripts/audit.sh`:

- Register `mpv.addHook` and `onMessage("openYouTubeWatch")` before `global.postMessage("playerReady")`
- Call `menu.forceUpdate()` only via `scheduleMenuForceUpdate` in `native-menus.ts`
- Defer idle dock bootstrap to `iina.window-loaded`
- Global entry opens standalone panel; does not call `createPlayerInstance`

## Script paths

`Info.json` and several `src/*.ts` defaults use `~/Projects/youtube-safari/scripts/...`. Prefer relative `scripts/...` resolved via `utils.resolvePath()` in new code.
