# Dashboard To-Do — implementation plan

Ten items. Ordered by dependency and payoff. File/line references are against
the state of the repo on 2026-07-27 unless noted.

**Status as of 2026-08-01:**

| # | Item | Status |
|---|------|--------|
| 1 | Footer cleanup | **done** |
| 2 | Crop Circle Watch sign-off block | **done** |
| 3 | Recent Coverage — more words | **done** |
| 4 | Recent Coverage — videos/docs/community | **done** (needs scan to populate) |
| 5a | Reddit forum links | **done** (URLs still unverified — see follow-ups) |
| 5b | Live social posts | **done for Bluesky**; Reddit half still open |
| 6 | Research tab | **done** — 5 sub-tabs, 13 cards, 11 charts |
| 7 | Formation animation | **superseded by 8/9** — all studies now live in `labs/index.html` |
| 8 | Animation v1 rework — simultaneous draw, solids, pattern-finding | **done** — 4/4 incidences verified |
| 9 | Animation for other formation types (lattice → sphere shell) | **done** — lattice study built; 3/3 incidences verified |
| 11 | Shared animation engine + one comparison page | **done** — `labs/anim-engine.js` + `labs/studies.js` + `labs/index.html` |
| 10 | Split Recent Coverage and Discussion Forums into their own boxes | **done** — 2x2 grid, four peer widgets |

### Open follow-ups

- **Verify the four Reddit URLs.** Still open, and now known to be
  **unverifiable from an agent environment** — retried 2026-07-31 and all four
  routes fail: `about.json` 403s, `old.reddit.com` bounces to a login wall that
  answers identically for a fake subreddit name (so it proves nothing), the
  agent browser blocks the domain by policy, and the search tool cannot crawl
  reddit.com. Do it in an ordinary logged-in browser, or fold it into the #5b
  work below — the Reddit OAuth client-credentials token that feed needs also
  lifts the 403 on `about.json`, which makes this a scripted check instead of a
  manual one. Details in the comment above `REDDIT_FORUMS` in `data.js`.
- ~~**Populate `COVERAGE`.**~~ **Done 2026-08-01.** Eight verified items (news,
  podcast, event, Croppie commentary) covering Apr–Jul 2026, newest first. Every
  URL was opened and returns 200 before being written. The widget also no longer
  falls back to `STORIES`: `coverageItems()` used to build its list from every
  formation entry with `COVERAGE` appended, so "Recent coverage" was the
  formation feed a second time — the same titles and videos already shown in
  Field footage directly above it. It is `COVERAGE`-only now, and renders its
  empty state rather than padding with the feed. `dashboard_scan_prompt.md`
  Step 2c still governs how the daily scan adds to it.
- ~~**#5b build-time social feed.**~~ **Done for Bluesky.** `fetch_social.py`
  runs as a non-fatal step in `scan_dashboard.sh` before `claude -p`, writes
  `social.js` (`window.SOCIAL_FEED`), and the scan prompt now stages it
  alongside `data.js`. `renderSocialPosts()` appends the feed behind the
  hand-checked per-story posts and tags every feed card **unverified**. X stays
  a link-out as decided.

  Two things worth knowing before touching it:
  - **Use `api.bsky.app`, not `public.api.bsky.app`.** The latter serves a
    styled 403 HTML page for the `searchPosts` route specifically while other
    routes on the same host work fine, so a host-level health check passes and
    the query still fails.
  - **The raw search is mostly noise.** `sort=latest` on `"crop circle"` is
    dominated by two word-list memes that put the phrase in a list of unrelated
    terms. `sort=top` plus the corroboration gate, the word-list shape check,
    and a 2-per-author cap in `fetch_social.py` are what make the output worth
    showing — the first unfiltered run put six of eight slots on one account.

  **Reddit is still not done.** It needs the OAuth client-credentials flow
  (unauthenticated Reddit 403s everything from a script), which is the same
  credential the URL-verification follow-up above wants. Do them together.
