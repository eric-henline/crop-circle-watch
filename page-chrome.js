/* ==========================================================================
   page-chrome.js — shared header/footer behaviour for the secondary pages.

   about.html and resources.html each carried an identical inline <script>
   doing exactly this. They were pulled out into one file for two reasons:
   the duplication was already drifting, and an inline script forces a CSP
   to allow 'unsafe-inline' for scripts, which throws away most of the
   protection the policy exists to give. Every script on the site is now an
   external file, so script-src can stay 'self' plus the one embed host.

   index.html (app.js) and research.html (research-app.js) do their own
   version of this inside their page scripts; this file is only for the
   pages that have no script of their own.
   ========================================================================== */
(function () {
  'use strict';

  var meta = window.DASHBOARD_META || {};

  // Same stamp feeds the header chip and the footer status block.
  if (meta.lastScan) {
    var stamp;
    try {
      stamp = new Intl.DateTimeFormat(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric',
        minute: '2-digit', timeZoneName: 'short'
      }).format(new Date(meta.lastScan)).toUpperCase();
    } catch (e) { stamp = meta.lastScan; }
    ['statScan', 'footerUpdated'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = stamp;
    });
  }

  var form = document.getElementById('headerSearchForm');
  var input = document.getElementById('headerSearchInput');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (input && input.value.trim()) || '';
      window.location.href = 'index.html' + (q ? '?q=' + encodeURIComponent(q) : '') + '#timeline';
    });
  }
})();
