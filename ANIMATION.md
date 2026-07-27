# The formation animation — design brief

Brainstorm for TODO item #7. Nothing built yet. The goal is the sequence
originally described: start from one basic shape → dynamically add lines and
circles until it becomes a real crop circle → rotate it into 3D like a
mathematical object under analysis. Plus two additions: sacred-geometry
construction, and scroll-driven reveal.

---

## 1. The formation: Silbury Hill Cube, 5 July 2009

**Recommendation.** `analytics/data/all_formations.csv` has one record that is
almost purpose-built for this:

| Field | Value |
|---|---|
| name | Silbury Hill Cube |
| date | 2009-07-05 |
| location | Nr Silbury Hill, Wiltshire, UK |
| geometric_type | `3d_cube_hexagonal` |
| complexity | 9 / 10 |
| diameter | 60 m |
| sacred geometry / phi | true / true |
| near ancient site | Silbury Hill |
| researcher_notes | *"Precise 3D hexagonal cube (Necker cube); impossible to create with boards without optical reference"* |

Why this one and not a prettier one:

1. **The 2D→3D reveal is what the formation actually is.** This is the whole
   argument. On most formations, rotating into 3D would be a decorative trick
   we impose. Here the flat pattern *is* an orthographic projection of a cube —
   the archive itself calls it a Necker cube. The animation reveals the
   geometry rather than decorating it, which is the difference between a
   sciencey-looking effect and a genuinely scientific one.
2. **It builds from a single circle with nothing but compass work.** Hexagonal
   geometry is the one case where the classical sacred-geometry construction
   (vesica piscis → seed of life → hexagon) lands exactly on the target shape,
   with no fudging. Every step is a real construction step.
3. **It resolves into the site's own logo.** `#icon-ring-logo` is already six
   satellite circles on a hexagon around a centre — i.e. a seed-of-life
   figure. The animation can construct the brand mark and then lift it into 3D.
4. **Silbury Hill.** Largest prehistoric mound in Europe; ties the piece to the
   "near ancient site" finding that is the strongest geographic signal on the
   Research page.
5. **60 m and one circle** — a compact, legible figure, not a 409-circle
   fractal that turns to mush at 400px.

**Verify before building.** That CSV row is seed data with no `sourceUrl`. Its
claims (date, diameter, the Necker-cube reading) should be checked against
Crop Circle Connector / Temporary Temples before the site presents the
formation by name. The *geometry* below is independently true regardless; only
the attribution needs confirming.

### Runners-up

| Formation | Why it lost |
|---|---|
| **Silbury 2019** — star tetrahedron (merkaba) | Excellent 3D reading and same site. Keep as the **Act V** payoff: a cube contains two interpenetrating tetrahedra, so this is a natural continuation rather than a rival. |
| **Wiltshire 2023** — Metatron's Cube ("contains all Platonic solids") | The richest sacred-geometry object here, but 13 circles + 78 chords is visually dense at small sizes. Better as a still illustration. |
| **Stonehenge Julia Set 1996** — 151 circles, fractal | Best *story* in the archive (appeared in under 45 min in daylight). Builds beautifully as a progressive spiral — but there is no honest 3D reading, so it fails the brief's second half. Strong candidate for a *different*, spiral-based animation later. |
| **Milk Hill 2001** — 409 circles, complexity 10 | The most spectacular formation in the archive and the most tempting. 409 circles is too much geometry to animate legibly, and again no 3D reading. |

---

## 2. The geometric spine (verified, not asserted)

The whole piece hangs on one fact, which was computed rather than assumed:

> Take a cube with vertices (±1,±1,±1) and view it orthographically down its
> space diagonal [1,1,1]. Its **8 vertices project to only 7 points**: six land
> on a perfect regular hexagon — equal radii, exactly 60.000° apart — and
> **two land coincident at the centre**.

Verified numerically:

```
[-1 -1 -1] -> ( 0.0000,  0.0000)   r = 0.0000   ← coincident
[ 1  1  1] -> ( 0.0000,  0.0000)   r = 0.0000   ← coincident
[-1 -1  1] -> ( 0.0000, -1.6330)   r = 1.6330
[-1  1 -1] -> (-1.4142,  0.8165)   r = 1.6330
[-1  1  1] -> (-1.4142, -0.8165)   r = 1.6330
[ 1 -1 -1] -> ( 1.4142,  0.8165)   r = 1.6330
[ 1 -1  1] -> ( 1.4142, -0.8165)   r = 1.6330
[ 1  1 -1] -> ( 0.0000,  1.6330)   r = 1.6330

ring angles: 30° 90° 150° 210° 270° 330°   spacing: 60° × 6
angle(space diagonal, face) = 35.264°  (= arctan 1/√2)
```

**This gives the animation its single best moment.** As the object rotates off
the space diagonal, the centre point *splits into two vertices*. A viewer who
has spent five seconds reading a flat hexagram suddenly watches a hidden eighth
vertex separate out of the middle. That is the "2D→3D projection of a
mathematical object" beat, and it is real — not an effect.

Call it out in type at the moment it happens: `VERTICES 7 → 8`.

---

## 3. Scroll choreography — five acts

Scroll position drives a single progress value `p ∈ [0,1]` across a pinned
section. Everything is a pure function of `p` — no timers, no autoplay — so
scrubbing backwards rewinds the construction exactly. Each primitive owns a
window `[pIn, pOut]` and draws itself on via `stroke-dashoffset`.

| Act | `p` | What happens | Type layer |
|---|---|---|---|
| **I · Genesis** | 0.00–0.15 | One circle, radius r. Then a second centred on its rim → **vesica piscis**, the almond intersection highlighted. | `CIRCLE · r = 1.000` → `VESICA PISCIS` |
| **II · Seed of Life** | 0.15–0.35 | Six circles stepped around the rim, each centred on the previous intersection. Classical compass construction, no measurement. Faint construction arcs stay visible. | `SEED OF LIFE · 7 CIRCLES` · running count `3/7 … 7/7` |
| **III · The formation** | 0.35–0.55 | Connect the six intersections → **hexagon**. Add three internal radii at 0/120/240°. Construction arcs fade back; the crop-circle lay appears (flattened wheat texture, standing centres). The real formation is now on screen. | `HEXAGON · INTERIOR 120.0°` → `SILBURY HILL · 05 JUL 2009 · 60 m` |
| **IV · The lift** | 0.55–0.80 | The figure holds still and the *reading* flips — Necker ambiguity, shading resolving one interpretation, then the other. Then it lifts: the flat hexagon is revealed as a cube seen down [1,1,1], and the centre splits. | `PROJECTION ⟂ [1,1,1]` → **`VERTICES 7 → 8`** → `θ 35.264°` |
| **V · Analysis** | 0.80–1.00 | Free rotation on a slow axis. Wireframe with hidden edges dashed, bounding lattice, live angle readout. Optional final beat: the cube's two inscribed tetrahedra separate out into the **star tetrahedron** — which is the real Silbury 2019 formation, so the animation ends by naming a second genuine record. | live `θ`, `φ` readouts · `INSCRIBED TETRAHEDRA 2` |

Rewind behaviour is the reason to do this scroll-scrubbed rather than
autoplayed: scrolling back up genuinely *deconstructs* the formation back to
one circle. That is a much better interaction than a replay button.

---

## 4. The type layer

"Dynamic type" is what sells the analytical framing, and the site already has
the right typeface for it — **Fragment Mono**, used for all UI chrome.

- Labels sit in a fixed column beside the figure, not floating over it.
- Each enters with a short typewriter reveal (character-stepped, ~28ms/char),
  and *stays* — by Act V the column reads as an accumulated analysis log.
- Live numeric readouts (`θ 35.264°`) use `font-variant-numeric: tabular-nums`
  so digits don't jitter as they update.
- Leader lines from a label to the vertex/edge it describes, drawn in
  `--chart-grid`, appearing only while that label is the newest.
- Keep every string factual. `θ 35.264°` is a real angle; inventing
  `RESONANCE 4.7 Hz` would undercut everything the Research page just argued.