- **Bad archive record: "Silbury Hill Cube".** `analytics/data/all_formations.csv`
  carries `Silbury Hill Cube, 2009-07-05, 3d_cube_hexagonal, complexity 9`.
  Checked while building the v1 animation: Temporary Temples lists exactly one
  Silbury Hill formation on 5 July 2009 — the Mayan Headdress — and no source
  found describes a hexagonal-cube formation at that site. The CSV also holds a
  *separate* row for that same date ("Quetzalcoatl Headdress"), so this looks
  like a duplicated date on fabricated seed data. It should be corrected or
  dropped; it currently inflates the `3d_cube_hexagonal` and sacred-geometry
  counts on the Research page. `labs/formation-anim.html` was built without the
  attribution as a result.
- **Placement decision for the two animations.** Both labs are standalone and
  neither is linked from the site. ANIMATION.md §6 recommends option C — open
  the Research page's "Geometry & pattern" tab with the cube piece and link the
  lab as the full-screen version. Still undecided for the Julia set.
- ~~**Scatter plot overplotting.**~~ **Done.** `scatterGeo()` is now two panels:
  the world plot for international context, plus a data-derived detail inset
  (densest one-degree cell, tightened onto its contents — currently 51.0–51.9°N,
  2.1–1.0°W at ×126 scale) with a dashed callout box and leaders on the world
  panel. The inset re-projects with a cos(latitude) longitude scale so the
  cluster is not stretched sideways.

  **The investigation turned up the real cause, and it is a data problem.** Zoom
  alone does not fix it: the 146 formations in that cell sit on only **87
  distinct coordinates** — 16 records share 51.4290,-1.8550, 13 share
  51.3500,-1.9500, and so on. Those are village- or site-level fixes recorded as
  if they were field-level ones, and no magnification separates identical
  numbers. The inset therefore groups by coordinate and sizes each symbol by
  count (area-proportional, with a size key), and both the caption and the card
  text now state the distinct-coordinate figure outright. Worth a pass over the
  archive to re-fix the worst offenders against a real source.

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

## Phase 4 — Motion, second pass (added 2026-08-01)

### 8. Rework animation v1: simultaneous construction, solids, pattern-finding

Feedback on `labs/formation-anim.html`: the hexagonal cube is a good start, but
the sequential compass construction is the wrong feel. Four changes, in order:

- **Draw everything at once.** Kill the per-primitive stagger — all seven
  circles and all twelve lines begin drawing on the same frame and complete
  together. This is a small change mechanically (every primitive's `[pIn,pOut]`
  window collapses to the same window) but it changes the piece from "watch a
  construction being taught" to "watch a figure resolve out of nothing." Keep
  the draw-on itself; it is only the staggering that goes. Acts I–III as
  currently written stop existing as separate beats, so the act boundaries and
  the phase captions need re-cutting around the new shape.
- **Circles become spheres.** Each of the seven construction circles becomes a
  sphere once the figure lifts. Cheapest honest read at this scale: a great
  circle plus two foreshortened ellipses whose axes track the rotation, rather
  than shading — it stays a wireframe piece and matches the site's line-art
  register. A radial gradient behind each is optional and probably too much.
- **Some lines become planes or solids.** Extrapolate rather than decorate: the
  three pairs of parallel hexagon edges each bound a rhombus that is already a
  cube face in projection, so those promote to filled faces for free. The three
  spokes meeting at each centre vertex bound the two "cups" that read as the
  Necker ambiguity. Rule to hold to — **only promote a shape the geometry
  already implies.** If it needs a new vertex invented to close it, it does not
  belong.
- **Then rotate and flip it**, as now, but with the solids present. The flip
  (mirroring through the centre) is a real operation here: it is the Necker
  ambiguity made literal, and it should be a distinct beat from the spin.
- **Find the pattern and draw it.** The genuinely new ask, and the hard part.
  Look for real incidences in the resolved figure and stroke them in as a final
  analysis layer: the 8 sphere centres and 7 projected points are already
  known; candidates are collinear triples, concurrent lines, equal-length
  chords, and the two inscribed tetrahedra (already built). Compute these
  numerically at build time and only draw what actually holds to tolerance —
  the same discipline as the rest of the site. A pattern layer that draws
  suggestive lines which are not really there would undercut the whole project.

