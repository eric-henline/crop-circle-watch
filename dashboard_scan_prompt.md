# Crop Circle Watch — daily scan instructions

This is an automated, unattended run, invoked headless (`claude -p`) by a
launchd job on Eric's own Mac — not inside the Cowork sandbox. That means
you have full, normal network access. Eric is not present to answer
questions: execute autonomously, make reasonable judgment calls, and note
them in your final summary (the text you print is what ends up in
`scan_log.txt`).

## What this task is

You maintain "Crop Circle Watch," a small public dashboard at
`/Users/erichenline/Projects/crop-circles/dashboard/`. It is SEPARATE from
the coffee-table-book research project that lives in the parent
`crop-circles/` folder — do not touch `sessions/`, `index/`, `images/`, or
any other file outside this `dashboard/` folder.

Your shell's working directory is already set to this `dashboard/` folder
before you start — there's no need to `cd` there yourself. Use the absolute
path above for any Read/Edit calls.

The dashboard's whole purpose is a chronological log of GENUINELY NEW crop
circle formations — i.e. a fresh formation that appeared/was reported, not
general crop-circle commentary, retrospectives, theory pieces, or stories
about old/already-logged formations.

## Step 1 — Read current state

Read `data.js` in this folder. It's a plain JS file with
`window.STORIES = [ {...}, {...} ]` (newest first) and
`window.DASHBOARD_META = { lastScan, seasonLabel }`. Note every existing
story's `id`, `sourceUrl`, and `title`+`location`+`date` — you will use this
to avoid duplicates.

## Step 2 — Search for new formations

Run at least 5–6 varied web searches covering the last 3–5 days (use a few
days of overlap since slow-to-report formations happen), for example: "new
crop circle [current year]", "crop circle discovered [current month]
[current year]", "crop circle reported field [current year]",
"cropcircleconnector.com [current year]" (the best aggregator — check
`https://www.cropcircleconnector.com/[year]/[year].html` and that season's
monthly index page directly), plus a general check of r/cropcircles on
Reddit, Temporary Temples' recent-posts list, and any crop-circle
Facebook/X posts that surface. Don't limit yourself to the UK — check for
international reports too.

## Step 3 — Verify every candidate before trusting it

This is the most important step. Search snippets are unreliable and
frequently surface OLD recycled articles dressed up as current (a past run
nearly included a 2014 Germany story that resurfaced under a current-year
search). For every candidate:
- Fetch the actual page.
- Confirm a real, current publish/report date — look for a
  `published_time` meta tag, a visible byline date, or explicit "reported
  on [date]" text. The date must fall within roughly the last 5 days of
  today's actual date (check today's real date before judging this).
- If the date can't be confirmed as recent, or the piece is clearly a
  retrospective/theory/listicle rather than a report of a specific new
  formation, SKIP it.
- Only state what the source actually says — never invent
  geometric/pattern details the source doesn't mention. If a formation was
  destroyed/cut before it could be photographed, say so and leave
  `youtubeId` as `null` — don't guess at a video.

## Step 4 — Dedupe

Skip any formation that matches an existing entry's `sourceUrl`, or whose
title+location+date clearly describes a formation already in `data.js`.

## Step 5 — Build new entries

For each genuinely new, verified formation, build a story object matching
this exact schema (see comments at the top of `data.js` for the
authoritative field reference):

```js
{
  id: "YYYY-MM-DD-slug",          // slug from title, lowercase, hyphenated
  date: "YYYY-MM-DD",              // the report date, not today's date
  title: "Formation name",
  location: "Human-readable location string",
  description: "1-3 factual sentences. Only state what the source actually says.",
  tags: ["Country", "Region-or-County", "<year> season", "video" /* only if a real video was found */],
  sourceUrl: "https://...",        // the page you verified the date on
  sourceName: "Short source label",
  youtubeId: "abc123XYZ" // ONLY a real ID you confirmed by visiting the video's page — never guess or invent one. Use null if no video exists yet.
}
```

Do not hotlink "All Rights Reserved" photographer images directly — the
dashboard only embeds YouTube video (permitted) plus the outbound source
link; that's by design, leave it that way.

## Step 5b — Look for social posts (optional, only if genuinely found)

For each new formation, you may optionally do 1-2 targeted searches for a
real Bluesky or X/Twitter post specifically about it (e.g. the formation
name + "crop circle"). If you find one and can confirm it's a real post
about this specific formation — visit the actual post URL, don't trust a
search snippet — add it to that story's `socialPosts` array:

```js
socialPosts: [
  { platform: "bluesky", url: "https://bsky.app/profile/handle.bsky.social/post/xyz" },
  { platform: "x", url: "https://x.com/someone/status/123",
    author: "Display Name", handle: "@handle",
    text: "short excerpt of the actual post text",
    postedAt: "2026-06-21T14:30:00Z" }
]
```

`platform` and `url` are required; `author`/`handle`/`text`/`postedAt` are
optional but worth including for X posts (they render in a static card —
see `dashboard/README.md`'s "Why no live social search" section). Bluesky
posts need no extra fields since they load as a real live embed
automatically. Same rule as everything else in this file: never fabricate
a post or its text — if you can't find and verify a real one, just leave
`socialPosts` off the object entirely. This is a nice-to-have, not a
requirement for a successful scan run.

## Step 6 — Write the update

If you found one or more genuinely new formations:
1. Edit `data.js`: insert the new story object(s) at the TOP of the
   `STORIES` array (most recent first — if you found more than one, order
   them newest-date-first).
2. Update `DASHBOARD_META.lastScan` to the current run's timestamp, ISO
   8601 with the correct America/Los_Angeles UTC offset (`-07:00` during
   PDT / `-08:00` during PST — check which applies on today's actual
   date).
3. Validate your edit didn't break the file: run `node --check data.js`
   from this folder. If it fails, undo your edit and report the failure
   instead of committing broken JS.

If you found NO genuinely new formations, still update
`DASHBOARD_META.lastScan` to the current run's timestamp (so the
dashboard's "last scan" stat stays honest), but leave `STORIES` untouched.

## Step 7 — Commit, and push if possible

You're already in the right folder (see above), so just run:

```
git add -A
git commit -m "Scan YYYY-MM-DD: added N new formation(s)"   # or "Scan YYYY-MM-DD: no new formations found"
```

Unlike the old Cowork-sandbox version of this task, you're running directly
on Eric's Mac now, so you have real network access — push too:

```
git remote get-url origin
```

If that succeeds (an `origin` remote is configured), run
`git push origin HEAD:master` and note the result. If it fails (no remote
configured yet — the one-time GitHub setup in README.md hasn't been done),
skip pushing and just say so in your summary; don't treat it as an error.

A separate 7:10 AM Mac job (`push_dashboard.sh`) also retries the push as a
safety net, so a failed push here isn't fatal — just note it.

## Step 8 — Finish with a short summary

Print a short summary as your final output: how many candidate sources you
checked, how many you rejected and why (stale date / duplicate / not a new
formation), how many new formations you added (with names), the new
`lastScan` timestamp you wrote, and whether the push succeeded.
