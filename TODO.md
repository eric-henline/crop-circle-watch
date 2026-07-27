# Dashboard To-Do — implementation plan

Seven items. Ordered by dependency and payoff. File/line references are against
the state of the repo on 2026-07-27.

**Status as of 2026-07-27:**

| # | Item | Status |
|---|------|--------|
| 1 | Footer cleanup | **done** |
| 2 | Crop Circle Watch sign-off block | **done** |
| 3 | Recent Coverage — more words | **done** |
| 4 | Recent Coverage — videos/docs/community | **done** (needs scan to populate) |
| 5a | Reddit forum links | **done** (URLs need one verification pass) |
| 5b | Live social posts | **decided**: build-time via the daily scan — not built yet |
| 6 | Research tab | **done** — 5 sub-tabs, 13 cards, 11 charts |
| 7 | Formation animation | **designed** — see [ANIMATION.md](ANIMATION.md); not built |

### Open follow-ups

- **Verify the four Reddit URLs.** They were written from knowledge; reddit.com
  was unreachable from the environment. Open each once and drop any that
  don't resolve to a live, on-topic subreddit. See the TODO in `data.js`.
- **Populate `COVERAGE`.** The array ships empty by design. `dashboard_scan_prompt.md`
  Step 2c now instructs the daily scan to fill it; nothing appears until it does.
- **#5b build-time social feed.** Decided architecture: extend `scan_dashboard.sh`
  to fetch Bluesky (public API, no auth) + Reddit (OAuth client-credentials) and
  commit a `social.js`. No new hosting, no runtime keys. X stays a link-out —
  read access is ~$200/mo and not worth it.
- **Scatter plot overplotting.** ~353 points render as ~40 visible dots because
  half the archive sits inside two degrees of latitude. The card text now says so
  explicitly, but a UK inset or a density/hexbin treatment would be better.

### What shipped for the research tab

| File | Role |
|------|------|
| `analytics/export_research_json.py` | **new.** Standalone exporter. Reads the weekly engine's *artifacts* (`all_formations.csv`, `data/snapshots/*.json`, `hypothesis_tracker.md`) and writes `research.js`. Does not touch `crop_circle_analytics.py`, so it cannot break the Sunday run. Re-runnable any time; no sklearn/matplotlib. |
| `dashboard/research.js` | **generated.** `window.RESEARCH` — do not hand-edit. |
| `dashboard/research.html` | New page. Shares the sprite/background/header shell with `index.html`. |
| `dashboard/research.css` | Page-specific styles; inherits all theme tokens from `styles.css`. |
| `dashboard/research-app.js` | Chart engine + page app. Hand-rolled inline SVG, no chart library. |
| `styles.css` `:root` | New chart palette tokens: `--cat-1..8`, `--seq-1..5`, `--div-*`. |

**On the chart palette — read before changing a colour.** The marks do *not*
use `--accent`/`--signal`. Those sit at OKLCH lightness ~0.90 and fail the
lightness band a dark chart surface needs. The `--cat-*` / `--seq-*` values were
computed in OKLCH and machine-validated (lightness band, chroma floor,
Machado-2009 CVD separation on adjacent pairs, WCAG contrast vs `--panel`) with
the `dataviz` skill's validator. Worst adjacent CVD pair is ΔE 22.5, comfortably
above the 12.0 target. **Reordering `--cat-*` breaks that separation** — re-run
the validator if you change them.

Re-generate the data after any analytics run:

```
python3 analytics/export_research_json.py
```

Key context discovered while planning:

- The site is a **static, no-build** site (`index.html` + `about.html`, plain
  `data.js` / `history.js` globals, one `app.js` IIFE, one `styles.css`).
  Deployed from its own repo: `github.com/eric-henline/crop-circle-watch`.
- The theme is centralized in CSS variables at [styles.css:15](styles.css) —
  `--accent:#6bffc2`, `--signal:#ffb454`, `--panel`, `--border`, three fonts.
  Anything new must consume those variables, never hardcode color.
- **An analytics engine already exists** and is the natural data source for the
  research tab: `../analytics/crop_circle_analytics.py` runs weekly (Sunday),
  writes `reports/master_report.md`, `reports/weekly/YYYY-WXX_summary.md`,
  `hypotheses/hypothesis_tracker.md`, `data/snapshots/YYYY-WXX.json` (~22
  scalar metrics per week, 12 weeks accumulated), and 10 PNG charts in
  `analytics/visualizations/`.
- The daily scan writes `data.js` per `dashboard_scan_prompt.md`; any schema
  change below has to be mirrored in that prompt or the scan will stop
  producing the new fields.

---

## Phase 0 — Quick wins (no data dependencies)

### 1. Footer cleanup