The current `render(p)` is already a pure function of `p` with everything
recomputed per frame, so none of this needs an architecture change — but the
act table in [ANIMATION.md](ANIMATION.md) §3 will need rewriting, since it
describes exactly the sequential construction being removed.

**Cost:** ~1–2 sessions. The pattern-finding pass is most of it, and is worth
prototyping on its own before touching the existing acts.

### 9. Animations for other formation types

The hexagonal cube works because the formation is genuinely a projection of a
solid. Extend the same treatment to other archive formations built from lines
and circles, one lab page each, reusing the shell from
`labs/formation-anim.html`.

First target — **Odstone Barn, 16 July 2026** (`2026-07-16-odstone-barn` in
`data.js`; nr Wayland's Smithy, Oxfordshire, ~70 m, aerials by Nick Bull). The
design is a square lattice / grid block sitting inside a ring. Sequence:

1. The flat lattice and its ring, drawn as now.
2. The lattice extrudes into a **3D cube lattice** — a grid of cells rather
   than a single cube, so this needs a different primitive set from item 8.
3. The ring opens out of the plane into a **half sphere shell** around the
   lattice — a bowl, cut so the lattice inside stays visible.
4. The shell closes into a **full sphere** enclosing the lattice, which is the
   final held figure.

Steps 3 and 4 are the interesting problem: a wireframe sphere that reads as
enclosing rather than as a flat circle needs latitude/longitude lines with
correct hidden-line treatment, and the existing convex hidden-edge test in
`formation-anim.html` does not generalise to a sphere plus contents. Prototype
the shell alone first.

Candidates after that, all with an honest 3D or structural reading — check each
against the archive before committing: Windmill Hill 2011 (`hexagonal_web`),
Six-Mile Bottom 2007 (`star_hexagram`), Wiltshire 2023 (`metatrons_cube`,
dense but the richest), Oliver's Castle 1997 (`snowflake_hexagonal`).

**Before naming any of them on screen, verify the record** — see the "Silbury
Hill Cube" entry under Open follow-ups for why that is not a formality.

**Cost:** ~1 session per formation once the shell primitive exists.

---

## Phase 5 — Layout

### 10. Recent Coverage and Discussion Forums get their own boxes

Both are currently nested inside other widgets rather than standing on their
own, which is why neither reads as a real section:

- **Recent coverage** is a `.widget-news-nested` *inside* the Field footage
  widget ([index.html:232](index.html)), sharing its box.
- **Discussion forums** is an `h3` inside a `.reddit-block` at the bottom of
  the Live chatter widget ([index.html:257](index.html)), below the keyword
  search — the least prominent position on the page.

Plan:
- Promote both to top-level `.widget` sections in `.widget-grid`, each with its
  own `h2` and sprite icon, matching Field footage and Live chatter. Recent
  coverage keeps `#icon-doc`; Discussion forums should get its own rather than
  reusing `#icon-rss`, which now belongs to Live chatter.
- **Recent coverage box a bit shorter, Discussion forums a bit larger.** With
  four boxes the grid needs re-balancing rather than just a height tweak —
  decide the new `.widget-grid` template first, then size within it. Recent
  coverage can afford to lose a row (it renders `stories.slice(0,6)` with the
  top items as `.news-item--lead`); Discussion forums has room to grow because
  the four links currently render as a compact row and could carry the `note`
  field per forum on its own line.
- Check the sub-720px stacking: four boxes stack to a long column on a phone,
  so the order matters more than it did with two.

**Cost:** under a session, but it touches `.widget-grid`, so screenshot both
breakpoints before and after.

### 11. Widget column re-layout — done 2026-08-01

Follow-up to #10, which left the grid unbalanced. The 2×2 grid was replaced
with two flex columns wrapped in `.widget-col` elements. A grid row forces both
its boxes to start at the same y, so the shorter of each pair left a hole
underneath it: 150px under Field footage and 390px under Discussion forums,
1673px of block for 1439px of content. Flex columns stack each box directly
under the one above; the block is now 1559px with no internal gaps.

Also in this pass: `.widget h2` went from 11.5px to 16px with a rule and a
bright accent icon (at caption size the four boxes read as one undivided field
of content), and `.news-meta` was split into per-part spans so `.news-date`
could take the site's amber `--signal` — in a uniformly grey meta line the date
was the hardest part to pick out and the part you scan for.

**Watch out for:** the phone media query has to flip `align-items` back to
`stretch`. On the desktop row `flex-start` keeps the two columns from matching
heights; on the stacked column it is the cross axis, and it shrink-wraps every
box to its own min-content — which is how the Bluesky iframe got out to 446px
inside a 343px viewport again.

### 12. Research page expansion — done 2026-08-01

Five tabs to seven, 15 cards to 29. New **Evidence** and **Research log** tabs,
plus scale/sites cards on Geography and Geometry and a decade cut on Time.

The structural change is that `export_research_json.py` now reads the daily
research routine's own markdown — `index/formations.md` for the per-formation
Authenticity verdict, `index/image-leads.md` for the licensing split,
`sessions/*.md` for angle and topics — alongside the analytics engine's CSV.
None of that is derivable from the CSV; it is the routine's judgment and
process record, and it is what the two new tabs are built from. See the
Research page section of `README.md` for the full pipeline, the four new chart
primitives, the thin-data thresholds, and the `.r-chart text` specificity trap.

**Still open here:** the exporter only runs by hand. The Research log tab goes
stale as soon as the next morning's session lands, so it wants a hook on the
daily runner, not just the Sunday one.

**Superseded, same day:** Research log and Dataset health were pulled back out
again a few hours later — not meant to be public, per direct request. This
wasn't just hiding the two tabs; `export_research_json.py` no longer reads
`index/image-leads.md` or `sessions/*.md` at all, and `research.js` carries no
`programme` or `health` key, so the "still open" note above about a daily-run
hook is moot — there's nothing left to keep fresh. Five tabs, 22 cards. The
page also picked up a "Research Vectors" heading and switched the tab strip
from pills to plain pipe-separated text this same session, and every
description block on the Research, Resources, and Dashboard pages had its
`ch`-based `max-width` removed — those were capping paragraphs at roughly half
their container's width on a normal desktop screen.

---

## Suggested order

1. ~~Phase 0 (#1, #2)~~ — done.
2. ~~#5a Reddit links~~ — done (URLs still need verifying).
3. ~~#3 + #4~~ — done.
4. ~~#5b Bluesky~~ — done; Reddit half still open.
5. ~~#6 Research tab~~ — done.
6. ~~#7 Animation~~ — both concepts built, neither placed.

7. ~~#10 layout split~~ — done 2026-08-01.
8. ~~#11 widget column re-layout + #12 research expansion~~ — done 2026-08-01.

Remaining, in order:

8. **#8 animation v1 rework** — supersedes the current acts, so do it before
   deciding where the animation lives on the site.
9. **#9 other formations** — depends on the sphere-shell primitive, which is
   new work; start with Odstone Barn.
10. Placement for all animations (see Open follow-ups) — decide once #8 is
    settled, since the reworked piece is what actually ships.

## Cross-cutting notes

- Every schema change to `data.js` must be reflected in **both** its header
  comment and `dashboard_scan_prompt.md`, or the daily scan silently stops
  filling the new fields.
- New pages must be added to the `.site-nav` block in **every** page that has
  one — currently `index.html`, `about.html`, `research.html`, and
  `resources.html`. The nav is duplicated markup, not a partial, so a new tab is
  four edits and it is easy to miss one.
- Flex and grid items default to `min-width:auto`, which means a track cannot
  shrink below its widest child's min-content. `.widget-col` and
  `.widget-col > .widget` both set `min-width:0` for exactly this reason —
  without it the Bluesky embed iframe pushes the phone layout wider than the
  viewport. Keep that in mind before adding embeds to any other flex track.
- No build step and no third-party JS — preserve that. It is why this site has
  survived a year of daily automated commits without breaking.