---

## 5. Technical approach

Same constraints as the rest of the site: **inline SVG, no library, no build
step.**

- **One `<svg>`**, layered: construction arcs / formation lay / wireframe /
  annotation.
- **Scroll driver.** A tall (~300vh) section with a `position: sticky` inner
  stage. `p` = how far the section's top has passed the viewport top, clamped
  to [0,1]. Read it in a `scroll` listener that only sets a variable, and do
  the actual work in `requestAnimationFrame` — never layout inside the
  listener.
- **2D acts** are precomputed once: an ordered list of primitives
  (`{type, cx, cy, r, pIn, pOut}`), each drawn with `stroke-dasharray` +
  `stroke-dashoffset` interpolated across its window.
- **3D acts** project 8 vertices and 12 edges through a rotation matrix in JS
  and rewrite path `d` per frame. Forty-odd primitives — trivially cheap, far
  cheaper and sharper than WebGL, and no dependency.
- **Colour** comes from existing tokens: `--accent` for the construction
  geometry, `--signal` for the analysis chrome, `--text-2` for the recessive
  lattice. No new palette. (Note the chart `--cat-*` tokens are *not*
  appropriate here — they are tuned for filled marks on `--panel`, not thin
  strokes on `--bg-0`.)
- **`prefers-reduced-motion: reduce`** → render the completed Act V wireframe
  as a static figure with all labels shown. No scroll-scrubbing, no rotation.
- **Touch/mobile** — scroll-scrubbing a pinned section is fine on mobile, but
  the type column has to move below the figure, and Act IV's Necker flip needs
  to be slower than the desktop timing to survive fast flick-scrolling.

**Build it standalone first** at `dashboard/labs/formation-anim.html` — a
single page, no site chrome, with a debug slider that scrubs `p` directly.
Getting Act IV to feel right will take iteration, and iterating inside the live
page would be miserable.

---

## 6. Placement — needs a decision

The site already animates a fair amount: the hero radar sweep, thirteen
breathing background watermarks, the reveal transitions on the Research cards.
A 300vh scroll-pinned piece is a big new element and should not simply be
added on top.

| Option | Case for | Case against |
|---|---|---|
| **A. Replace the hero radar** | Strongest first impression; the radar is the weaker idea. Immediately says "this is a geometry project." | The hero currently scrolls straight into the timeline; a 300vh pinned section pushes the actual content 3 screens down. Bad for a daily-log site people revisit for new entries. |
| **B. Its own section between hero and timeline** | Keeps the hero's fast path to content; the animation becomes an optional deep-dive people scroll into. | Still delays the timeline. Needs a skip affordance. |
| **C. Open the Research page's "Geometry & pattern" tab** *(recommended)* | That tab is *about* formation geometry, so it earns its place. The audience there is already in analysis mode. No cost to the daily-log path at all. Sits directly above the complexity distribution, which it sets up perfectly. | Fewer people will see it than in the hero. |
| **D. Its own page** (`geometry.html`) | Maximum room; could become a proper explainer. | A fourth nav item for one animation; more surface to maintain. |

**Recommendation: C**, with the standalone lab page kept permanently as the
"full screen" version and linked from the card. It's the placement where the
piece is content rather than decoration, and it costs the dashboard nothing.

---

## 7. Risks

- **Act IV is the whole piece.** If the 7→8 vertex split doesn't read clearly,
  nothing else matters. Prototype that single beat *first*, before any of the
  compass construction — if it isn't compelling in isolation, rethink the
  concept rather than building four acts up to a weak payoff.
- **Necker ambiguity may not survive shading.** The flip needs the figure to be
  genuinely ambiguous, which means very restrained shading. Easy to
  over-render and kill the effect.
- **Scroll-jacking perception.** Pinned scroll sections annoy people when they
  feel like they're fighting the page. Mitigations: keep total pin under ~300vh,
  never block scroll, and make the section fully skippable.
- **Attribution risk.** Do not put "Silbury Hill, 5 July 2009" on screen until
  that record is verified against a real source (see §1).