- Delete the "Logged manually or by the daily automated scan described in
  `README.md`." sentence at [index.html:289](index.html). Keep the
  "Photography and footage remain the property of their original creators…"
  sentence. Note `about.html:150` already has exactly the desired one-line
  form — **make index.html match it**, so the two pages stop diverging.
- Restyle `.site-footer` ([styles.css:1182](styles.css)). Currently it is a
  bare left-aligned text block. Target: a proper footer band — top rule,
  three-column grid (brand mark + wordmark · nav/links · scan status &
  updated stamp), collapsing to a single centered column under 720px.

### 2. "Crop Circle Watch" footer identity block

Same pass as #1 — this is the `.footer-meta` line
("Crop Circle Watch · part of the crop-circles research project · About").
Give it the `#icon-ring-logo` mark, set the wordmark in `--font-display`, drop
the middot soup, and lay it along the bottom in the grid from #1. Should read
as a deliberate sign-off, not a run-on caption.

**Cost:** ~1 file each, half a session for both. Do these first — they are
visible immediately and unblock nothing else.

---

## Phase 1 — Content depth (data-schema changes)

### 3. Recent Coverage — more words on the most recent articles

`renderNews()` at [app.js:680](app.js) currently renders `stories.slice(0,6)`
as title + `sourceName · date` only. The `description` field is already
populated on every story but is thrown away here.

Plan:
- Render a 2–3 line clamped excerpt under the title for the **top 2–3 items**
  only (a `.news-item--lead` variant), keeping items 4–6 as compact one-liners.
  This gives the "most recent gets more detail" the item asks for without
  turning the widget into a wall of text.
- Add an optional `coverageNote` field to the story schema for a longer,
  coverage-specific write-up when `description` (which is formation-focused)
  isn't the right text. Falls back to `description`.
- Mirror the new field in `data.js`'s schema comment and in
  `dashboard_scan_prompt.md` Step 5.

### 4. Recent Coverage — videos, documentaries, community happenings

Today coverage is implicitly "an article attached to a formation" — a story
object with a `sourceUrl`. Videos live in a *separate* widget
(`renderVideoStrip()`, [app.js:708](app.js), keyed off `story.youtubeId`), and
anything not tied to a specific formation (a documentary, a conference, a
researcher interview, a book release) currently **has nowhere to live at all**.

Plan:
- Add a new top-level `window.COVERAGE = [...]` array in `data.js`, separate
  from `STORIES`, with `{ id, date, kind, title, outlet, url, summary,
  youtubeId?, durationMin?, formationId? }` where `kind` ∈ `article` |
  `video` | `documentary` | `podcast` | `event` | `community`.
- `renderNews()` merges `COVERAGE` with article-shaped `STORIES` entries,
  sorts by date desc, and renders a small kind-badge per row (reuse the
  existing icon sprite: `#icon-doc`, `#icon-play`, `#icon-rss`).
- Keep the video strip as-is — it stays the "field footage" visual rail; the
  coverage list is the textual feed. A documentary appears in both if it has a
  `youtubeId`.
- Extend `dashboard_scan_prompt.md` with a "Step 2c — non-formation coverage"
  section so the daily scan actually populates it (with the same
  verify-before-trusting rules as Step 3; no fabricated entries).

### 5. Live chatter — real posts + Reddit links

`renderSocialPosts()` ([app.js:830](app.js)) only ever shows posts hand-verified
into `story.socialPosts`. Bluesky posts do live-embed via oEmbed; X posts are
static cards. The widget looks empty because the scan rarely finds/verifies any.

Plan, in two independent parts:

- **(a) Reddit links — do this first, it's cheap and always works.** Add a
  `REDDIT_FORUMS` list to `data.js` (`r/cropcircles`, `r/HighStrangeness`,
  `r/aliens`, `r/Glitch_in_the_Matrix` — verify each is live before shipping)
  and render a compact link row in the widget under the keyword chips. Static,
  no API, no failure mode.
- **(b) Actually surfacing posts.** The honest constraint: this is a static
  site with no backend, so there is no way to *live query* X or Bluesky
  keyword search from the page. Two real options:
  1. **Bluesky public API from the browser** — `app.bsky.feed.searchPosts` is
     readable unauthenticated over CORS. This genuinely delivers a live
     crop-circle post feed with zero backend. Recommended.
  2. Keep it curated, but make the **daily scan** responsible for finding
     3–5 posts each run and writing them to a top-level `SOCIAL_FEED` array
     (rather than only per-story). Reliable but stale between scans.
  Do (1), with (2)'s curated array as the fallback render when the API call
  fails or returns nothing. Update the widget's `.widget-sub` copy, which
  currently explains the old curated-only behavior.

---

## Phase 2 — Research tab (the big one)

### 6. Research tab with scroll feed and sub-tabs

