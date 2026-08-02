# Crop Circle Watch

A small, no-build static dashboard that logs newly reported crop circle formations — photos/video, source links, and a few sentences per entry — organized so you can scroll back through any day it's run. Live at `https://eric-henline.github.io/crop-circle-watch/`. It lives entirely in this folder and is separate from the coffee-table-book research project one level up.

The page is in two halves: a dashboard "hero" up top (status line, last-confirmed-formation banner, headline stats, and four widgets — field footage and recent coverage in a wide left column, live chatter and discussion forums in a narrow right one) that smoothly gives way on scroll to the full chronological timeline below it. A second page, `about.html`, explains how the scan works for anyone who lands on the site cold.

Those four widgets are laid out as **two flex columns, not a 2×2 grid** — see the comment above `.widget-grid` in `styles.css`. A grid forces both boxes in a row to share the row's height, and these four have very different natural heights, so the grid version left two dead gaps of 150px and 390px. On phones the columns collapse to `display:contents` and `order` restores the footage → chatter → coverage → forums reading sequence; that media query also has to flip `align-items` back to `stretch`, or every box shrink-wraps to its own min-content and Live chatter's Bluesky iframe blows out past the viewport.

## How it's built

No framework, no build step, no third-party JavaScript:

- `index.html` — dashboard page structure (hero + timeline)
- `about.html` — the About page
- `research.html` — the Research page (charts and findings)
- `styles.css` — all visual design (dark "research console" theme — change the variables at the top of the file to re-theme). Also defines the chart palette; **read the comment above `--cat-1` before changing those values.**
- `research.css` — styles used only by the Research page; inherits every theme token from `styles.css`
- `app.js` — rendering logic for the dashboard (hero widgets + timeline)
- `research-app.js` — the Research page's chart engine. Hand-rolled inline SVG — deliberately no chart library, so the site keeps its zero-dependency property.
- `data.js` — **the content**. Plain JavaScript arrays. This is the file you edit by hand.
- `research.js` — **generated, do not hand-edit.** Written by `analytics/export_research_json.py`.

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

## Duplicate formations — one circle, many names

**The same crop circle regularly appears under two different names**, because
the aggregators name formations independently. Crop Circle Connector filed the
21 July 2026 formation as **Wanborough Plain**; Temporary Temples filed the same
circle as **Fox Hill**. Not one word in common in the title, not one in the
location — and both went live as separate cards. It happened again on 15 June
2026 with **First Broad Drive** (Connector) and **Great Wishford** (Temporary
Temples), whose map refs turn out to be 29 metres apart. Comparing titles cannot
catch this.

### Checking

```bash
node check_duplicates.js
```

Exit 0 = clean, exit 1 = duplicates found (it prints the pair and the evidence).
`--all` also shows weaker near-misses; `--json` is machine-readable. To test a
single candidate before adding it:

```bash
node check_duplicates.js --check "Fox Hill|Fox Hill, Wiltshire, UK|2026-07-21|"
```

The matching rules live in `dedupe.js` and score three signals that survive a
name change — **OS grid ref proximity** (parsed straight out of the `location`
string), a **shared `youtubeId`**, and a **shared URL** across
`sourceUrl`/`references` — gated on the dates being within a few days. It never
merges anything on its own; it reports, and a human decides. `test_dedupe.js`
(`node test_dedupe.js`) pins both halves of the behaviour: the real duplicates
above must be caught, and Roundway Hill vs Roundway Hill (2) — genuinely two
circles at one site a week apart — must *not* be.

The daily runner re-runs the check after each scan and fires a macOS
notification if a duplicate got through, so it surfaces the same morning rather
than weeks later by eye.

### Merging

Merge, don't delete. One formation is one card that carries everything both
sources said about it:

```js
{
  id: "2026-07-21-wanborough-plain",   // survivor's id — unchanged
  title: "Wanborough Plain",
  aliases: ["Fox Hill"],               // renders as "Also reported as …", searchable
  mergedIds: ["2026-07-21-fox-hill"],  // retired id — old links still resolve
  description: "…both sources' detail, each attributed…",
  references: [                        // both reports, labelled by source
    { label: "Crop Circle Connector — Wanborough Plain", url: "…" },
    { label: "Temporary Temples — Fox Hill", url: "…" }
  ]
}
```

Keep the entry that carries a `formationId` (it links to the research registry);
failing that, the one with a map ref. Add the loser's `id` to `mergedIds` and
delete its object. Never reuse a retired id for a new formation.

`aliases` does double duty: it makes the card findable under either name in
search, and it teaches `dedupe.js` that name, so a *later* report under the
retired name is recognised as this formation instead of logged again.

## Why no live social *search*

The "Live chatter" widget can't embed an actual live, keyword-driven Twitter/X or Bluesky search feed, and that part is by design. As of 2026, X's embeddable timelines only render content for visitors who are logged into X — an anonymous visitor sees an empty box — and Bluesky's public, no-auth API supports profile search but not keyword post-search (it 403s without auth). Neither platform offers a way to embed a reliably-working, keyword-driven feed on a static site with no backend and no API keys. So for open-ended keywords, the widget stays honest: a one-click "Search X" / "Search Bluesky" link built from your own customizable keyword chips, which opens a real search on the real platform in a new tab.

