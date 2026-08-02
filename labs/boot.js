/* ==========================================================================
   labs/boot.js — mounts whichever study a lab page asks for.

   Each lab page used to end in its own three-line inline <script>. They are
   replaced by one declarative attribute on the mount point:

       <div id="studies" data-study="all"></div>
       <div id="studies" data-study="hexcube" data-index="Study 01"></div>

   The reason is CSP: an inline script anywhere on the site means script-src
   has to allow 'unsafe-inline', which is the single directive that matters
   most for stopping injected script. With every script external, the labs
   pages inherit the same strict policy as the rest of the site.

   Loads after anim-engine.js and studies.js, which define window.ANIM and
   window.STUDIES.
   ========================================================================== */
(function () {
  'use strict';

  var host = document.getElementById('studies');
  if (!host || !window.ANIM || !window.STUDIES) return;

  var which = host.getAttribute('data-study') || 'all';

  if (which === 'all') {
    window.__STUDIES = window.ANIM.mountAll(host, window.STUDIES.all);
    return;
  }

  // A single study. studies.js owns the spec so the single-view page and the
  // comparison page can never drift apart — which is exactly what happened
  // back when each animation carried its own copy of the engine.
  var spec = window.STUDIES[which];
  if (!spec) return;

  var index = host.getAttribute('data-index');
  if (index) spec.index = index;

  window.__STUDY = window.ANIM.mount(host, spec);
})();