**The central decision: don't ship the matplotlib PNGs.** The engine's 10
charts use its own hardcoded "alien dark theme" palette, are fixed-size
rasters, don't respond to viewport, and won't match `--accent`/`--panel`. The
request is explicitly "nicely colored and smooth design fitting in with the
website themes." So:

**Pipeline:** extend `crop_circle_analytics.py` with an exporter that writes
`dashboard/research.js` — `window.RESEARCH = { generatedAt, metrics, series,
findings, hypotheses }` — built from the same in-memory frames that already
produce the PNGs, plus the 12 accumulated `data/snapshots/*.json` for
week-over-week series. PNGs stay as the internal artifact; the site renders
from the JSON. This keeps the weekly scheduled task as the single source of
truth and adds no runtime dependency to the site.

**Page:** new `research.html`, same header/footer/sprite/background as
`index.html`, new nav link (add "Research" to `.site-nav` in *all three*
pages), and a new `research.js` app module. Do **not** bolt it into `app.js` —
that file is 45 KB and already does timeline, rail, search, filters, widgets.

**Structure:**
- Sub-tabs reuse the existing `.scope-toggle` role="tablist" pattern from
  [index.html:261](index.html) so it looks native to the site. Groups:
  `Geography` · `Time & season` · `Geometry & pattern` · `Hypotheses` ·
  `Dataset health`. Each maps to a subset of the 10 existing analyses.
- Below the tabs, a **scroll feed** of research cards. One card = one finding:
  headline stat, the chart, a 2–4 sentence plain-language reading, and a
  "what changed since last week" delta line (the snapshots make this free).
  Reuse `.story-card` visual language so it feels like one site.
- Cards fade/rise in on scroll via `IntersectionObserver` — `app.js` already
  uses one for the hero sentinel, so follow that pattern.

**Charts:** hand-rolled inline SVG, no chart library (the site currently loads
zero JS dependencies — keep it that way). Needed types are few: scatter with
cluster hulls, line/area over time, grouped bars, a radial/season plot, and a
horizontal confidence bar for hypotheses. All colors from CSS variables so the
charts re-theme with the site; `--accent` → `--signal` for a sequential ramp,
with a categorical set derived from the same two hues. Draw paths with
`stroke-linecap:round` and animate `stroke-dashoffset` on reveal for the
"smooth" feel. Respect `prefers-reduced-motion`.

**Cost:** this is the largest item by a wide margin — realistically 3–4
sessions (exporter, page scaffold + tabs, chart primitives, card content and
copy). Worth splitting into its own branch.

---

## Phase 3 — Motion

### 7. Crop circle construction animation

An inline-SVG animation that: starts as one basic geometric shape (circle or
triangle) → progressively adds construction lines, radii, and satellite
circles until a recognizable crop-circle glyph is assembled → then rotates and
tilts into a 3D reading, like a 2D→3D projection of a mathematical object,
continuing to rotate in an analytical/"sciencey" way.

Plan:
- **Build it standalone first** at `dashboard/labs/formation-anim.html` so it
  can be iterated on without touching the live page. Only integrate once it
  looks right.
- Construction phase: pre-compute the glyph as an ordered list of primitives
  (the `#icon-ring-logo` symbol in `index.html:53` is already exactly this
  shape — 1 outer ring, 6 satellites on a hex, 6 outer dots, center dot —
  use it as the target). Animate each primitive in by
  `stroke-dasharray`/`stroke-dashoffset` on a stagger. Pure CSS/SMIL-free JS
  with `requestAnimationFrame`.
- 3D phase: project the 2D points through a rotation matrix in JS and rewrite
  the SVG path `d` per frame — genuine 3D projection, cheaper and sharper than
  WebGL for ~40 primitives, and no dependency. Add a faint wireframe
  "analysis" layer (axis lines, a bounding lattice, a readout of the rotation
  angle in `--font-mono`) to sell the scientific framing.
- Placement: replace or sit alongside the `.radar-sweep` in the hero
  ([index.html:181](index.html)). Decide after seeing it — two competing
  animations in one hero is a real risk.
- Gate on `prefers-reduced-motion: reduce` → render the finished static glyph.

**Cost:** ~1–2 sessions, mostly iteration on how it looks.

---

## Suggested order

1. Phase 0 (#1, #2) — fast, visible, self-contained.
2. #5a Reddit links — cheap.
3. #3 + #4 — one pass, since both touch `renderNews()` and the scan prompt.
4. #5b Bluesky live search.
5. #6 Research tab — own branch.
6. #7 Animation — last; purely additive.

## Cross-cutting notes

- Every schema change to `data.js` must be reflected in **both** its header
  comment and `dashboard_scan_prompt.md`, or the daily scan silently stops
  filling the new fields.
- New pages must be added to the `.site-nav` block in `index.html`,
  `about.html`, and the new `research.html`.
- No build step and no third-party JS — preserve that. It is why this site has
  survived a year of daily automated commits without breaking.