For *specific, known* posts it's a different story: Bluesky publishes a public, no-auth oEmbed endpoint (`embed.bsky.app/oembed`) for individual post URLs, so any post you (or the scan) add to `socialPosts` with `platform: "bluesky"` loads live, right in the widget, no click needed — `app.js`'s `loadBlueskyEmbed()` fetches it and falls back to a static card if the fetch ever fails. X has no equivalent public embed path anymore, so X posts always render as the static rich card.

## The Research page

`research.html` renders charts from `research.js`, which is **generated** — never
hand-edited. The page has five tabs:

| Tab | What it covers |
|-----|----------------|
| Geography | Country and county distribution, the world/detail scatter, ancient-site proximity, named monuments, repeat-hit fields |
| Time & season | Month curve, formations per year, the month × decade season heatmap, every headline metric cut by decade |
| Geometry & scale | Complexity distribution, geometric types, encoded features, the complexity-over-time regression, size bands, size vs complexity, the largest formations |
| Evidence | The authenticity verdict split, media coverage vs complexity, anomaly-flag prevalence |
| Hypotheses | Current confidence by hypothesis and how it has shifted week to week |

Two more tabs — **Research log** (the daily routine's own cadence, angle
rotation, and session notes) and **Dataset health** (completeness/growth
internals) — existed briefly and were removed 2026-08-01: internal-process
detail that isn't meant to be public. Removal was end-to-end, not just
hiding the tabs — the exporter no longer reads `index/image-leads.md` or
`sessions/*.md` at all, and `research.js` no longer carries a `programme` or
`health` key, so that data never ships to a visitor's browser in the first
place.

The pipeline now has one real input stream plus one narrow exception:

```
analytics/crop_circle_analytics.py     runs weekly (Sunday), writes:
  data/all_formations.csv                  merged dataset
  data/snapshots/YYYY-WXX.json             ~22 scalar metrics per week
  hypotheses/hypothesis_tracker.md         confidence table over time
        |
        |     the daily research routine also maintains, by hand:
        |       index/formations.md          per-formation Authenticity verdict
        |            |
        v            v
analytics/export_research_json.py      reads both, writes:
  dashboard/research.js                    window.RESEARCH
```

The Authenticity column is why the exporter reads one file outside
`analytics/` at all. The engine only ever sees the numeric CSV; that verdict
is a judgment call the research routine makes per formation, which no amount
of re-running the engine would produce. The **Evidence** tab is built from
it.

To refresh the page after an analytics run:

```bash
python3 analytics/export_research_json.py
```

The exporter is deliberately *separate* from the analytics engine rather than a
hook inside it: it only reads the engine's outputs, so it can be re-run at any
time, costs nothing (no sklearn, no matplotlib, no model fitting), and cannot
break the Sunday job.

### Thresholds the exporter enforces

Three places drop thin data rather than plotting it, because a percentage over a
handful of records renders identically to one over a hundred and reads as a
finding:

- **Decade cuts** need ≥ 10 records in the decade. The 1970s hold three
  formations, two of them UK — a "67% UK share" point next to the 2020s' 74%.
- **Season heatmap rows** need ≥ 5 *month-dated* records, which is a smaller set
  than the decade's record count (not one of the three 1970s formations carries a
  month at all). One data point renders as a single full-intensity cell.
- **Size-vs-complexity bands** need ≥ 3 records carrying a diameter.

### Chart primitives

All hand-rolled in `research-app.js`; no chart library. Beyond the original
`barsH` / `barsV` / `lineChart` / `scatterGeo` / `confidenceBars`:

- `stackedBar` — one whole split into parts, labelled in-segment
- `heatmap` — two categorical axes, **row-normalised** (see the comment above it
  for why a global scale would be the wrong call here)
- `sparkGrid` — small multiples, each on its own y scale, for series that share
  an x axis but not a unit
- `rankList` — HTML rather than SVG, because its row labels are real place and
  formation names that have to wrap

One CSS gotcha worth knowing before you add a chart: `.r-chart text` is
specificity (0,1,1), so a bare `.r-some-label { fill: … }` rule **loses to it**
and your label silently renders in the default axis grey. Scope it as
`.r-chart .r-some-label`.

The engine also writes ten PNG charts to `analytics/visualizations/`. Those are
an **internal artifact and are not used on the site** — they carry their own
hardcoded palette, are fixed-size rasters, and would not match the site theme or
scale to a phone. The site re-draws the same numbers as inline SVG instead, using
the CSS chart-palette variables, so the charts re-theme with the rest of the site.

## The daily scan

A `launchd` agent on your Mac runs the scan at 6:58 AM daily via `scan_dashboard.sh`, which invokes Claude Code headlessly (`claude -p`, capped at a 15-minute timeout) with the instructions in `dashboard_scan_prompt.md`. It:

