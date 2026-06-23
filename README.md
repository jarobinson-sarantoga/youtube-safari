# YouTube for IINA

A thin, YouTube-only [IINA](https://iina.io) plugin for macOS. It plays YouTube
in IINA's native player using your **Safari cookies** (so age-gated, members-only,
and personalized content work) and the correct **Referer headers** required for
`googlevideo.com` streams. A built-in sidebar lets you browse your feeds, search,
and pick quality without leaving IINA.

## Demo

<video src="https://github.com/jarobinson-sarantoga/youtube-safari/raw/main/docs/media/youtube-safari-demo.mp4" controls width="100%"></video>

> If the player above doesn't load, [watch the demo video directly](https://github.com/jarobinson-sarantoga/youtube-safari/raw/main/docs/media/youtube-safari-demo.mp4).

## Features

- **Native playback** — resolves YouTube URLs with `yt-dlp` and plays them in IINA, no embedded web player.
- **Safari cookies** — reuses your existing Safari YouTube session; nothing to log into separately.
- **Sidebar feed** — browse Home, Subscriptions, and search results in a YouTube-style sidebar.
- **Quality control** — cap resolution up to 4K; codecs are chosen automatically (AV1 → VP9 → H.264).
- **Chapters & resume** — chapter markers from the description and resume of your last watched video.
- **Keyboard shortcut** — open the panel with `Cmd+Shift+Y`.
- **Listen mode** — background/audio-only playback for music and podcasts.
- **HIG-compliant UI** — system fonts, colors, dark mode, and reduced-motion support.

## Requirements

- macOS with [IINA](https://iina.io) installed at `/Applications/IINA.app`.
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) — `brew install yt-dlp`.
- [Node.js](https://nodejs.org) 18+ (used to build the plugin and fetch feeds) — `brew install node`.
- **Safari signed into YouTube.** Grant IINA **Full Disk Access** (System Settings →
  Privacy & Security → Full Disk Access) so cookies can be exported from Safari.

## Install

```bash
git clone https://github.com/jarobinson-sarantoga/youtube-safari.git
cd youtube-safari
bash scripts/install.sh
```

`install.sh` builds the plugin, links it into IINA, binds `Cmd+Shift+Y`, and disables
IINA's bundled Online Media plugin so the two don't race on YouTube URLs. Restart IINA
afterward, then press `Cmd+Shift+Y` or use **Plugin → Open YouTube Panel**.

If playback fails after a while, your cookies may have expired — use
**Plugin → Refresh YouTube** to re-export them from Safari.

## Build from source

```bash
npm install
npm run build   # parcel build + node --check on the bundles
npm test        # parse-core tests + bundle smoke check
```

The plugin is written in TypeScript and bundled with [Parcel](https://parceljs.org).
Bundles are emitted to `dist/` and referenced by [`Info.json`](Info.json).

## Preferences

Open **IINA → Settings → Plugins → YouTube** to configure:

| Preference | Description |
| --- | --- |
| yt-dlp binary | Path to `yt-dlp` (defaults to IINA's `yt-dlp-iina` wrapper). |
| Cookies file | Where exported Safari cookies are stored. |
| Forced Referer | Applied to every `googlevideo.com` stream (required for playback). |
| Quality | Maximum resolution, Auto (up to 4K) down to 360p. |
| Resolve on load | Resolve YouTube on the load hook (vs. only on failure). |
| Browse (advanced) | Optional YouTube Data API v3 key; default search uses InnerTube + cookies. |

## How it works

1. IINA hands YouTube watch URLs to the plugin instead of its built-in handler.
2. The plugin exports Safari cookies and runs `yt-dlp` to resolve direct stream URLs.
3. It injects the required `Referer` header so `googlevideo.com` will serve the media.
4. The sidebar uses [`youtubei.js`](https://github.com/LuanRT/YouTube.js) (InnerTube)
   with the same cookies to render your feeds.

Everything runs locally. Your cookies never leave your machine.

## Contributing

See [AGENTS.md](AGENTS.md) for build, test, file-size, and HIG conventions.

## License

[MIT](LICENSE) © Jason Robinson
