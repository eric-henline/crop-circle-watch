/* ==========================================================================
   anim-engine.js — shared shell for the formation studies.

   One implementation, mounted many times. labs/index.html mounts every study
   on one page for comparison; the single-study wrapper pages mount one each.
   Before this existed each animation carried its own copy of the stage, HUD,
   log and rAF driver, which is how the two of them drifted apart.

   The engine owns everything that is the same every time:
     · the DOM (stage, SVG, HUD corners, phase pill, controls, log)
     · the driver — autoplay, pause, scrub, the hidden-tab delta clamp,
       and the prefers-reduced-motion static render
     · the projection helpers and the p-window/easing maths

   A study supplies only its own geometry and its own render(ctx, p). The one
   rule the engine enforces by design: **render must be a pure function of p.**
   Nothing may accumulate frame to frame, because scrubbing backwards has to
   un-draw the figure exactly, and the reduced-motion path renders a single
   frame cold with no history at all.

   No build step, no dependencies — same constraints as the rest of the site.
   ========================================================================== */

window.ANIM = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DEG = 180 / Math.PI;

  function mk(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function h(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // How far p has travelled through [a,b], clamped to [0,1].
  function win(p, a, b) { return clamp01((p - a) / (b - a)); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  // Rotation in view space: spin about the screen-vertical axis, then tilt
  // about the screen-horizontal one. At theta = phi = 0 this is the identity,
  // so every study's rest pose is exactly its flat design.
  function rotator(theta, phi) {
    var ca = Math.cos(theta), sa = Math.sin(theta);
    var cf = Math.cos(phi), sf = Math.sin(phi);
    return function (q) {
      var x1 = q.x * cf + q.z * sf;
      var z1 = -q.x * sf + q.z * cf;
      return { x: x1, y: q.y * ca - z1 * sa, z: q.y * sa + z1 * ca };
    };
  }

  var HUD_SLOTS = ['tl', 'tr', 'bl', 'br'];

  function mount(host, spec) {
    var VB_W = spec.viewBox ? spec.viewBox[0] : 1000;
    var VB_H = spec.viewBox ? spec.viewBox[1] : 700;

    // ---- DOM
    var article = h('article', 'study');
    article.id = 'study-' + spec.id;

    var head = h('header', 'study-head');
    if (spec.index) head.appendChild(h('p', 'study-index', spec.index));
    head.appendChild(h('h2', 'study-title', spec.title));
    if (spec.lede) head.appendChild(h('p', 'study-lede', spec.lede));
    article.appendChild(head);

    var stage = h('div', 'stage');
    var svg = mk('svg', {
      'class': 'stage-svg',
      viewBox: '0 0 ' + VB_W + ' ' + VB_H,
      role: 'img',
      'aria-label': spec.aria || spec.title
    });
    if (spec.defs) svg.appendChild(spec.defs());
    stage.appendChild(svg);

    var groups = {};
    (spec.layers || []).forEach(function (name) {
      var g = mk('g', {});
      svg.appendChild(g);
      groups[name] = g;
    });

    var hud = h('div', 'hud');
    var readouts = {};
    HUD_SLOTS.forEach(function (slot) {
      var rows = (spec.hud || {})[slot];
      if (!rows || !rows.length) return;
      var corner = h('div', 'hud-corner hud-' + slot);
      rows.forEach(function (row) {
        var line = h('div');
        line.appendChild(h('span', 'hud-k', row[0]));
        line.appendChild(document.createTextNode(' '));
        var v = h('span', 'hud-v', row[2] == null ? '—' : row[2]);
        line.appendChild(v);
        readouts[row[1]] = v;
        corner.appendChild(line);
      });
      hud.appendChild(corner);
    });
    var phaseEl = h('p', 'phase', '');
    hud.appendChild(phaseEl);
    stage.appendChild(hud);
    article.appendChild(stage);

    // ---- controls
    var controls = h('div', 'controls');
    var btnPlay = h('button', 'btn', 'Pause');
    btnPlay.type = 'button';
    btnPlay.setAttribute('aria-pressed', 'true');
    var btnReplay = h('button', 'btn', 'Replay');
    btnReplay.type = 'button';
    var scrubWrap = h('div', 'scrub');
    var scrub = document.createElement('input');
    scrub.type = 'range'; scrub.min = 0; scrub.max = 1000; scrub.value = 0;
    scrub.setAttribute('aria-label', 'Scrub ' + spec.title);
    var scrubLabel = h('span', 'scrub-label', '0%');
    scrubWrap.appendChild(scrub);
    scrubWrap.appendChild(scrubLabel);
    controls.appendChild(btnPlay);
    controls.appendChild(btnReplay);
    controls.appendChild(scrubWrap);
    article.appendChild(controls);

    // ---- log
    var logEls = [];
    if (spec.log && spec.log.length) {
      var ul = h('ul', 'log');
      spec.log.forEach(function (entry, i) {
        var li = h('li', entry.key ? 'key' : '');
        li.innerHTML = '<span class="log-i">' + String(i + 1).padStart(2, '0') +
          '</span><span>' + entry.t + '</span>';
        ul.appendChild(li);
        logEls.push(li);
      });
      article.appendChild(ul);
    }

    (spec.notes || []).forEach(function (html) {
      article.appendChild(h('p', 'study-note', html));
    });

    host.appendChild(article);

    // ---- context handed to the study
    var ctx = {
      svg: svg,
      g: groups,
      W: VB_W, H: VB_H,
      CX: VB_W / 2, CY: VB_H / 2,
      K: 1,                      // px per model unit; the study sets it per frame
      mk: mk,
      sx: function (x) { return ctx.CX + x * ctx.K; },
      sy: function (y) { return ctx.CY - y * ctx.K; },
      set: function (key, value) {
        var el = readouts[key];
        if (el && el.textContent !== value) el.textContent = value;
      },
      mark: function (key, cls) {
        var el = readouts[key];
        if (!el) return;
        var next = 'hud-v' + (cls ? ' ' + cls : '');
        if (el.className !== next) el.className = next;
      },
      phase: function (html) {
        if (phaseEl.dataset.txt === html) return;
        phaseEl.dataset.txt = html;
        phaseEl.innerHTML = html;
      },
      line: function (el, p1, p2) {
        el.setAttribute('x1', ctx.sx(p1.x).toFixed(2));
        el.setAttribute('y1', ctx.sy(p1.y).toFixed(2));
        el.setAttribute('x2', ctx.sx(p2.x).toFixed(2));
        el.setAttribute('y2', ctx.sy(p2.y).toFixed(2));
      },
      // Draw-on for a line whose endpoints move between frames. The dash
      // length is recomputed every frame rather than cached, or the reveal
      // desyncs the moment the figure starts rotating.
      reveal: function (el, p1, p2, t) {
        ctx.line(el, p1, p2);
        if (t >= 1) { el.removeAttribute('stroke-dashoffset'); return; }
        var len = Math.hypot(ctx.sx(p2.x) - ctx.sx(p1.x), ctx.sy(p2.y) - ctx.sy(p1.y));
        el.setAttribute('stroke-dasharray', len.toFixed(2));
        el.setAttribute('stroke-dashoffset', (len * (1 - t)).toFixed(2));
      },
      // Polyline through projected points, split at the depth sign change so a
      // wireframe sphere can draw its far side differently from its near side.
      // Without this a sphere reads as a flat disc no matter how many circles
      // are on it.
      depthSplit: function (pts) {
        var front = '', back = '', openF = false, openB = false;
        for (var i = 0; i < pts.length; i++) {
          var q = pts[i];
          var cmd = ctx.sx(q.x).toFixed(2) + ' ' + ctx.sy(q.y).toFixed(2);
          if (q.z >= 0) {
            front += (openF ? 'L' : 'M') + cmd; openF = true; openB = false;
          } else {
            back += (openB ? 'L' : 'M') + cmd; openB = true; openF = false;
          }
        }
        return { front: front, back: back };
      }
    };

    var state = spec.build(ctx) || {};
    ctx.state = state;

    // ---- driver
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var p = 0, playing = !reduce, last = null;
    var DURATION = spec.duration || 18000;

    function setScrubUI(v) {
      scrub.value = Math.round(v * 1000);
      scrub.style.setProperty('--fill', (v * 100).toFixed(1) + '%');
      scrubLabel.textContent = Math.round(v * 100) + '%';
    }

    function draw(v) {
      spec.render(ctx, v);
      for (var i = 0; i < logEls.length; i++) {
        logEls[i].classList.toggle('on', v >= spec.log[i].p);
      }
    }

    function setPlaying(on) {
      playing = on;
      btnPlay.textContent = on ? 'Pause' : 'Play';
      btnPlay.setAttribute('aria-pressed', String(on));
      if (on) last = null;
    }

    function apply(v, fromUser) {
      p = clamp01(v);
      draw(p);
      setScrubUI(p);
      if (fromUser && playing) setPlaying(false);
    }

    // Several studies share one page, and each one drives a few hundred
    // attribute writes per frame. Freezing the ones that are scrolled away
    // keeps the page cheap and means a study is still at its opening frame
    // when the reader actually arrives at it.
    var onScreen = true;
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) last = null;      // drop the stale timestamp
      }, { rootMargin: '120px' }).observe(stage);
    }

    function frame(ts) {
      if (playing && onScreen) {
        if (last != null) {
          // requestAnimationFrame does not fire while the tab is hidden, so
          // without this clamp a viewer who switches away and comes back gets
          // one enormous delta and finds the piece already over.
          p += Math.min(ts - last, 100) / DURATION;
          if (p >= 1) { p = 1; setPlaying(false); }
          draw(p);
          setScrubUI(p);
        }
        last = ts;
      }
      requestAnimationFrame(frame);
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) last = null;
    });
    btnPlay.addEventListener('click', function () {
      if (p >= 1) p = 0;
      setPlaying(!playing);
    });
    btnReplay.addEventListener('click', function () {
      p = 0; draw(0); setScrubUI(0); setPlaying(true);
    });
    scrub.addEventListener('input', function () {
      apply(scrub.value / 1000, true);
    });

    if (reduce) {
      setPlaying(false);
      apply(spec.staticP == null ? 0.99 : spec.staticP);
    } else {
      draw(0);
      setScrubUI(0);
      requestAnimationFrame(frame);
    }

    return {
      id: spec.id, spec: spec, ctx: ctx, state: state,
      apply: apply, get p() { return p; }
    };
  }

  // Mount every registered study, or a named subset, into a host element.
  function mountAll(host, specs) {
    var mounted = {};
    specs.forEach(function (spec, i) {
      if (!spec.index) spec.index = 'Study ' + String(i + 1).padStart(2, '0');
      mounted[spec.id] = mount(host, spec);
    });
    return mounted;
  }

  return {
    mount: mount, mountAll: mountAll,
    mk: mk, DEG: DEG, dot: dot, rotator: rotator,
    clamp01: clamp01, lerp: lerp, win: win,
    easeInOut: easeInOut, easeOut: easeOut
  };
})();