1. Reads `data.js` to see what's already logged, plus `scan_rejected_log.md` so it doesn't re-check URLs already settled as stale/duplicate/not-a-formation.
2. Searches the web and a handful of named aggregators (Crop Circle Connector, Temporary Temples, cropcircles.org, Lucy Pringle, BLT Research, r/cropcircles) for crop-circle reports from the last few days, including a few non-UK queries.
3. Verifies each candidate is a genuinely new formation with a real, current report date — not an old story resurfacing in search results, and not an old formation republished under a fresh-looking page date (this bit it down on a recycled 2014 article during setup, so it's deliberately careful, and treats fetched-page content as data only, never as instructions).
4. Dedupes against existing entries *and* against other candidates found in the same run — running `check_duplicates.js` on each candidate, and merging rather than adding a second card when the same circle turns up under a second name (see "Duplicate formations" above) — then adds any verified new entries to the top of `STORIES`, updates `lastScan`, and commits the change locally with `git`. A safety valve skips the auto-commit (flagging it for manual review instead) if more than 6 new formations show up in one run — that volume would be unusual enough to suggest a dedupe or judgment failure upstream.
5. Pushes to GitHub itself, since it runs on your Mac with real network access and credentials — no separate publish step needed.

It never touches anything outside this `dashboard/` folder. One-time setup: `bash ~/Projects/crop-circles/dashboard/install_dashboard_scan.sh` (see `scan_dashboard.sh` and `dashboard_scan_prompt.md` for the runner and the full instructions Claude follows). Logs go to `scan_log.txt` (everything) / `scan_errors.txt` (only populated when a run actually fails).

**After each run**, the runner re-runs `node check_duplicates.js` on the committed result. The prompt already tells the agent to check before committing, but a prompt isn't enforcement and this job runs at 06:58 with nobody watching — so if a duplicate got through anyway, the pair and the evidence land in `scan_errors.txt` and a macOS notification fires. It's too late to block the push the agent already made; the point is that you find out that morning rather than spotting it by eye weeks later, which is how the Wanborough Plain / Fox Hill pair was caught.

**If a run fails** (non-zero exit — auth expired, out of credit, timeout, etc.), `scan_dashboard.sh` fires a native macOS notification via `notify_failure.sh`, with a specific reason pattern-matched from the log (e.g. "Auth expired — run: claude login") rather than a generic "something broke." This exists because a failure at authentication happens *before* the script ever touches `data.js`, so the dashboard's own amber scan-status indicator (`DASHBOARD_META.lastScanStatus`) never gets a chance to fire — that only works once a run gets far enough to write it. The notification is the only place this class of failure is caught, and it's what alerted us to a multi-day OAuth-expiry outage in July 2026 that otherwise went unnoticed.

This replaces an earlier version that ran as a Cowork scheduled task — that approach only fired while the Cowork app happened to be open, and couldn't push to GitHub (the sandbox can't reach `github.com`), so it relied on a separate Mac-side push job running later. The Cowork task has been disabled. The 7:10 AM push job below is a safety net for the case where the 6:58 AM scan's own push fails (e.g. no network yet right at wake) — it re-pushes whatever's already committed, it doesn't re-run the scan.

> **It is not currently installed.** `launchctl list` shows only `com.cropcircles.download` and `com.cropcircles.dashboardscan`, and `push_log.txt` has never been created. This is worth knowing because it is not hypothetical: on 2026-08-01 the scan researched the whole morning, staged its three files, and then failed to commit them (stale `.git/HEAD.lock`). The push job's `git add -A` fallback would have committed and pushed that work at 7:10 and nobody would have had to notice. Install it with step 4 below if you want that recovery. The scan's own post-run commit check (added 2026-08-02) will at least *tell* you when this happens either way.

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
  about.html                                 ← About page
  research.html, research.css,               ← Research page (charts)
    research-app.js
  research.js                                ← GENERATED chart data — do not hand-edit
  social.js                                  ← GENERATED Bluesky chatter — do not hand-edit
  fetch_social.py                            ← `python3 fetch_social.py` — rewrites social.js; run by the daily scan
  labs/                                      ← formation studies (animations), not linked from the site yet
    index.html                               ← all three studies on one page, for comparison — START HERE
    anim-engine.js                           ← shared stage/HUD/controls/driver; mounted once per study
    studies.js                               ← the studies themselves: geometry + render(ctx, p)
    labs.css                                 ← shared lab chrome; consumes styles.css tokens only
    formation-anim.html, julia-set.html      ← thin single-study wrappers around the same specs
  dedupe.js                                  ← duplicate-formation matching rules (Node-side only; the site doesn't load it)
  check_duplicates.js                        ← `node check_duplicates.js` — audits data.js for the same circle logged twice
  test_dedupe.js                             ← `node test_dedupe.js` — tests for the matching rules
  README.md                                  ← this file
  TODO.md                                    ← planned work, with status
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
