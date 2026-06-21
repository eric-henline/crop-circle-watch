# Crop Circle Watch

A small, no-build static dashboard that logs newly reported crop circle formations — photos/video, source links, and a few sentences per entry — organized so you can scroll back through any day it's run. It lives entirely in this folder and is separate from the coffee-table-book research project one level up.

## How it's built

Four files, no framework, no build step:

- `index.html` — page structure
- `styles.css` — all visual design (dark "research console" theme — change the variables at the top of the file to re-theme)
- `app.js` — rendering logic (reads the data below and draws the page)
- `data.js` — **the content**. A plain JavaScript array. This is the file you edit by hand.

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
  youtubeId: "we8EFnHEP14"   // or null if there's no video yet
}
```

To add one: copy an existing object, change the values, add a comma. New entries can go anywhere in the array — `app.js` sorts everything by `date` automatically, newest first. To remove one, delete its object. To fix a typo, just edit the string. There's no database, no IDs to keep in sync anywhere else — `data.js` is the only source of truth.

`youtubeId` is the short code from a YouTube URL (the part after `v=` or after `embed/`), not the full link. Set it to `null` if you don't have video. Leave `tags` short — they populate the filter chips along the top of the page, and only the most common ones show as chips.

`DASHBOARD_META.lastScan` near the top of the file drives the "LAST SCAN" stat and the footer timestamp. The daily automation updates it; you can too if you make a manual edit and want the timestamp to reflect that.

## The daily scan

A Cowork scheduled task named `crop-circle-dashboard-scan` runs once a day (currently ~6:20 AM) and:

1. Reads `data.js` to see what's already logged.
2. Searches the web for crop-circle reports from the last few days.
3. Verifies each candidate is a genuinely new formation with a real, current report date (not an old story resurfacing in search results — this bit it down on a recycled 2014 article during setup, so it's deliberately careful).
4. Adds any verified new entries to the top of `STORIES`, updates `lastScan`, and commits the change locally with `git`.

It never pushes to GitHub itself — see below for why — and it never touches anything outside this `dashboard/` folder.

One thing worth knowing: this scan runs inside the Cowork app, so it only fires if Cowork is open at the scheduled time. If it's closed, the run happens the next time you open the app, not silently in the background on a closed app.

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

**4. (Optional) Automate future pushes** — so each day's scan actually reaches the live site without you running `git push` by hand:

```bash
bash ~/Projects/crop-circles/dashboard/install_dashboard_push.sh
```

This installs a `launchd` agent that runs `git push` once a day at 7:10 AM. It does **not** change any Energy Saver or `pmset` settings — it rides on the wake schedule already installed for the crop-circle image downloader. If you haven't installed that one and don't want to, this job will simply only fire on mornings the Mac happens to already be awake at 7:10 AM; nothing else depends on it.

Until you do step 4, you can always publish manually any time with `cd ~/Projects/crop-circles/dashboard && git push`.

## Why no hotlinked photos

The aerial/ground photos for these formations are marked "All Rights Reserved" by their photographers. Rather than hotlink them, the dashboard embeds the official YouTube footage (a thumbnail that expands into a real embedded player on click) and links out to the original source for stills. Each card credits its source.

## Files in this folder

```
dashboard/
  index.html, styles.css, app.js, data.js   ← the site
  README.md                                  ← this file
  push_dashboard.sh                          ← runs `git push` (Mac-side, via launchd)
  com.cropcircles.dashboardpush.plist        ← the launchd job definition
  install_dashboard_push.sh                  ← one-time installer for the above
  .nojekyll                                  ← tells GitHub Pages not to run Jekyll on this
```
