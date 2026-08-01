/* ==========================================================================
   studies.js — the formation studies themselves.

   Each study supplies geometry, a build(ctx), and a render(ctx, p). Everything
   else — stage, HUD, controls, log, driver — comes from anim-engine.js.

   Two rules hold across all of them:

   1. **The design does not move.** Nothing translates, contracts or rescales
      away from where the formation puts it. An earlier version of the
      hexagonal cube shrank its seven circles down into small beads at the
      cube's corners, and in doing so threw away the seed-of-life proportion
      that IS the formation. Circles become spheres in place, at their own
      radius, on their own centres. Depth is added; position is not taken away.

   2. **Every pattern claim is computed and asserted before it is drawn.**
      A layer that strokes suggestive-but-false lines would undercut the whole
      project. Each study exposes its residuals; anything failing tolerance is
      silently omitted rather than fudged.
   ========================================================================== */

window.STUDIES = (function () {
  'use strict';

  var A = window.ANIM;
  var mk = A.mk, DEG = A.DEG, dot = A.dot, rotator = A.rotator;
  var clamp01 = A.clamp01, lerp = A.lerp, win = A.win;
  var easeInOut = A.easeInOut, easeOut = A.easeOut;
  var TOL = 1e-9;

  /* ======================================================================
     STUDY 1 — the hexagonal cube
     ====================================================================== */

  var hexcube = (function () {
    var S2 = Math.SQRT2, S3 = Math.sqrt(3), S6 = Math.sqrt(6);
    var U = [1 / S2, -1 / S2, 0];
    var V = [1 / S6, 1 / S6, -2 / S6];
    var Nv = [1 / S3, 1 / S3, 1 / S3];

    var R = 4 / S6;                    // 1.63299 — ring radius AND circle radius
    var TILT_MAX = Math.atan(1 / S2);  // 35.264389 degrees

    var CUBE = [], Q = [];
    for (var i = 0; i < 8; i++) {
      var p3 = [(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1];
      CUBE.push(p3);
      Q.push({ x: dot(p3, U), y: dot(p3, V), z: dot(p3, Nv) });
    }
    var CA = 7, CB = 0;                // the two vertices that coincide

    var AXES = [[1, 0, 0], [0, 0, 1]].map(function (e) {
      return { x: dot(e, U), y: dot(e, V), z: dot(e, Nv) };
    });

    var EDGES = [];
    [1, 2, 4].forEach(function (bit) {
      for (var a = 0; a < 8; a++) {
        var b = a ^ bit;
        if (a < b) EDGES.push({ a: a, b: b });
      }
    });

    var FACES = [];
    [0, 1, 2].forEach(function (ax) {
      var b = (ax + 1) % 3, c = (ax + 2) % 3;
      [-1, 1].forEach(function (sg) {
        var idx = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (o) {
          var k = 0;
          if ((ax === 0 ? sg : (b === 0 ? o[0] : o[1])) > 0) k |= 1;
          if ((ax === 1 ? sg : (b === 1 ? o[0] : o[1])) > 0) k |= 2;
          if ((ax === 2 ? sg : (b === 2 ? o[0] : o[1])) > 0) k |= 4;
          return k;
        });
        var nrm = [0, 0, 0]; nrm[ax] = sg;
        FACES.push({ v: idx, n: { x: dot(nrm, U), y: dot(nrm, V), z: dot(nrm, Nv) } });
      });
    });

    function popcount(k) { return (k & 1) + ((k >> 1) & 1) + ((k >> 2) & 1); }
    var TETRA = [[], []];
    for (i = 0; i < 8; i++) TETRA[popcount(i) & 1].push(i);

    // The six hexagon points: simultaneously the ring vertices of the
    // projected cube and the centres of the six satellite circles.
    var HEX = [];
    for (i = 0; i < 6; i++) {
      var th = (30 + 60 * i) / DEG;
      HEX.push({ x: R * Math.cos(th), y: R * Math.sin(th) });
    }

    // ---- pattern: computed, asserted, and only then drawn
    var PATTERN = (function () {
      var out = { tol: TOL, claims: [], lines: [] };
      function claim(name, detail, residual) {
        var ok = residual <= TOL;
        out.claims.push({ name: name, detail: detail, residual: residual, ok: ok });
        return ok;
      }

      var worstCross = 0;
      for (var k = 0; k < 3; k++) {
        var a = HEX[k], b = HEX[k + 3];
        worstCross = Math.max(worstCross, Math.abs(a.x * b.y - a.y * b.x));
      }
      if (claim('collinear', '3 triples through the centre', worstCross) &&
          claim('concurrent', '3 long diagonals meet at 1 point', worstCross)) {
        for (k = 0; k < 3; k++) out.lines.push({ cls: 'diagonal', a: HEX[k], b: HEX[k + 3] });
      }

      var worstLen = 0;
      for (k = 0; k < 6; k++) {
        var v1 = HEX[k], v2 = HEX[(k + 1) % 6];
        worstLen = Math.max(worstLen, Math.abs(Math.hypot(v2.x - v1.x, v2.y - v1.y) - R));
        worstLen = Math.max(worstLen, Math.abs(Math.hypot(v1.x, v1.y) - R));
      }
      claim('equal-chords', '12 chords of length 4/sqrt(6)', worstLen);

      var worstTri = 0, tris = [];
      TETRA.forEach(function (set) {
        var ring = set.filter(function (vi) { return vi !== CA && vi !== CB; })
                      .map(function (vi) { return { x: Q[vi].x, y: Q[vi].y }; });
        if (ring.length !== 3) { worstTri = Infinity; return; }
        var d = [0, 1, 2].map(function (j) {
          var m = ring[j], n2 = ring[(j + 1) % 3];
          return Math.hypot(n2.x - m.x, n2.y - m.y);
        });
        worstTri = Math.max(worstTri, Math.abs(d[0] - d[1]), Math.abs(d[1] - d[2]));
        tris.push(ring);
      });
      if (claim('hexagram', '2 equilateral triangles = 2 inscribed tetrahedra', worstTri)) {
        tris.forEach(function (ring, ti) {
          for (var j = 0; j < 3; j++) {
            out.lines.push({ cls: ti === 0 ? 'triA' : 'triB', a: ring[j], b: ring[(j + 1) % 3] });
          }
        });
      }

      out.passed = out.claims.filter(function (c) { return c.ok; }).length;
      out.total = out.claims.length;
      return out;
    })();

    // The frame holds the SEED OF LIFE at full size — the satellites reach
    // 2R from the centre — and never zooms. The cube then occupies the middle
    // half of the figure, which is exactly the proportion the design has.
    var FRAME = 2 * R + 0.15;
    var HALF = 300;

    var A_RESOLVE = 0.16, A_SOLIDS = 0.34, A_LIFT = 0.52,
        A_FLIP = 0.68, A_ROTATE = 0.84;

    return {
      id: 'hexcube',
      title: 'The hexagonal cube',
      aria: 'Seven circles and twelve lines resolve at once, become eight spheres and six faces on a cube seen down its space diagonal, tilt and flip, then resolve into a pattern of computed incidences.',
      lede: 'Seven circles and twelve lines, drawn all at once. The circles are spheres seen flat on, the rhombi are faces, and the whole figure is a cube viewed straight down its own long diagonal — with two of its eight corners hidden behind each other in the middle.',
      duration: 17000,
      staticP: 0.99,
      layers: ['lay', 'construct', 'faces', 'edges', 'pattern', 'verts'],
      hud: {
        tl: [['SPHERES', 'spheres', '0 / 8'], ['VERTICES', 'verts', '—']],
        tr: [['TILT θ', 'theta', '0.000°'], ['SPIN φ', 'phi', '0.000°']],
        bl: [['FACES', 'faces', '0 / 6'], ['EDGES', 'edges', '0 / 12']],
        br: [['PROJECTION', 'proj', '⊥ [1,1,1]'], ['INCIDENCES', 'pattern', '—']]
      },
      log: [
        { p: 0.05, t: '7 CIRCLES &middot; 12 LINES &middot; AT ONCE' },
        { p: 0.13, t: 'r = 1.63299 &middot; INTERIOR 120.000&deg;' },
        { p: 0.24, t: 'CIRCLES &rarr; <b>8 SPHERES, IN PLACE</b>' },
        { p: 0.31, t: 'RHOMBI &rarr; 6 FACES' },
        { p: 0.42, t: 'VERTICES 7 &rarr; 8', key: true },
        { p: 0.51, t: '&theta; 35.264&deg; = arctan(1/&radic;2)' },
        { p: 0.60, t: 'FLIP &middot; NECKER READING REVERSES' },
        { p: 0.76, t: 'FREE ROTATION &middot; HIDDEN EDGES DASHED' },
        { p: 0.88, t: 'CONCURRENT &middot; COLLINEAR &middot; EQUAL' },
        { p: 0.94, t: 'STAR TETRAHEDRON = HEXAGRAM', key: true }
      ],
      notes: [
        '<b>The one fact this rests on.</b> View a cube with vertices at every ' +
        'combination of &plusmn;1 orthographically down its space diagonal [1,1,1]. ' +
        'Its <b>eight vertices project to seven points</b>: six on a perfect regular ' +
        'hexagon, 60.000&deg; apart, and two coincident at the centre. The ring radius ' +
        'is 4/&radic;6 = 1.63299, which is also the compass radius &mdash; which is why ' +
        'a seed-of-life construction lands on the cube\'s corners with nothing fudged.',
        '<b>Not named on screen, deliberately.</b> The archive record this was going ' +
        'to be built around &mdash; &ldquo;Silbury Hill Cube&rdquo;, 5 July 2009 &mdash; ' +
        'does not survive checking: Temporary Temples lists one Silbury Hill formation ' +
        'on that date, the Mayan Headdress. Until a hexagonal-cube formation is confirmed ' +
        'against a primary source, this claims nothing about a particular field.'
      ],

      build: function (ctx) {
        var st = { spheres: [], lay: [], faces: [], edges: [], pattern: [], verts: [] };

        st.spheres = Q.map(function () {
          var g = mk('g', {});
          var sil = mk('circle', {
            r: 0, fill: 'var(--accent)', 'fill-opacity': 0,
            stroke: 'var(--accent)', 'stroke-width': 1.3, 'stroke-opacity': 0,
            'stroke-linecap': 'round'
          });
          g.appendChild(sil);
          var rings = AXES.map(function () {
            var e = mk('ellipse', {
              rx: 0, ry: 0, fill: 'none',
              stroke: 'var(--accent)', 'stroke-width': 0.9, 'stroke-opacity': 0
            });
            g.appendChild(e);
            return e;
          });
          ctx.g.construct.appendChild(g);
          return { sil: sil, rings: rings };
        });

        for (var i = 0; i < 6; i++) {
          var lp = mk('path', {
            fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1,
            'stroke-opacity': 0, 'stroke-linecap': 'round'
          });
          ctx.g.lay.appendChild(lp);
          st.lay.push(lp);
        }

        st.faces = FACES.map(function () {
          var el = mk('polygon', { fill: 'var(--accent)', 'fill-opacity': 0, stroke: 'none' });
          ctx.g.faces.appendChild(el);
          return el;
        });

        st.edges = EDGES.map(function () {
          var el = mk('line', {
            stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0,
            'stroke-linecap': 'round'
          });
          ctx.g.edges.appendChild(el);
          return el;
        });

        var STROKE = { diagonal: 'var(--signal)', triA: 'var(--signal)', triB: 'var(--accent)' };
        st.pattern = PATTERN.lines.map(function (ln) {
          var el = mk('line', {
            stroke: STROKE[ln.cls], 'stroke-width': ln.cls === 'diagonal' ? 1.1 : 1.7,
            'stroke-opacity': 0, 'stroke-linecap': 'round'
          });
          if (ln.cls === 'diagonal') el.setAttribute('stroke-dasharray', '4 5');
          ctx.g.pattern.appendChild(el);
          return el;
        });

        st.glow = mk('circle', { r: 0, fill: 'url(#ccGlow)', opacity: 0 });
        ctx.g.verts.appendChild(st.glow);
        st.verts = Q.map(function () {
          var el = mk('circle', { r: 3.4, fill: 'var(--accent)', opacity: 0 });
          ctx.g.verts.appendChild(el);
          return el;
        });

        return st;
      },

      render: function (ctx, p) {
        var st = ctx.state;
        ctx.K = HALF / FRAME;      // constant: the design is never rescaled

        var theta = 0, phi = 0;
        if (p > A_SOLIDS && p <= A_LIFT) {
          theta = TILT_MAX * easeInOut(win(p, A_SOLIDS, A_LIFT));
        } else if (p > A_LIFT && p <= A_FLIP) {
          theta = TILT_MAX * (1 - 2 * easeInOut(win(p, A_LIFT, A_FLIP)));
        } else if (p > A_FLIP && p <= A_ROTATE) {
          var q5 = win(p, A_FLIP, A_ROTATE);
          phi = easeInOut(q5) * 250 / DEG;
          theta = lerp(-TILT_MAX, TILT_MAX * 0.55, easeInOut(q5));
        } else if (p > A_ROTATE) {
          // Unwind to the canonical view: the incidences are facts about THIS
          // projection, so the pattern act has to be read from it.
          var q6 = easeInOut(win(p, A_ROTATE, A_ROTATE + 0.06));
          phi = lerp(250 / DEG, 2 * Math.PI, q6);
          theta = lerp(TILT_MAX * 0.55, 0, q6);
        }
        var rot = rotator(theta, phi);
        var RQ = Q.map(rot);
        var RN = FACES.map(function (f) { return rot(f.n); });
        var RAX = AXES.map(rot);

        // --- everything draws on together: one shared window, no stagger
        var draw = easeOut(win(p, 0.01, A_RESOLVE));
        var solid = easeInOut(win(p, A_RESOLVE + 0.01, A_SOLIDS));

        // --- the seven circles, in place, at their own radius. They gain
        // great circles and become spheres; they do not move or shrink.
        var shown = 0;
        for (var s = 0; s < 8; s++) {
          var sph = st.spheres[s];
          // Flat, two of the eight sit exactly on top of each other, so the
          // honest on-screen count is 7 circles / 8 spheres.
          var vis = draw * (s === CB ? solid : 1);
          if (vis > 0.02) shown++;
          var c = RQ[s];
          var px = ctx.sx(c.x), py = ctx.sy(c.y), pr = R * ctx.K;
          sph.sil.setAttribute('cx', px.toFixed(2));
          sph.sil.setAttribute('cy', py.toFixed(2));
          sph.sil.setAttribute('r', pr.toFixed(2));
          sph.sil.setAttribute('stroke-opacity', (0.42 * vis).toFixed(3));
          sph.sil.setAttribute('fill-opacity', (0.018 * vis * solid).toFixed(3));
          var circ = 2 * Math.PI * pr;
          sph.sil.setAttribute('stroke-dasharray', circ.toFixed(2));
          sph.sil.setAttribute('stroke-dashoffset', (circ * (1 - draw)).toFixed(2));

          // A great circle with unit normal n projects orthographically to an
          // ellipse: semi-axis r*|n.z| along n's screen direction, r across it.
          // That is what gives a flat disc an inside.
          for (var a2 = 0; a2 < RAX.length; a2++) {
            var nAx = RAX[a2];
            var e = sph.rings[a2];
            e.setAttribute('rx', (pr * Math.abs(nAx.z)).toFixed(2));
            e.setAttribute('ry', pr.toFixed(2));
            e.setAttribute('transform', 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) +
              ') rotate(' + (Math.atan2(-nAx.y, nAx.x) * DEG).toFixed(2) + ')');
            e.setAttribute('stroke-opacity', (0.20 * vis * solid).toFixed(3));
          }
        }

        // --- crop lay, only while flat
        var layOn = win(p, 0.09, A_RESOLVE) * (1 - win(p, A_RESOLVE + 0.03, A_SOLIDS));
        for (var kL = 0; kL < 6; kL++) {
          var v1 = HEX[kL], v2 = HEX[(kL + 1) % 6], dd = '';
          if (kL % 2) {
            for (var j = 1; j <= 7; j++) {
              var f = j / 7.6;
              dd += 'M' + ctx.sx(v1.x * f).toFixed(2) + ' ' + ctx.sy(v1.y * f).toFixed(2) +
                    'L' + ctx.sx(v2.x * f).toFixed(2) + ' ' + ctx.sy(v2.y * f).toFixed(2);
            }
          } else {
            for (j = 1; j <= 8; j++) {
              var g2 = j / 9;
              var ex = lerp(v1.x, v2.x, g2), ey = lerp(v1.y, v2.y, g2);
              dd += 'M' + ctx.sx(ex * 0.14).toFixed(2) + ' ' + ctx.sy(ey * 0.14).toFixed(2) +
                    'L' + ctx.sx(ex * 0.94).toFixed(2) + ' ' + ctx.sy(ey * 0.94).toFixed(2);
            }
          }
          st.lay[kL].setAttribute('d', dd);
          st.lay[kL].setAttribute('stroke-opacity', (layOn * 0.15).toFixed(3));
        }

        // --- edges, same shared window as the circles
        var hideT = win(p, A_SOLIDS, A_SOLIDS + 0.04);
        var recede = 1 - 0.6 * win(p, A_ROTATE, A_ROTATE + 0.08);
        for (var kE = 0; kE < EDGES.length; kE++) {
          var e2 = EDGES[kE], hidden = true;
          for (j = 0; j < FACES.length; j++) {
            if (FACES[j].v.indexOf(e2.a) < 0 || FACES[j].v.indexOf(e2.b) < 0) continue;
            if (RN[j].z > 0.0001) hidden = false;
          }
          var el2 = st.edges[kE];
          ctx.reveal(el2, RQ[e2.a], RQ[e2.b], draw);
          el2.setAttribute('stroke-opacity',
            (0.92 * draw * recede * (hidden ? 1 - 0.62 * hideT : 1)).toFixed(3));
          el2.setAttribute('stroke-width', (2 - 0.7 * (hidden ? hideT : 0)).toFixed(2));
          if (draw >= 1 && hidden && hideT > 0.5) el2.setAttribute('stroke-dasharray', '5 6');
          else if (draw >= 1) el2.removeAttribute('stroke-dasharray');
        }

        // --- faces: only the six rhombi the geometry already closes
        var faceOn = win(p, A_RESOLVE + 0.06, A_SOLIDS);
        for (var kF = 0; kF < FACES.length; kF++) {
          st.faces[kF].setAttribute('points', FACES[kF].v.map(function (vi) {
            return ctx.sx(RQ[vi].x).toFixed(1) + ',' + ctx.sy(RQ[vi].y).toFixed(1);
          }).join(' '));
          var front = RN[kF].z > 0.0001;
          st.faces[kF].setAttribute('fill-opacity', (front
            ? 0.13 * faceOn * recede * (0.45 + 0.55 * Math.abs(RN[kF].z))
            : 0.02 * faceOn * recede).toFixed(3));
        }

        // --- vertices and the split
        var vertOn = win(p, A_RESOLVE, A_RESOLVE + 0.05);
        var sep = Math.hypot(RQ[CA].x - RQ[CB].x, RQ[CA].y - RQ[CB].y);
        var split = sep > 0.04, pulse = clamp01(sep / 0.9);
        for (var kV = 0; kV < 8; kV++) {
          var isC = (kV === CA || kV === CB);
          st.verts[kV].setAttribute('cx', ctx.sx(RQ[kV].x).toFixed(2));
          st.verts[kV].setAttribute('cy', ctx.sy(RQ[kV].y).toFixed(2));
          st.verts[kV].setAttribute('opacity', (vertOn * (isC ? 1 : 0.85)).toFixed(3));
          st.verts[kV].setAttribute('fill', isC && split ? 'var(--signal)' : 'var(--accent)');
          st.verts[kV].setAttribute('r', (isC ? 3.4 + 1.6 * pulse : 3.0).toFixed(2));
        }
        st.glow.setAttribute('cx', ctx.sx(0).toFixed(2));
        st.glow.setAttribute('cy', ctx.sy(0).toFixed(2));
        st.glow.setAttribute('r', 52);
        // Brightest as the pair separates, in both directions — the flip
        // re-merges them, and that deserves the same emphasis as the split.
        st.glow.setAttribute('opacity',
          (vertOn * Math.sin(Math.PI * clamp01(sep / 1.4)) * 0.85).toFixed(3));

        // --- the pattern, read off the canonical projection
        var patOn = win(p, A_ROTATE + 0.05, 0.99);
        for (var kP = 0; kP < PATTERN.lines.length; kP++) {
          var ln = PATTERN.lines[kP];
          var t = easeOut(clamp01((patOn - (ln.cls === 'diagonal' ? 0 : 0.30)) / 0.55));
          ctx.reveal(st.pattern[kP], ln.a, ln.b, t);
          st.pattern[kP].setAttribute('stroke-opacity', (0.85 * t).toFixed(3));
          if (ln.cls === 'diagonal') st.pattern[kP].setAttribute('stroke-dasharray', '4 5');
        }

        ctx.set('spheres', Math.min(shown, 8) + ' / 8');
        ctx.set('verts', p < A_RESOLVE ? '—' : (split ? '8' : '7'));
        ctx.mark('verts', split ? (pulse < 0.85 ? 'hud-v--split' : 'hud-v--signal') : '');
        ctx.set('theta', (theta * DEG).toFixed(3) + '°');
        ctx.set('phi', (phi * DEG).toFixed(3) + '°');
        ctx.set('edges', (draw > 0 ? 12 : 0) + ' / 12');
        ctx.set('faces', (faceOn > 0 ? 6 : 0) + ' / 6');
        ctx.set('proj', (Math.abs(theta) < 1e-6 && Math.abs(Math.sin(phi)) < 1e-6)
          ? '⊥ [1,1,1]' : 'orthographic');
        ctx.set('pattern', patOn > 0 ? PATTERN.passed + ' / ' + PATTERN.total + ' verified' : '—');

        ctx.phase(
          p < A_RESOLVE       ? 'Seven circles, twelve lines &middot; <b>all at once</b>' :
          p < A_SOLIDS        ? 'Circles become <b>spheres</b> where they stand' :
          p < A_LIFT          ? 'The centre splits &middot; <b>vertices 7 &rarr; 8</b>' :
          p < A_FLIP          ? 'Through the flat &middot; <b>the reading flips</b>' :
          p < A_ROTATE        ? 'Orthographic cube &middot; hidden edges dashed' :
          p < A_ROTATE + 0.10 ? 'Back to the diagonal &middot; looking for structure' :
          p < 0.94            ? 'Concurrent &middot; collinear &middot; <b>twelve equal chords</b>' :
                                'Star tetrahedron, seen from here, is a <b>hexagram</b>'
        );
      },

      pattern: PATTERN
    };
  })();

  /* ======================================================================
     STUDY 2 — the lattice and the enclosing sphere

     After the Odstone Barn design: a square lattice block inside a ring.
     The flat design stays exactly where it is; the ring never moves and never
     resizes, because it turns out to be the equator of the sphere the lattice
     is inscribed in. That is the improvement over study 1 — the enclosing
     sphere is DERIVED (it is the circumsphere through the eight corners), not
     imposed on the design for effect.
     ====================================================================== */

  var lattice = (function () {
    var RS = Math.sqrt(3);          // ring radius = circumsphere radius
    var HALF = 296;
    var FRAME = RS + 0.30;

    // 27 nodes on {-1,0,1}^3.
    var NODES = [];
    for (var x = -1; x <= 1; x++)
      for (var y = -1; y <= 1; y++)
        for (var z = -1; z <= 1; z++) NODES.push({ x: x, y: y, z: z });

    function nodeAt(x, y, z) {
      if (x < -1 || x > 1 || y < -1 || y > 1 || z < -1 || z > 1) return -1;
      return (x + 1) * 9 + (y + 1) * 3 + (z + 1);
    }

    // 54 unit edges, adjacent along one axis.
    var LEDGES = [];
    NODES.forEach(function (n, idx) {
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (d) {
        var j = nodeAt(n.x + d[0], n.y + d[1], n.z + d[2]);
        if (j >= 0) LEDGES.push({ a: idx, b: j, axis: d[2] ? 2 : (d[1] ? 1 : 0) });
      });
    });

    // ---- pattern: computed, asserted, and only then drawn
    var PATTERN = (function () {
      var out = { tol: TOL, claims: [], lines: [], shells: [] };
      function claim(name, detail, residual) {
        var ok = residual <= TOL;
        out.claims.push({ name: name, detail: detail, residual: residual, ok: ok });
        return ok;
      }

      // (a) The 27 nodes lie on exactly four concentric shells.
      var radii = {};
      NODES.forEach(function (n) {
        var r = Math.hypot(n.x, n.y, n.z);
        var key = r.toFixed(9);
        radii[key] = (radii[key] || 0) + 1;
      });
      var keys = Object.keys(radii).sort(function (a, b) { return a - b; });
      var counts = keys.map(function (k) { return radii[k]; });
      // Expected: 1 centre, 6 face centres, 12 edge midpoints, 8 corners.
      var shellsOk = keys.length === 4 &&
        counts.join(',') === '1,6,12,8';
      claim('shells', '27 nodes on 4 shells (1, 6, 12, 8)', shellsOk ? 0 : 1);
      if (shellsOk) {
        keys.forEach(function (k) { if (+k > 0) out.shells.push(+k); });
      }
      out.shellCounts = counts;

      // (b) Lines of three collinear nodes. Enumerated over the 13 canonical
      //     directions; the closed form for an n-cube grid is (5^3 - 3^3)/2.
      var dirs = [];
      for (var dx = -1; dx <= 1; dx++)
        for (var dy = -1; dy <= 1; dy++)
          for (var dz = -1; dz <= 1; dz++) {
            if (!dx && !dy && !dz) continue;
            // keep one of each antipodal pair
            if (dx < 0 || (dx === 0 && dy < 0) || (dx === 0 && dy === 0 && dz < 0)) continue;
            dirs.push([dx, dy, dz]);
          }
      var found = [];
      NODES.forEach(function (c, ci) {
        dirs.forEach(function (d) {
          var lo = nodeAt(c.x - d[0], c.y - d[1], c.z - d[2]);
          var hi = nodeAt(c.x + d[0], c.y + d[1], c.z + d[2]);
          if (lo < 0 || hi < 0) return;
          var rank = Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]);
          found.push({ lo: lo, mid: ci, hi: hi, rank: rank });
        });
      });
      var expected = (Math.pow(5, 3) - Math.pow(3, 3)) / 2;   // 49
      claim('collinear-49', found.length + ' lines of three (closed form ' + expected + ')',
        Math.abs(found.length - expected));
      out.lineCount = found.length;
      if (found.length === expected) {
        // The 27 axis-aligned lines are already on screen as lattice edges, so
        // only the 22 diagonals get drawn — otherwise the layer is mostly a
        // redraw of what the viewer is already looking at.
        found.filter(function (L) { return L.rank > 1; }).forEach(function (L) {
          out.lines.push({ a: NODES[L.lo], b: NODES[L.hi], rank: L.rank });
        });
      }

      // (c) The ring is the circumsphere's great circle.
      var maxR = 0;
      NODES.forEach(function (n) { maxR = Math.max(maxR, Math.hypot(n.x, n.y, n.z)); });
      claim('circumsphere', 'ring radius = max node radius = sqrt(3)', Math.abs(maxR - RS));

      out.passed = out.claims.filter(function (c) { return c.ok; }).length;
      out.total = out.claims.length;
      return out;
    })();

    var LATS = [-67.5, -45, -22.5, 0, 22.5, 45, 67.5];
    var EQ = 3;                      // index of the equator, which is the ring
    var LONS = [0, 30, 60, 90, 120, 150];

    function parallelPts(latDeg, n) {
      var la = latDeg / DEG, out = [];
      for (var i = 0; i <= n; i++) {
        var u = i / n * 2 * Math.PI;
        out.push({ x: RS * Math.cos(la) * Math.cos(u), y: RS * Math.cos(la) * Math.sin(u), z: RS * Math.sin(la) });
      }
      return out;
    }
    function meridianPts(lonDeg, v0, v1, n) {
      var lo = lonDeg / DEG, out = [];
      for (var i = 0; i <= n; i++) {
        var v = (v0 + (v1 - v0) * i / n) / DEG;
        out.push({ x: RS * Math.cos(v) * Math.cos(lo), y: RS * Math.cos(v) * Math.sin(lo), z: RS * Math.sin(v) });
      }
      return out;
    }

    var A_RESOLVE = 0.16, A_EXTRUDE = 0.36, A_BOWL = 0.56,
        A_ENCLOSE = 0.72, A_ROTATE = 0.86;

    return {
      id: 'lattice',
      title: 'The lattice and its sphere',
      aria: 'A square lattice inside a ring resolves, extrudes into a three-dimensional lattice, and the ring opens into a half sphere shell and then a full sphere enclosing it, before the collinear structure of the lattice is drawn.',
      lede: 'After the Odstone Barn design — a square lattice block inside a ring. The lattice extrudes into three dimensions and the ring opens into a shell around it. The ring never moves: it turns out to be the equator of the sphere the lattice is inscribed in.',
      duration: 16000,
      staticP: 0.99,
      layers: ['shellBack', 'lattice', 'shellFront', 'pattern', 'nodes'],
      hud: {
        tl: [['NODES', 'nodes', '0 / 27'], ['LAYERS', 'layers', '1 / 3']],
        tr: [['TILT θ', 'theta', '0.000°'], ['SPIN φ', 'phi', '0.000°']],
        bl: [['EDGES', 'edges', '0 / 54'], ['SHELL', 'shell', '0%']],
        br: [['CIRCUMSPHERE', 'circ', 'r = √3'], ['INCIDENCES', 'pattern', '—']]
      },
      log: [
        { p: 0.05, t: 'RING + 3&times;3 GRID &middot; AT ONCE' },
        { p: 0.13, t: 'RING r = &radic;3 = 1.73205' },
        { p: 0.24, t: 'EXTRUDE &middot; 9 &rarr; <b>27 NODES</b>' },
        { p: 0.32, t: '54 UNIT EDGES' },
        { p: 0.46, t: 'SHELL OPENS FROM THE EQUATOR' },
        { p: 0.60, t: 'HALF SHELL &middot; LATTICE INSIDE', key: true },
        { p: 0.70, t: 'FULL SPHERE &middot; CORNERS TOUCH IT' },
        { p: 0.80, t: 'FREE ROTATION' },
        { p: 0.90, t: '4 CONCENTRIC SHELLS &middot; 1 &middot; 6 &middot; 12 &middot; 8' },
        { p: 0.95, t: '49 LINES OF THREE', key: true }
      ],
      notes: [
        '<b>The sphere is derived, not decorative.</b> The eight corner nodes sit at ' +
        'distance &radic;3 from the centre, so a sphere of radius &radic;3 passes through ' +
        'all eight &mdash; it is the lattice\'s circumsphere. The flat design\'s ring has ' +
        'exactly that radius, which means the ring was already a great circle of that ' +
        'sphere seen edge-on. Nothing is moved or resized to make this work.',
        '<b>The pattern layer is computed and asserted.</b> The 27 nodes fall on exactly ' +
        'four concentric shells &mdash; 1 centre, 6 face centres, 12 edge midpoints, ' +
        '8 corners &mdash; and they carry <b>49 lines of three collinear nodes</b>, which ' +
        'matches the closed form (5&sup3; &minus; 3&sup3;)/2. Twenty-seven of those are ' +
        'axis-aligned and already on screen as lattice edges, so only the 22 diagonals ' +
        'are drawn. Residuals are readable at <code>STUDIES.lattice.pattern</code>.'
      ],

      build: function (ctx) {
        var st = {};

        // Sphere wireframe: every curve is two paths, near side and far side,
        // split at the depth sign change. Without that a wireframe sphere
        // reads as a flat disc no matter how many circles are on it.
        function pair(width) {
          var back = mk('path', {
            fill: 'none', stroke: 'var(--accent)', 'stroke-width': width,
            'stroke-opacity': 0, 'stroke-dasharray': '3 5'
          });
          var front = mk('path', {
            fill: 'none', stroke: 'var(--accent)', 'stroke-width': width,
            'stroke-opacity': 0, 'stroke-linecap': 'round'
          });
          ctx.g.shellBack.appendChild(back);
          ctx.g.shellFront.appendChild(front);
          return { back: back, front: front };
        }
        st.parallels = LATS.map(function (l) { return pair(l === 0 ? 1.9 : 1); });
        st.meridians = LONS.map(function () { return pair(1); });

        st.edges = LEDGES.map(function () {
          var el = mk('line', {
            stroke: 'var(--accent)', 'stroke-width': 1.6, 'stroke-opacity': 0,
            'stroke-linecap': 'round'
          });
          ctx.g.lattice.appendChild(el);
          return el;
        });

        st.shells = PATTERN.shells.map(function () {
          var el = mk('circle', {
            r: 0, fill: 'none', stroke: 'var(--text-2)', 'stroke-width': 1,
            'stroke-opacity': 0, 'stroke-dasharray': '2 6'
          });
          ctx.g.pattern.appendChild(el);
          return el;
        });

        st.pattern = PATTERN.lines.map(function (ln) {
          var el = mk('line', {
            // rank 2 = face diagonal, rank 3 = space diagonal. Only two
            // classes, so two tokens is the whole palette this needs.
            stroke: ln.rank === 3 ? 'var(--signal)' : 'var(--accent)',
            'stroke-width': ln.rank === 3 ? 1.8 : 1,
            'stroke-opacity': 0, 'stroke-linecap': 'round'
          });
          ctx.g.pattern.appendChild(el);
          return el;
        });

        st.nodes = NODES.map(function () {
          var el = mk('circle', { r: 0, fill: 'var(--accent)', opacity: 0 });
          ctx.g.nodes.appendChild(el);
          return el;
        });

        return st;
      },

      render: function (ctx, p) {
        var st = ctx.state;
        ctx.K = HALF / FRAME;      // constant: the design is never rescaled

        // Tilt ALONE is not enough here. With phi at zero the lattice's depth
        // axis projects straight onto screen-y, the three layers land on the
        // same columns, and 27 nodes read as a flat grid with extra rows. The
        // spin is what separates the layers into an axonometric view — so the
        // extrusion turns and tilts together.
        var TH = 28 / DEG, PH = 34 / DEG;
        var theta = 0, phi = 0;
        if (p > A_RESOLVE && p <= A_ENCLOSE) {
          var q0 = easeInOut(win(p, A_RESOLVE, A_BOWL));
          theta = TH * q0;
          phi = PH * q0;
        } else if (p > A_ENCLOSE && p <= A_ROTATE) {
          var q = win(p, A_ENCLOSE, A_ROTATE);
          theta = TH + Math.sin(q * Math.PI) * 12 / DEG;
          phi = PH + easeInOut(q) * 220 / DEG;
        } else if (p > A_ROTATE) {
          // Settle into a clean three-quarter view. Unlike study 1 this does
          // NOT return to flat: the incidences are facts about the lattice in
          // three dimensions, and flat would collapse them out of sight.
          var q2 = easeInOut(win(p, A_ROTATE, A_ROTATE + 0.06));
          theta = lerp(TH + 0, 26 / DEG, q2);
          phi = lerp(PH + 220 / DEG, PH + 360 / DEG, q2);
        }
        var rot = rotator(theta, phi);
        var RN = NODES.map(rot);

        var draw = easeOut(win(p, 0.01, A_RESOLVE));
        var extrude = easeInOut(win(p, A_RESOLVE, A_EXTRUDE));

        // --- lattice edges. The z = 0 layer is the flat design and is present
        // from the first frame; the other two layers arrive with the extrusion.
        var edgeCount = 0;
        for (var i = 0; i < LEDGES.length; i++) {
          var e = LEDGES[i];
          var na = NODES[e.a], nb = NODES[e.b];
          var inPlane = (na.z === 0 && nb.z === 0);
          var t = inPlane ? draw : draw * extrude;
          if (t > 0.02) edgeCount++;
          ctx.reveal(st.edges[i], RN[e.a], RN[e.b], t);
          st.edges[i].setAttribute('stroke-opacity', (0.75 * t).toFixed(3));
        }

        // --- nodes
        var nodeCount = 0;
        for (i = 0; i < NODES.length; i++) {
          var vis = (NODES[i].z === 0 ? draw : draw * extrude);
          if (vis > 0.02) nodeCount++;
          st.nodes[i].setAttribute('cx', ctx.sx(RN[i].x).toFixed(2));
          st.nodes[i].setAttribute('cy', ctx.sy(RN[i].y).toFixed(2));
          st.nodes[i].setAttribute('r', (2.6 * vis).toFixed(2));
          st.nodes[i].setAttribute('opacity', (0.95 * vis).toFixed(3));
        }

        // --- the shell. shellLat runs -90 (nothing but the equator) to 0
        // (a bowl, open at the top) to +90 (closed). The equator is the
        // original ring and is drawn from the first frame regardless.
        var shellLat = -90;
        if (p > A_EXTRUDE) shellLat = lerp(-90, 0, easeInOut(win(p, A_EXTRUDE, A_BOWL)));
        if (p > A_BOWL) shellLat = lerp(0, 90, easeInOut(win(p, A_BOWL, A_ENCLOSE)));

        for (i = 0; i < LATS.length; i++) {
          var lat = LATS[i], pr = st.parallels[i];
          var on;
          if (i === EQ) {
            on = draw;                                  // the ring itself
          } else if (lat < 0) {
            // Southern parallels fill in as the bowl forms.
            on = clamp01((shellLat + 90) / 90) > (lat + 90) / 90 ? 1 : 0;
            on *= win(p, A_EXTRUDE, A_BOWL) > 0 ? 1 : 0;
          } else {
            on = shellLat >= lat ? 1 : 0;
          }
          var pts = parallelPts(lat, 96).map(rot);
          var d = ctx.depthSplit(pts);
          pr.front.setAttribute('d', d.front || 'M0 0');
          pr.back.setAttribute('d', d.back || 'M0 0');
          var base = i === EQ ? 0.8 : 0.34;
          pr.front.setAttribute('stroke-opacity', (base * on).toFixed(3));
          pr.back.setAttribute('stroke-opacity', (base * 0.4 * on).toFixed(3));
          if (i === EQ && draw < 1) {
            // Draw the ring on rather than popping it in, matching the grid.
            pr.front.setAttribute('stroke-dasharray', '');
          }
        }

        for (i = 0; i < LONS.length; i++) {
          var md = st.meridians[i];
          var mOn = p > A_EXTRUDE ? 1 : 0;
          var pts2 = meridianPts(LONS[i], -90, Math.max(-89.9, shellLat), 64).map(rot);
          var d2 = ctx.depthSplit(pts2);
          md.front.setAttribute('d', d2.front || 'M0 0');
          md.back.setAttribute('d', d2.back || 'M0 0');
          md.front.setAttribute('stroke-opacity', (0.30 * mOn).toFixed(3));
          md.back.setAttribute('stroke-opacity', (0.12 * mOn).toFixed(3));
        }

        // --- pattern
        var patOn = win(p, A_ROTATE + 0.04, 0.99);
        for (i = 0; i < st.shells.length; i++) {
          st.shells[i].setAttribute('cx', ctx.sx(0).toFixed(2));
          st.shells[i].setAttribute('cy', ctx.sy(0).toFixed(2));
          st.shells[i].setAttribute('r', (PATTERN.shells[i] * ctx.K).toFixed(2));
          st.shells[i].setAttribute('stroke-opacity', (0.5 * clamp01(patOn / 0.4)).toFixed(3));
        }
        for (i = 0; i < PATTERN.lines.length; i++) {
          var ln = PATTERN.lines[i];
          // Space diagonals first — there are only four and they read as the
          // headline; the eighteen face diagonals fill in behind them.
          var delay = ln.rank === 3 ? 0.10 : 0.34;
          var tt = easeOut(clamp01((patOn - delay) / 0.5));
          ctx.reveal(st.pattern[i], rot(ln.a), rot(ln.b), tt);
          st.pattern[i].setAttribute('stroke-opacity',
            ((ln.rank === 3 ? 0.9 : 0.42) * tt).toFixed(3));
        }

        ctx.set('nodes', Math.min(nodeCount, 27) + ' / 27');
        ctx.set('layers', (extrude > 0.02 ? 3 : 1) + ' / 3');
        ctx.set('theta', (theta * DEG).toFixed(3) + '°');
        ctx.set('phi', (phi * DEG).toFixed(3) + '°');
        ctx.set('edges', Math.min(edgeCount, 54) + ' / 54');
        ctx.set('shell', Math.round(clamp01((shellLat + 90) / 180) * 100) + '%');
        ctx.mark('shell', shellLat >= 89 ? 'hud-v--signal' : '');
        ctx.set('circ', 'r = √3');
        ctx.set('pattern', patOn > 0 ? PATTERN.passed + ' / ' + PATTERN.total + ' verified' : '—');

        ctx.phase(
          p < A_RESOLVE  ? 'Ring and grid &middot; <b>all at once</b>' :
          p < A_EXTRUDE  ? 'Extruding &middot; 9 nodes become <b>27</b>' :
          p < A_BOWL     ? 'The ring opens &middot; a <b>shell</b> forms around it' :
          p < A_ENCLOSE  ? 'Half open &middot; the lattice sits <b>inside</b>' :
          p < A_ROTATE   ? 'Closed &middot; <b>all eight corners touch the sphere</b>' :
          p < 0.94       ? '27 nodes on <b>four concentric shells</b>' :
                           '<b>49 lines of three</b> &middot; 22 diagonals drawn'
        );
      },

      pattern: PATTERN
    };
  })();

  /* ======================================================================
     STUDY 3 — the Stonehenge Julia Set, 7 July 1996

     Ported from the standalone lab page unchanged in behaviour. Kept here so
     all three studies share one driver and can be compared side by side.
     Deliberately a different visual register from the other two: a phosphor
     survey rather than a drafting table.
     ====================================================================== */

  var julia = (function () {
    var N = 151, TURNS = 2.55, GROWTH = 42, BLOOM = 9;
    var DTH = TURNS * 2 * Math.PI / (N - 1);
    var B = Math.log(GROWTH) / (TURNS * 2 * Math.PI);

    function Rf(n) { return Math.exp(B * n * DTH); }
    function CXf(n) { return Rf(n) * Math.cos(n * DTH); }
    function CYf(n) { return Rf(n) * Math.sin(n * DTH); }

    // Because the figure is self-similar, deriving ALPHA from the first
    // adjacent pair makes EVERY adjacent pair tangent.
    var ALPHA = (function () {
      var dx = CXf(1) - CXf(0), dy = CYf(1) - CYf(0);
      return Math.hypot(dx, dy) / (Rf(0) + Rf(1));
    })();
    var STEP_SCALE = Math.exp(B * DTH);
    var STEP_DEG = DTH * DEG;

    var raw = [];
    for (var i = 0; i < N; i++) raw.push({ x: CXf(i), y: CYf(i), r: ALPHA * Rf(i) });

    var VB_W = 1000, VB_H = 700;
    var fit = (function () {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      raw.forEach(function (q) {
        minX = Math.min(minX, q.x - q.r); maxX = Math.max(maxX, q.x + q.r);
        minY = Math.min(minY, q.y - q.r); maxY = Math.max(maxY, q.y + q.r);
      });
      var pad = 46;
      var s = Math.min((VB_W - pad * 2) / (maxX - minX), (VB_H - pad * 2) / (maxY - minY));
      return { s: s, tx: (VB_W - (maxX + minX) * s) / 2, ty: (VB_H - (maxY + minY) * s) / 2 };
    })();
    var P = raw.map(function (q) {
      return { x: q.x * fit.s + fit.tx, y: q.y * fit.s + fit.ty, r: q.r * fit.s };
    });
    var EYE = { x: fit.tx, y: fit.ty };

    // The trail must be driven by arc length AT A GIVEN CIRCLE INDEX, not by a
    // fraction of total length: on a logarithmic spiral nearly all the length
    // is in the outer turns, so a naive dash offset detaches the glowing head
    // from the circle it is meant to be drawing.
    var SUB = 6, cumAtIndex = [];
    var pathD = (function () {
      var d = '', steps = (N - 1) * SUB, run = 0, px = 0, py = 0;
      for (var j = 0; j <= steps; j++) {
        var t = j / SUB;
        var rr = Math.exp(B * t * DTH);
        var x = rr * Math.cos(t * DTH) * fit.s + fit.tx;
        var y = rr * Math.sin(t * DTH) * fit.s + fit.ty;
        if (j) run += Math.hypot(x - px, y - py);
        if (j % SUB === 0) cumAtIndex[j / SUB] = run;
        d += (j ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
        px = x; py = y;
      }
      return d;
    })();
    var POLY_LEN = cumAtIndex[N - 1];

    function lenAtIndex(idx) {
      var j = Math.floor(idx);
      if (j >= N - 1) return cumAtIndex[N - 1];
      if (j < 0) return 0;
      return cumAtIndex[j] + (cumAtIndex[j + 1] - cumAtIndex[j]) * (idx - j);
    }

    var TRACE_END = 0.72, HOLD_END = 0.80;

    return {
      id: 'julia',
      title: 'The Stonehenge Julia Set',
      aria: 'Animated reconstruction of the 1996 Stonehenge Julia Set formation: 151 tangent circles traced along a logarithmic spiral, then shown mapping onto itself.',
      lede: '151 circles, 90 metres, half a kilometre from Stonehenge. A pilot reported clear crop at 5:30pm on 7 July 1996; it was found at 6:15pm. Every circle in it is tangent to its neighbours along a single logarithmic spiral.',
      duration: 12000,
      staticP: HOLD_END,
      layers: ['field', 'guide', 'trail', 'circles', 'ghost', 'head'],
      hud: {
        tl: [['CIRCLES', 'n', '0 / 151'], ['SPIRAL', 'turns', '0.00 turns']],
        tr: [['STEP ROTATION', 'step', '6.1200°'], ['STEP SCALE', 'scale', '×1.02523']],
        bl: [['CIRCLE r', 'r', '—'], ['TANGENCY', 'tan', 'exact']],
        br: [['STONEHENGE', 'dist', '0.5 km'], ['LAID IN', 'laid', '< 45 min']]
      },
      log: [
        { p: 0.05, t: 'TRACING THE SPIRAL' },
        { p: 0.30, t: 'EVERY PAIR TANGENT &middot; EXACT' },
        { p: 0.60, t: 'GROWTH &times;42 OVER 2.55 TURNS' },
        { p: 0.74, t: '151 CIRCLES COMPLETE' },
        { p: 0.86, t: 'ROTATE 6.12&deg; &middot; SCALE &times;1.0252' },
        { p: 0.96, t: 'MAPS ONTO ITSELF', key: true }
      ],
      notes: [
        '<b>What is real and what is reconstructed.</b> The formation, the date, the ' +
        '151-circle count, the 90 m span and the under-45-minute window are from the ' +
        'research archive. The spiral itself is a <b>reconstruction</b>: centres are ' +
        'placed on a logarithmic spiral and each radius is a fixed fraction of its ' +
        'distance from the eye. That one rule makes all 150 adjacent pairs exactly ' +
        'tangent &mdash; verified to 1.2&times;10<sup>&minus;14</sup> relative error &mdash; ' +
        'and makes the figure self-similar. It is not a survey tracing of the real crop.'
      ],

      build: function (ctx) {
        var st = {};

        var maxR = 0;
        P.forEach(function (q) { maxR = Math.max(maxR, Math.hypot(q.x - EYE.x, q.y - EYE.y) + q.r); });
        for (var j = 1; j <= 6; j++) {
          ctx.g.field.appendChild(mk('circle', {
            cx: EYE.x, cy: EYE.y, r: maxR * j / 6, fill: 'none',
            stroke: 'var(--text-2)', 'stroke-opacity': 0.10, 'stroke-width': 1
          }));
        }
        for (var a = 0; a < 12; a++) {
          var th = a * Math.PI / 6;
          ctx.g.field.appendChild(mk('line', {
            x1: EYE.x, y1: EYE.y,
            x2: EYE.x + Math.cos(th) * maxR, y2: EYE.y + Math.sin(th) * maxR,
            stroke: 'var(--text-2)', 'stroke-opacity': 0.07, 'stroke-width': 1
          }));
        }

        ctx.g.guide.appendChild(mk('path', {
          d: pathD, fill: 'none', stroke: 'var(--accent)',
          'stroke-opacity': 0.13, 'stroke-width': 1, 'stroke-dasharray': '2 5'
        }));

        st.trailDim = mk('path', {
          d: pathD, fill: 'none', stroke: 'var(--accent)',
          'stroke-opacity': 0.30, 'stroke-width': 1.6, 'stroke-linecap': 'round'
        });
        st.trailHot = mk('path', {
          d: pathD, fill: 'none', stroke: 'var(--accent)',
          'stroke-opacity': 0.95, 'stroke-width': 2.4, 'stroke-linecap': 'round'
        });
        ctx.g.trail.appendChild(st.trailDim);
        ctx.g.trail.appendChild(st.trailHot);
        st.LEN = st.trailDim.getTotalLength();
        st.trailDim.setAttribute('stroke-dasharray', st.LEN);
        st.trailHot.setAttribute('stroke-dasharray', st.LEN);

        st.circles = P.map(function (q) {
          var c = mk('circle', {
            cx: q.x, cy: q.y, r: q.r,
            fill: 'var(--accent)', 'fill-opacity': 0.06,
            stroke: 'var(--accent)', 'stroke-width': 1.25, 'stroke-opacity': 0
          });
          ctx.g.circles.appendChild(c);
          return c;
        });

        st.ghost = mk('g', { opacity: 0 });
        P.forEach(function (q) {
          st.ghost.appendChild(mk('circle', {
            cx: q.x, cy: q.y, r: q.r, fill: 'none',
            stroke: 'var(--signal)', 'stroke-width': 1.4, 'stroke-opacity': 0.9
          }));
        });
        ctx.g.ghost.appendChild(st.ghost);

        st.headDot = mk('circle', { r: 3.4, fill: 'var(--accent)', opacity: 0 });
        st.headRing = mk('circle', {
          r: 9, fill: 'none', stroke: 'var(--accent)',
          'stroke-width': 1, 'stroke-opacity': 0.5, opacity: 0
        });
        ctx.g.head.appendChild(st.headRing);
        ctx.g.head.appendChild(st.headDot);
        return st;
      },

      render: function (ctx, p) {
        var st = ctx.state;
        var traceP = clamp01(p / TRACE_END);
        var eased = 1 - Math.pow(1 - traceP, 1.7);
        // Run the head BLOOM past the final index, or the last few circles
        // stay permanently half-drawn.
        var headIdx = eased * (N - 1 + BLOOM);
        var headPos = Math.min(headIdx, N - 1);

        var revealed = lenAtIndex(headPos) * (st.LEN / POLY_LEN);
        st.trailDim.setAttribute('stroke-dashoffset', (st.LEN - revealed).toFixed(2));
        var hotStart = lenAtIndex(Math.max(0, headPos - 7)) * (st.LEN / POLY_LEN);
        var hot = Math.max(1, revealed - hotStart);
        st.trailHot.setAttribute('stroke-dasharray', hot.toFixed(2) + ' ' + st.LEN);
        st.trailHot.setAttribute('stroke-dashoffset', (-(revealed - hot)).toFixed(2));

        for (var i = 0; i < N; i++) {
          var t = clamp01((headIdx - i) / BLOOM);
          st.circles[i].setAttribute('stroke-opacity', (0.85 * t).toFixed(3));
          st.circles[i].setAttribute('fill-opacity', (0.07 * t).toFixed(3));
          st.circles[i].setAttribute('r', (P[i].r * (0.55 + 0.45 * t)).toFixed(2));
        }

        var showHead = clamp01(1 - (p - TRACE_END) / 0.035);
        st.trailHot.setAttribute('stroke-opacity', (0.95 * showHead).toFixed(3));
        var hi = Math.min(N - 1, Math.round(headPos));
        [st.headDot, st.headRing].forEach(function (n) {
          n.setAttribute('cx', P[hi].x.toFixed(2));
          n.setAttribute('cy', P[hi].y.toFixed(2));
          n.setAttribute('opacity', showHead.toFixed(3));
        });
        st.headRing.setAttribute('r', (P[hi].r * 1.5 + 4).toFixed(2));

        if (p > HOLD_END) {
          var q = clamp01((p - HOLD_END) / (1 - HOLD_END));
          var k = clamp01(q / 0.6);
          // Fade in, hold through the landing, then out, so the original is
          // what remains on screen — that read is the point of the beat.
          var gop = 0.9 * Math.min(clamp01(q / 0.08), clamp01((1 - q) / 0.22));
          st.ghost.setAttribute('opacity', gop.toFixed(3));
          var ang = lerp(0, STEP_DEG, k), sc = lerp(1, STEP_SCALE, k);
          st.ghost.setAttribute('transform',
            'translate(' + EYE.x.toFixed(2) + ' ' + EYE.y.toFixed(2) + ') ' +
            'rotate(' + ang.toFixed(3) + ') scale(' + sc.toFixed(5) + ') ' +
            'translate(' + (-EYE.x).toFixed(2) + ' ' + (-EYE.y).toFixed(2) + ')');
          ctx.phase(k < 1
            ? 'Rotating <b>' + ang.toFixed(2) + '&deg;</b> &middot; scaling <b>&times;' + sc.toFixed(5) + '</b>'
            : 'One step maps the formation <b>onto itself</b>');
        } else {
          st.ghost.setAttribute('opacity', 0);
          st.ghost.removeAttribute('transform');
          ctx.phase(p < TRACE_END
            ? 'Tracing the spiral &middot; each circle tangent to the last'
            : '151 circles &middot; one logarithmic spiral');
        }

        var count = Math.round(clamp01(eased) * (N - 1)) + (eased > 0 ? 1 : 0);
        ctx.set('n', Math.min(count, N) + ' / ' + N);
        ctx.set('turns', (eased * TURNS).toFixed(2) + ' turns');
        ctx.set('r', (P[hi].r / P[0].r).toFixed(1) + '× r₀');
        ctx.set('step', STEP_DEG.toFixed(4) + '°');
        ctx.set('scale', '×' + STEP_SCALE.toFixed(5));
      },

      ALPHA: ALPHA
    };
  })();

  return { hexcube: hexcube, lattice: lattice, julia: julia,
           all: [hexcube, lattice, julia] };
})();
