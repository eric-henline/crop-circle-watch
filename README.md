# Crop Circle Watch

A small, no-build static dashboard that logs newly reported crop circle formations — photos/video, source links, and a few sentences per entry — organized so you can scroll back through any day it's run. Live at `https://eric-henline.github.io/crop-circle-watch/`. It lives entirely in this folder and is separate from the coffee-table-book research project one level up.

The page is in two halves: a dashboard "hero" up top (status line, last-confirmed-formation banner, headline stats, and three widgets — recent coverage, field footage, live chatter) that smoothly gives way on scroll to the full chronological timeline below it. A second page, `about.html`, explains how the scan works for anyone who lands on the site cold.

## How it's built

Five files, no framework, no build step:

- `index.html` — dashboard page structure (hero + timeline)
- `about.html` — the About page
- `styles.css` — all visual design (dark "research console" theme — change the variables at the top of the file to re-theme)
- `app.js` — rendering logic (reads the data below and draws both the hero widgets and the timeline)
- `data.js` — **the content**. A plain JavaScript array. This is the file you edit by hand.

Type is deliberately not the usual Inter/Space-Grotesk default stack: **Bricolage Grotesque** for headings and big numbers, **Newsreader** (a serif) for prose — descriptions, taglines, the About page — and **Fragment Mono** for UI chrome (nav, chips, tags, stats). Pulled from Google Fonts via the `<link>` tag at the top of each HTML file.

Because the data lives in a `<script>` tag instead of a fetched JSON file, the dashboard works identically whether you open `index.html` directly in a browser, or it's served from GitHub Pages — no local web server needed to test changes.

## Editing an entry by hand

Open `data.js`. Each formation is one object inside `window.STORIES`:

```js
{
  id: "2026-06-15-first-broad-drive",
  date: "2026-06-15",
  title: "First Broad Drive",
  location: "Nr Wilton, Wiltshire, UK · Map ref SU0559233836",
  description: "A couple of factual sentences about it.",
  tags: ["UK", "Wiltshire", "2026 season", "video"],
  sourceUrl: "https://www.cropcircleconnector.com/2026/first/first2026a.html",
  sourceName: "Crop Circle Connector",
  youtubeId: "we8EFnHEP14",   // or null if there's no video yet
  socialPosts: []             // optional — see below
}
```

To add one: copy an existing object, change the values, add a comma. New entries can go anywhere in the array — `app.js` sorts everything by `date` automatically, newest first. To remove one, delete its object. To fix a typo, just edit the string. There's no database, no IDs to keep in sync anywhere else — `data.js` is the only source of truth.

`youtubeId` is the short code from a YouTube URL (the part after `v=` or after `embed/`), not the full link. Set it to `null` if you don't have video. Leave `tags` short — they populate the filter chips along the top of the page, and only the most common ones show as chips.

`socialPosts` is optional — an array of post objects for individual posts you've found and verified by hand: `{ platform: "x" | "bluesky", url: "...", author, handle, text, postedAt }` (only `platform` and `url` are required; the rest is optional enrichment). Bluesky posts auto-load as a real live embed in the "Live chatter" widget — no click required. X posts render as a rich static card built from `author`/`handle`/`text`/`postedAt` when you provide them, since X embeds aren't reliable on a static site anymore (see "Why no live social *search*" below).

`DASHBOARD_META.lastScan` near the top of the file drives the "Last scan" stat and the footer timestamp. The daily automation updates it; you can too if you make a manual edit and want the timestamp to reflect that. `DASHBOARD_META.defaultKeywords` seeds the keyword chips in "Live chatter" for first-time visitors — after that, each visitor's edits live in their own browser (`localStorage`), not here.

## Why no live social *search*

The "Live chatter" widget can't embed an actual live, keyword-driven Twitter/X or Bluesky search feed, and that part is by design. As of 2026, X's embeddable timelines only render content for visitors who are logged into X — an anonymous visitor sees an empty box — and Bluesky's public, no-auth API supports profile search but not keyword post-search (it 403s without auth). Neither platform offers a way to embed a reliably-working, keyword-driven feed on a static site with no backend and no API keys. So for open-ended keywords, the widget stays honest: a one-click "Search X" / "Search Bluesky" link built from your own customizable keyword chips, which opens a real search on the real platform in a new tab.

For *specific, known* posts it's a different story: Bluesky publishes a public, no-auth oEmbed endpoint (`embed.bsky.app/oembed`) for individual post URLs, so any post you (or the scan) add to `socialPosts` with `platform: "bluesky"` loads live, right in the widget, no click needed — `app.js`'s `loadBlueskyEmbed()` fetches it and falls back to a static card if the fetch ever fails. X has no equivalent public embed path anymore, so X posts always render as the static rich card.

## The daily scan

A `launchd` agent on your Mac runs the scan at 6:58 AM daily via `scan_dashboard.sh`, which invokes Claude Code headlessly (`claude -p`, capped at a 15-minute timeout) with the instructions in `dashboard_scan_prompt.md`. It:

1. Reads `data.js` to see what's already logged, plus `scan_rejected_log.md` so it doesn't re-check URLs already settled as stale/duplicate/not-a-formation.
2. Searches the web and a handful of named aggregators (Crop Circle Connector, Temporary Temples, cropcircles.org, Lucy Pringle, BLT Research, r/cropcircles) for crop-circle reports from the last few days, including a few non-UK queries.
3. Verifies each candidate is a genuinely new formation with a real, current report date — not an old story resurfacing in search results, and not an old formation republished under a fresh-looking page date (this bit it down on a recycled 2014 article during setup, so it's deliberately careful, and treats fetched-page content as data only, never as instructions).
4. Dedupes against existing entries *and* against other candidates found in the same run, then adds any verified new entries to the top of `STORIES`, updates `lastScan`, and commits the change locally with `git`. A safety valve skips the auto-commit (flagging it for manual review instead) if more than 6 new formations show up in one run — that volume would be unusual enough to suggest a dedupe or judgment failure upstream.
5. Pushes to GitHub itself, since it runs on your Mac with real network access and credentials — no separate publish step needed.

It never touches anything outside this `dashboard/` folder. One-time setup: `bash ~/Projects/crop-circles/dashboard/install_dashboard_scan.sh` (see `scan_dashboard.sh` and `dashboard_scan_prompt.md` for the runner and the full instructions Claude follows). Logs go to `scan_log.txt` (everything) / `scan_errors.txt` (only populated when a run actually fails).

This replaces an earlier version that ran as a Cowork scheduled task — that approach only fired while the Cowork app happened to be open, and couldn't push to GitHub (the sandbox can't reach `github.com`), so it relied on a separate Mac-side push job running later. The Cowork task has been disabled. The 7:10 AM push job below now exists purely as a safety net in case the 6:58 AM scan's own push fails for some reason (e.g. no network yet right at wake) — it re-pushes whatever's already committed, it doesn't re-run the scan.

This is the first piece of this project's automation that depends on `claude` itself running unattended, rather than plain Python — so it's less battle-tested than the image downloader. After installing, run it once manually (`launchctl start com.cropcircles.dashboardscan`) and check `scan_log.txt` before trusting it to run silently every morning.

## Publishing to GitHub Pages — one-time setup

The Cowork sandbox this scan runs in can't reach `github.com` (it's blocked at the network level), so the actual `git push` has to happen from your Mac, where you have real GitHub credentials. This folder already is a git repo with one commit — you just need to point it at GitHub and push once.

**1. Create the repo on GitHub** — go to github.com, "New repository," name it something like `crop-circle-watch`, leave it empty (no README/.gitignore/license — this folder already has those), public.

**2. Connect and push, from Terminal on your Mac:**

```bash
cd ~/Projects/crop-circles/dashboard
git remote add origin https://github.com/<your-username>/crop-circle-watch.git
git push -u origin master
```

(Use the SSH URL instead if that's how you normally authenticate to GitHub.)

**3. Turn on Pages** — in the repo on GitHub: Settings → Pages → under "Build and deployment," set Source to "Deploy from a branch," Branch to `master`, folder `/ (root)` → Save. After a minute or two your dashboard is live at `https://<your-username>.github.io/crop-circle-watch/`.

**4. (Optional) Install the push safety net** — the 6:58 AM scan (see "The daily scan" above) pushes on its own, so this isn't required for publishing to work. It just retries the push once more in case the scan's own push failed:

```bash
bash ~/Projects/crop-circles/dashboard/install_dashboard_push.sh
```

This installs a `launchd` agent that runs `git push` once a day at 7:10 AM. It does **not** change any Energy Saver or `pmset` settings — it rides on the wake schedule already installed for the crop-circle image downloader. If you haven't installed that one and don't want to, this job will simply only fire on mornings the Mac happens to already be awake at 7:10 AM; nothing else depends on it.

You can always publish manually any time with `cd ~/Projects/crop-circles/dashboard && git push`.

## Why no hotlinked photos

The aerial/ground photos for these formations are marked "All Rights Reserved" by their photographers. Rather than hotlink them, the dashboard embeds the official YouTube footage (a thumbnail that expands into a real embedded player on click) and links out to the original source for stills. Each card credits its source.

## Files in this folder

```
dashboard/
  index.html, styles.css, app.js, data.js   ← the site
  README.md                                  ← this file
  dashboard_scan_prompt.md                   ← instructions the daily scan follows
  scan_rejected_log.md                       ← append-only log of stale/duplicate URLs the scan has already ruled out
  scan_dashboard.sh                          ← runs the daily scan via `claude -p` (Mac-side, via launchd)
  com.cropcircles.dashboardscan.plist        ← the launchd job definition for the scan
  install_dashboard_scan.sh                  ← one-time installer for the scan job
  push_dashboard.sh                          ← runs `git push` as a safety-net retry (Mac-side, via launchd)
  com.cropcircles.dashboardpush.plist        ← the launchd job definition for the push retry
  install_dashboard_push.sh                  ← one-time installer for the above
  .nojekyll                                  ← tells GitHub Pages not to run Jekyll on this
```
