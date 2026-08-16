/* ==========================================================================
   shared-chrome.js — behaviour every page's header needs, in one place.

   Two jobs: the "Last scan" timestamp formatter, and keeping the brand mark's
   rotation continuous across page navigations. Both exist because the site is
   four separate documents that are meant to read as one application, and both
   were previously either duplicated or simply broken by that fact.

   ---------------------------------------------------------------------------
   1. The "Last scan" timestamp.

   Every page shows this stamp in the header chip and again in the footer, and
   until now three files each formatted it themselves. Two of them called
   Intl's `.format()`, which is where the bug came from: for an en-US
   date+time skeleton, newer ICU (Safari, and Chrome from CLDR 42 on) joins the
   two halves with a literal connector — "Aug 15 at 7:06 AM PDT". Uppercased,
   that is the stray "AT" that showed on some pages and not others, depending
   only on which script happened to render that page.

   `formatToParts` is the fix and the reason this file exists: it hands back
   typed fields, so we assemble month/day/hour/minute/dayPeriod/zone ourselves
   and never copy a locale's connector literal through. Same output on every
   engine.

   Renders in the viewer's own timezone — a static site has no other option —
   but names that zone rather than silently implying the reader's own.

   Load this BEFORE app.js / research-app.js / page-chrome.js on any page that
   shows the stamp.
   ========================================================================== */
(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatScanStamp(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    try {
      var parts = new Intl.DateTimeFormat(undefined, {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
        timeZoneName: 'short'
      }).formatToParts(d);
      var f = {};
      parts.forEach(function (p) { f[p.type] = p.value; });
      if (f.month && f.day && f.hour && f.minute) {
        return f.month.toUpperCase() + ' ' + f.day + ', ' +
               f.hour + ':' + f.minute +
               (f.dayPeriod ? ' ' + f.dayPeriod : '') +
               (f.timeZoneName ? ' ' + f.timeZoneName : '');
      }
    } catch (e) { /* fall through */ }

    // No Intl: same shape, no zone name (there is no way to get one here).
    var hh = d.getHours(), mm = d.getMinutes();
    var ampm = hh >= 12 ? 'PM' : 'AM';
    var hh12 = hh % 12 || 12;
    return MONTHS[d.getMonth()].toUpperCase() + ' ' + d.getDate() + ', ' +
           hh12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ampm;
  }

  // Writes the stamp into the header chip and the footer block, which is what
  // all three callers did with it anyway.
  function paintScanStamp(iso) {
    var stamp = formatScanStamp(iso);
    ['statScan', 'footerUpdated'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = stamp;
    });
    return stamp;
  }

  // -------------------------------------------------------------------------
  // 2. Brand-mark spin continuity.
  //
  // The logo is a 13s infinite rotation. Every nav click is a full document
  // load, so the animation restarted from 0deg each time and the mark visibly
  // snapped back — the one piece of the header that made the site feel like
  // four documents instead of one.
  //
  // Fix: remember when the spin conceptually began, and give the element a
  // NEGATIVE animation-delay equal to however far into the current cycle we
  // are. CSS then starts it mid-cycle and the rotation looks unbroken from
  // page to page. sessionStorage rather than localStorage: the continuity
  // should last a visit, not reach back to one last week.
  var SPIN_SECONDS = 13;

  function resumeBrandSpin() {
    var mark = document.querySelector('.brand-mark');
    if (!mark) return;
    // A reader who asked for less motion gets none; do not hand them a
    // mid-cycle offset for an animation the stylesheet has already killed.
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var started;
    try {
      started = parseFloat(sessionStorage.getItem('ccwSpinStart'));
      if (!started || isNaN(started)) {
        started = Date.now();
        sessionStorage.setItem('ccwSpinStart', String(started));
      }
    } catch (e) {
      // Private mode / storage disabled: no continuity, but no error either.
      return;
    }
    var elapsed = (Date.now() - started) / 1000;
    mark.style.animationDelay = '-' + (elapsed % SPIN_SECONDS).toFixed(3) + 's';
  }

  // Paint the stamp here rather than leaving it to each page script. It is
  // header furniture that every page carries, and making it a page-script job
  // is how timeline.html shipped with an em-dash placeholder in the header:
  // app.js only painted it as a side effect of renderStats(), which that page
  // has no markup for. Page scripts may still refine it afterwards (index.html
  // appends a staleness note to the footer copy).
  function start() {
    var meta = window.DASHBOARD_META || {};
    if (meta.lastScan) paintScanStamp(meta.lastScan);
    resumeBrandSpin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.CCW = window.CCW || {};
  window.CCW.formatScanStamp = formatScanStamp;
  window.CCW.paintScanStamp = paintScanStamp;
})();
