/* ==========================================================================
   Crop Circle Watch — app.js
   Reads the global `STORIES` array and `DASHBOARD_META` object defined in
   data.js. No build step — works from file:// or any static host. One
   exception: curated Bluesky posts (see "live chatter" below) load live via
   a single runtime `fetch()` to Bluesky's public oEmbed endpoint. That fetch
   is best-effort — if it fails (offline, blocked, opened from file://, etc.)
   the post falls back to a plain static card, so nothing else breaks.

   Renders: hero status line + "last formation" banner + hero stats, the
   three hero widgets (recent coverage / field footage / live chatter +
   customizable keyword search), the filter chips, the date-grouped feed,
   and the year/month/day timeline rail. Also wires up two scroll-driven
   behaviors: a compact/shrunk header once the hero scrolls past, and a
   rail that auto-highlights (and scrolls itself to) whichever day section
   is currently in view in the main feed.
   ========================================================================== */

(function () {
  'use strict';

  var stories = (Array.isArray(window.STORIES) ? window.STORIES.slice() : []);
  var meta = window.DASHBOARD_META || {};

  // The generated research-archive dataset (pre-current-season formations from
  // index/formations.json). Optional — the dashboard works without it.
  var history = (Array.isArray(window.HISTORY) ? window.HISTORY.slice() : []);

  // Non-formation coverage: documentaries, videos, podcasts, events, community
  // happenings. Optional — the coverage widget falls back to formation sources
  // alone if data.js predates this array.
  var coverage = (Array.isArray(window.COVERAGE) ? window.COVERAGE.slice() : []);

  // Standing discussion venues for the Discussion forums widget — Reddit plus
  // a couple of general paranormal-research forums (see data.js). Static
  // links: none of these platforms' content is CORS-readable from a static
  // site.
  var discussionForums = (Array.isArray(window.DISCUSSION_FORUMS) ? window.DISCUSSION_FORUMS.slice() : []);

  var sortNewestFirst = function (a, b) {
    return b.date.localeCompare(a.date) || (b.id || '').localeCompare(a.id || '');
  };

  // newest first, everywhere
  stories.sort(sortNewestFirst);
  history.sort(sortNewestFirst);

  // Curated feed + archive merged for the "All history" scope. Deduped by
  // formationId (a curated entry always wins over a generated one), then by id.
  // history.js already excludes the current season, so overlap is minimal.
  var allStories = (function () {
    if (!history.length) return stories;
    var seenFid = {}, seenId = {};
    stories.forEach(function (s) {
      if (s.formationId) seenFid[s.formationId] = true;
      seenId[s.id] = true;
    });
    var merged = stories.slice();
    history.forEach(function (h) {
      if (h.formationId && seenFid[h.formationId]) return;
      if (seenId[h.id]) return;
      merged.push(h);
    });
    merged.sort(sortNewestFirst);
    return merged;
  })();

  // Which dataset the TIMELINE (feed + rail + chips) draws from. The hero
  // widgets always stay on the curated `stories` — the toggle only reshapes the
  // chronological log below.
  function timelineStories() {
    return state.scope === 'all' ? allStories : stories;
  }

  var DEFAULT_KEYWORDS = (Array.isArray(meta.defaultKeywords) && meta.defaultKeywords.length)
    ? meta.defaultKeywords
    : ['crop circle 2026', 'Wiltshire crop circle', 'crop circle UK'];
  var KEYWORD_KEY = 'ccw_keywords';
  var KEYWORD_MAX = 8;

  var SOCIAL_POST_LIMIT = 6;
  var BSKY_OEMBED_ENDPOINT = 'https://embed.bsky.app/oembed';
  var BSKY_EMBED_SCRIPT = 'https://embed.bsky.app/static/embed.js';
  var BSKY_FETCH_TIMEOUT_MS = 7000;
  var bskyScriptLoaded = false;

  var state = { query: '', tag: 'all', scope: 'season' };
  var railIndex = {};
  var sectionObserver = null;
  var keywordState = getKeywordState();

  var els = {
    feed: document.getElementById('feed'),
    rail: document.getElementById('timelineRail'),
    chips: document.getElementById('filterChips'),
    search: document.getElementById('searchInput'),
    headerSearch: document.getElementById('headerSearchInput'),
    headerSearchForm: document.getElementById('headerSearchForm'),
    jumpLatest: document.getElementById('jumpLatest'),
    scopeToggle: document.getElementById('scopeToggle'),
    scrollCue: document.getElementById('scrollCue'),
    statTotal: document.getElementById('statTotal'),
    statSeason: document.getElementById('statSeason'),
    statScan: document.getElementById('statScan'),
    statusDot: document.getElementById('statusDot'),
    statusLabel: document.getElementById('statusLabel'),
    lfValue: document.getElementById('lfValue'),
    lfDays: document.getElementById('lfDays'),
    lfMedia: document.getElementById('lfMedia'),
    lfLocation: document.getElementById('lfLocation'),
    lfDesc: document.getElementById('lfDesc'),
    newsList: document.getElementById('newsList'),
    videoStrip: document.getElementById('videoStrip'),
    socialPosts: document.getElementById('socialPosts'),
    keywordChips: document.getElementById('keywordChips'),
    keywordForm: document.getElementById('keywordForm'),
    keywordInput: document.getElementById('keywordInput'),
    searchX: document.getElementById('searchX'),
    searchBsky: document.getElementById('searchBsky'),
    discussionForums: document.getElementById('discussionForums'),
    footerUpdated: document.getElementById('footerUpdated'),
    cardTemplate: document.getElementById('storyCardTemplate')
  };

  var MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  // -- date helpers -----------------------------------------------------
  // Dates in data.js are plain "YYYY-MM-DD" strings. Parse as local calendar
  // dates (not UTC) so a story dated 2026-06-15 doesn't shift to the 14th
  // in western-hemisphere timezones.
  function parseYMD(ymd) {
    var parts = ymd.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatShort(ymd) {
    var d = parseYMD(ymd);
    return MONTHS_FULL[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function formatHeading(ymd) {
    var d = parseYMD(ymd);
    return WEEKDAYS[d.getDay()] + ' · ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // Delegates to shared-chrome.js so all four pages render this identically.
  // It used to be implemented here as well as in page-chrome.js and
  // research-app.js; the copies drifted and two of them leaked a locale
  // connector into the string ("AUG 15 AT 7:06 AM"). One formatter now.
  function formatScanStamp(iso) {
    return (window.CCW && window.CCW.formatScanStamp)
      ? window.CCW.formatScanStamp(iso)
      : (iso || '\u2014');
  }

  // How many hours old the last scan is, or null if the stamp is missing/unparseable.
  // This is deliberately derived from the timestamp rather than trusting
  // lastScanStatus: a scan that dies before it can write data.js (expired OAuth,
  // missing CLI, machine asleep) leaves the *old* "ok" status in place forever,
  // so status alone can never report that class of failure. The clock can.
  function scanAgeHours(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return (Date.now() - d.getTime()) / 3600000;
  }

  function daysAgo(ymd) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var d = parseYMD(ymd);
    d.setHours(0, 0, 0, 0);
    return Math.round((today - d) / 86400000);
  }

  function formatDaysAgo(n) {
    if (n <= 0) return 'Today';
    if (n === 1) return 'Yesterday';
    return n + ' days ago';
  }

  // Compact relative time for social posts ("just now" / "5m ago" / "3h ago"
  // / "2d ago"), falling back to a plain date once a post is a week old.
  // Distinct from formatDaysAgo() above, which only handles whole calendar
  // days for formation dates.
  function formatRelativeTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.round(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return formatShort(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
  }

  // -- grouping -----------------------------------------------------------
  function groupByDate(list) {
    var map = {};
    var order = [];
    list.forEach(function (s) {
      if (!map[s.date]) { map[s.date] = []; order.push(s.date); }
      map[s.date].push(s);
    });
    order.sort(function (a, b) { return b.localeCompare(a); });
    return { order: order, map: map };
  }

  function buildRailTree(allDates) {
    // year -> month -> [dates] , each level newest-first
    var tree = {};
    var yearOrder = [];
    allDates.forEach(function (ymd) {
      var d = parseYMD(ymd);
      var y = d.getFullYear(), m = d.getMonth();
      if (!tree[y]) { tree[y] = { order: [], months: {} }; yearOrder.push(y); }
      if (!tree[y].months[m]) { tree[y].months[m] = []; tree[y].order.push(m); }
      tree[y].months[m].push(ymd);
    });
    yearOrder.sort(function (a, b) { return b - a; });
    yearOrder.forEach(function (y) { tree[y].order.sort(function (a, b) { return b - a; }); });
    return { tree: tree, years: yearOrder };
  }

  // -- tag chips ------------------------------------------------------------
  function collectTags(list) {
    var counts = {};
    list.forEach(function (s) {
      (s.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  }

  function renderChips() {
    var tags = collectTags(timelineStories()).slice(0, 7);
    var html = '<button type="button" class="chip' + (state.tag === 'all' ? ' active' : '') + '" data-tag="all">All</button>';
    tags.forEach(function (t) {
      html += '<button type="button" class="chip' + (state.tag === t ? ' active' : '') + '" data-tag="' + escapeAttr(t) + '">' + escapeHtml(t) + '</button>';
    });
    els.chips.innerHTML = html;
    Array.prototype.forEach.call(els.chips.querySelectorAll('.chip'), function (btn) {
      btn.addEventListener('click', function () {
        state.tag = btn.getAttribute('data-tag');
        render();
      });
    });
  }

  // -- filtering ------------------------------------------------------------
  function matchesFilter(s) {
    if (state.tag !== 'all' && (s.tags || []).indexOf(state.tag) === -1) return false;
    if (state.query) {
      // Aliases are part of the haystack: a merged formation is one card that
      // answers to every name it was reported under, so searching "Fox Hill"
      // must find the card titled "Wanborough Plain".
      var hay = [s.title, s.location, s.description, s.sourceName]
        .concat(s.aliases || [])
        .join(' • ').toLowerCase();
      if (hay.indexOf(state.query.toLowerCase()) === -1) return false;
    }
    return true;
  }

  // -- escaping ------------------------------------------------------------
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(str) { return escapeHtml(str); }

  // A link a visitor can actually open. Internal paths (e.g. sessions/*.md) are
  // provenance, not public, and must never render as a clickable card link.
  //
  // This is also the site's only guard against a hostile URL. Everything that
  // reaches an href here — references, source links, coverage items, social
  // posts — originates in data.js, which the unattended 6:58 scan writes from
  // third-party pages nobody reviews before they go live. A value like
  // `javascript:...` assigned to a.href executes on click, so the http(s)
  // prefix test is load-bearing, not just a tidiness check. Never assign an
  // href from data without passing it through here first.
  function isPublicUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  // -- media block ------------------------------------------------------------
  function buildMedia(story) {
    var wrap = document.createElement('div');
    if (story.youtubeId) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'media-thumb-btn';
      btn.setAttribute('aria-label', 'Play aerial footage of ' + story.title);
      btn.innerHTML =
        '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(story.youtubeId) + '/hqdefault.jpg" alt="" loading="lazy">' +
        '<span class="play-overlay"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-play"/></svg></span>';
      btn.addEventListener('click', function () {
        var iframe = document.createElement('iframe');
        // youtube-nocookie.com, not youtube.com: same player, but Google sets
        // no tracking cookie until the visitor actually plays something. The
        // thumbnail above is already click-to-play, so nothing from YouTube
        // loads for a visitor who never presses play.
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(story.youtubeId) + '?autoplay=1&rel=0';
        iframe.title = story.title;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        wrap.innerHTML = '';
        wrap.appendChild(iframe);
      }, { once: true });
      wrap.appendChild(btn);
    } else {
      // No footage yet — fall back to the site's own ring-logo mark (static,
      // so it stays light) rather than a generic icon.
      var ph = document.createElement('div');
      ph.className = 'media-placeholder';
      ph.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#icon-ring-logo"/></svg>';
      wrap.appendChild(ph);
    }
    return wrap;
  }

  // -- authenticity badge ----------------------------------------------------
  // Maps the research registry's evidentiary tag to a compact badge. The
  // "Unclassified" default is intentionally not shown (it's noise); the three
  // meaningful states get a colored pill so the card signals at a glance
  // whether a formation is a confirmed hoax, has anomaly evidence, or is
  // contested. Carried onto a story via the optional `authenticity` field.
  var AUTH_BADGE = {
    'Confirmed human-made':            { cls: 'auth-hoax',     label: 'Confirmed human-made' },
    'Unexplained (anomaly evidence)':  { cls: 'auth-anomaly',  label: 'Anomaly evidence' },
    'Contested':                       { cls: 'auth-contested', label: 'Contested' }
  };

  function buildAuthBadge(authenticity) {
    var spec = AUTH_BADGE[authenticity];
    if (!spec) return null;
    var span = document.createElement('span');
    span.className = 'auth-badge ' + spec.cls;
    span.textContent = spec.label;
    span.title = authenticity;
    return span;
  }

  // -- aliases ---------------------------------------------------------------
  // One formation, several names. When two aggregators file the same circle
  // under different names the entries are merged into a single record (see
  // dedupe.js / check_duplicates.js), and the names that lost render here so a
  // reader who knows it by the other name still recognises the card.
  function buildAliases(aliases) {
    var list = (aliases || []).filter(function (a) { return typeof a === 'string' && a.trim(); });
    if (!list.length) return null;
    var p = document.createElement('p');
    p.className = 'card-aliases';
    var lead = document.createElement('span');
    lead.className = 'card-aliases-lead';
    lead.textContent = 'Also reported as';
    p.appendChild(lead);
    p.appendChild(document.createTextNode(' ' + list.join(' · ')));
    return p;
  }

  // -- expandable detail panel -----------------------------------------------
  // A merged formation (see dedupe.js / data.js `aliases`) carries more than a
  // single-source one: two or three reports of the same circle, each with its
  // own link, plus any social posts. Rendering all of that inline made merged
  // cards markedly taller and noisier than their neighbours for information
  // most readers don't need up front. So it moves behind a "+" in the card's
  // top corner: collapsed by default, one click to open, "−" to close. Cards
  // with nothing extra get no button at all, which is what makes the button
  // meaningful — its presence is the signal that a formation has more behind it.
  function extraSourcesFor(story) {
    var refs = (story.references || []).filter(function (r) { return r && isPublicUrl(r.url); });
    var posts = (story.socialPosts || []).filter(function (p) { return p && isPublicUrl(p.url); });
    return { refs: refs, posts: posts };
  }

  function hasExtras(story) {
    var e = extraSourcesFor(story);
    return e.refs.length > 0 || e.posts.length > 0;
  }

  function buildDetailPanel(story, panelId) {
    var e = extraSourcesFor(story);
    var panel = document.createElement('div');
    panel.className = 'card-detail';
    panel.id = panelId;
    panel.hidden = true;

    if (e.refs.length) {
      var group = document.createElement('div');
      group.className = 'card-detail-group';
      var lead = document.createElement('p');
      lead.className = 'card-detail-lead';
      // Merged records genuinely have several independent reports; a single
      // source keeps the singular label.
      lead.textContent = e.refs.length > 1 ? 'Reported by' : 'Also available at';
      group.appendChild(lead);

      var list = document.createElement('ul');
      list.className = 'card-detail-list';
      e.refs.forEach(function (r) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = r.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = r.label || 'Reference';
        li.appendChild(a);
        list.appendChild(li);
      });
      group.appendChild(list);
      panel.appendChild(group);
    }

    if (e.posts.length) {
      var pg = document.createElement('div');
      pg.className = 'card-detail-group';
      var plead = document.createElement('p');
      plead.className = 'card-detail-lead';
      plead.textContent = 'Discussion';
      pg.appendChild(plead);
      var plist = document.createElement('ul');
      plist.className = 'card-detail-list';
      e.posts.forEach(function (p) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = p.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = (p.author || p.handle || (p.platform === 'bluesky' ? 'Bluesky post' : 'X post'));
        li.appendChild(a);
        plist.appendChild(li);
      });
      pg.appendChild(plist);
      panel.appendChild(pg);
    }

    return panel;
  }

  function buildExpandToggle(story, panel, panelId) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-expand';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panelId);
    var label = 'Show more about ' + story.title;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    // Drawn in CSS, not text, so the glyph stays optically centred and the
    // +/− swap can't reflow the button.
    btn.innerHTML = '<span class="card-expand-glyph" aria-hidden="true"></span>';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.hidden = open;
      var next = open ? ('Show more about ' + story.title) : ('Show less about ' + story.title);
      btn.setAttribute('aria-label', next);
      btn.title = next;
      btn.closest('.story-card').classList.toggle('is-expanded', !open);
    });

    return btn;
  }

  // -- card ------------------------------------------------------------
  function buildCard(story) {
    var node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.id = 'card-' + story.id;

    node.querySelector('.card-media').replaceWith(withClass(buildMedia(story), 'card-media'));

    var tagsEl = node.querySelector('.card-tags');
    var badge = buildAuthBadge(story.authenticity);
    if (badge) tagsEl.appendChild(badge);
    (story.tags || []).forEach(function (t) {
      var span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    var titleEl = node.querySelector('.card-title');
    titleEl.textContent = story.title;

    var aliasEl = buildAliases(story.aliases);
    if (aliasEl) titleEl.parentNode.insertBefore(aliasEl, titleEl.nextSibling);

    node.querySelector('.card-location span').textContent = story.location;
    node.querySelector('.card-desc').textContent = story.description;
    node.querySelector('.card-date span').textContent = formatShort(story.date);

    // Only show the Source link when there's a real, public URL to open — a
    // missing/internal one would be a dead link (e.g. backfilled historical
    // entries before the research agent adds real sources).
    var srcLink = node.querySelector('.card-source');
    if (isPublicUrl(story.sourceUrl)) {
      srcLink.href = story.sourceUrl;
      srcLink.querySelector('span').textContent = story.sourceName || 'Source';
    } else {
      srcLink.remove();
    }

    // Extra sources (a merged formation's other reports, plus any social posts)
    // live in a collapsed panel behind the "+" rather than always-on inline
    // links — see buildDetailPanel.
    if (hasExtras(story)) {
      var panelId = 'detail-' + story.id;
      var panel = buildDetailPanel(story, panelId);
      var footer = node.querySelector('.card-footer');
      footer.parentNode.insertBefore(panel, footer);
      node.appendChild(buildExpandToggle(story, panel, panelId));
    }

    return node;
  }

  function withClass(el, cls) { el.className = cls; return el; }

  // -- render feed ------------------------------------------------------------
  function renderFeed() {
    var visible = timelineStories().filter(matchesFilter);
    els.feed.innerHTML = '';

    if (visible.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-target"/></svg>' +
        '<h3>No formations match</h3>' +
        '<p>Try a different search term or clear the active filter.</p>';
      els.feed.appendChild(empty);
      observeSections();
      return;
    }

    var grouped = groupByDate(visible);
    grouped.order.forEach(function (ymd) {
      var section = document.createElement('section');
      section.className = 'day-section';
      section.id = 'day-' + ymd;

      var heading = document.createElement('div');
      heading.className = 'day-heading';
      var isToday = ymd === todayYMD();
      heading.innerHTML =
        '<h2>' + formatHeading(ymd) + '</h2><div class="rule"></div>' +
        (isToday ? '<span class="badge-new">TODAY</span>' : '');
      section.appendChild(heading);

      var grid = document.createElement('div');
      grid.className = 'cards-grid';
      grouped.map[ymd].forEach(function (story) { grid.appendChild(buildCard(story)); });
      section.appendChild(grid);

      els.feed.appendChild(section);
    });

    observeSections();
  }

  function todayYMD() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // -- render rail ------------------------------------------------------------
  function renderRail() {
    var railStories = timelineStories();
    var grouped = groupByDate(railStories);
    var countByDate = grouped.map;               // {ymd: [stories]} — computed once
    var built = buildRailTree(grouped.order);
    railIndex = {};
    els.rail.innerHTML = '';

    built.years.forEach(function (year) {
      var yearWrap = document.createElement('div');
      yearWrap.className = 'rail-year';

      var label = document.createElement('div');
      label.className = 'rail-year-label';
      label.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-chevron"/></svg><span>' + year + '</span>';
      yearWrap.appendChild(label);

      var monthsHolder = document.createElement('div');
      monthsHolder.className = 'rail-year-body';

      built.tree[year].order.forEach(function (m) {
        var monthWrap = document.createElement('div');
        monthWrap.className = 'rail-month';
        var mLabel = document.createElement('div');
        mLabel.className = 'rail-month-label';
        mLabel.textContent = MONTHS_FULL[m];
        monthWrap.appendChild(mLabel);

        // Day rows live in their own container so a CSS guide line can hang
        // them off the month above (see .rail-days in styles.css).
        var daysHolder = document.createElement('div');
        daysHolder.className = 'rail-days';

        built.tree[year].months[m].forEach(function (ymd) {
          var d = parseYMD(ymd);
          var count = countByDate[ymd].length;
          var row = document.createElement('div');
          row.className = 'rail-day';
          row.setAttribute('data-date', ymd);
          row.innerHTML = '<span>' + WEEKDAYS[d.getDay()] + ' ' + d.getDate() + '</span><span class="count">' + count + '</span>';
          row.addEventListener('click', function () { jumpToDate(ymd); });
          daysHolder.appendChild(row);
          railIndex[ymd] = row;
        });

        monthWrap.appendChild(daysHolder);
        monthsHolder.appendChild(monthWrap);
      });

      yearWrap.appendChild(monthsHolder);

      label.addEventListener('click', function () {
        label.classList.toggle('collapsed');
        monthsHolder.style.display = label.classList.contains('collapsed') ? 'none' : '';
      });

      els.rail.appendChild(yearWrap);
    });
  }

  function clearSearchInputs() {
    els.search.value = '';
    if (els.headerSearch) els.headerSearch.value = '';
  }

  function jumpToDate(ymd) {
    // Clear active filters so the target date is guaranteed to be visible,
    // then scroll its section into view.
    state.query = '';
    state.tag = 'all';
    clearSearchInputs();
    render();
    requestAnimationFrame(function () {
      var target = document.getElementById('day-' + ymd);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveRailDay(ymd);
    });
  }

  // Ids retired by a merge (data.js `mergedIds`) -> the surviving story. An old
  // link to #card-2026-07-21-fox-hill must still land on the Wanborough Plain
  // card rather than silently doing nothing.
  var mergedIds = (function () {
    var index = {};
    allStories.forEach(function (s) {
      (s.mergedIds || []).forEach(function (old) { index[old] = s.id; });
    });
    return index;
  })();

  function resolveStoryId(id) {
    return mergedIds[id] || id;
  }

  function jumpToStory(rawId) {
    var id = resolveStoryId(rawId);
    state.query = '';
    state.tag = 'all';
    clearSearchInputs();
    render();
    requestAnimationFrame(function () {
      var story = timelineStories().filter(function (s) { return s.id === id; })[0];
      var card = document.getElementById('card-' + id);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('flash');
        card.addEventListener('animationend', function handler() {
          card.classList.remove('flash');
          card.removeEventListener('animationend', handler);
        });
      }
      if (story) setActiveRailDay(story.date);
    });
  }

  function setActiveRailDay(ymd) {
    Object.keys(railIndex).forEach(function (key) {
      railIndex[key].classList.toggle('active', key === ymd);
    });
    var row = railIndex[ymd];
    if (row) scrollRailToRow(row);
  }

  function scrollRailToRow(row) {
    if (!row || !els.rail) return;
    var railRect = els.rail.getBoundingClientRect();
    var rowRect = row.getBoundingClientRect();
    var delta = (rowRect.top - railRect.top) - (railRect.height / 2) + (rowRect.height / 2);
    if (Math.abs(delta) < 4) return;
    if (typeof els.rail.scrollTo === 'function') {
      els.rail.scrollTo({ top: els.rail.scrollTop + delta, behavior: 'smooth' });
    } else {
      els.rail.scrollTop += delta;
    }
  }

  // -- scroll-spy: keep the rail synced with whichever day is on screen ----
  function observeSections() {
    if (!('IntersectionObserver' in window)) return;
    if (sectionObserver) sectionObserver.disconnect();
    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setActiveRailDay(entry.target.id.replace('day-', ''));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    Array.prototype.forEach.call(els.feed.querySelectorAll('.day-section'), function (sec) {
      sectionObserver.observe(sec);
    });
  }

  // -- compact header once the hero scrolls past ---------------------------
  // Toggling `body.compact` shrinks the sticky site header (less padding,
  // smaller logo/h1, tagline hidden), which changes the header's height and
  // therefore shifts every later element's position in the viewport —
  // including #heroSentinel itself, a 1px marker placed right after the
  // hero. An IntersectionObserver watching that sentinel with a zero
  // rootMargin sits exactly on the boundary where the layout shift happens:
  // compacting the header moves the page content (and the sentinel) up by
  // the header's height delta, which can flip the sentinel back across the
  // observer's threshold line, immediately un-compacting it — which
  // un-shrinks the header and pushes the sentinel across the line again.
  // That's an infinite toggle loop every frame (the scroll glitch/flicker).
  //
  // Fix: don't drive this off element intersection at all near the
  // boundary — drive it off a plain scrollY reading with hysteresis: two
  // distinct thresholds, ON well past the hero and OFF only once scrolled
  // back much closer to the top, with a gap between them far wider than the
  // header's compact/expanded height delta (a few tens of px). Since the
  // gap can't be closed by the height change alone, the state can only flip
  // in response to genuine user scrolling, never as feedback from its own
  // last toggle. A scroll listener (rAF-throttled) is the reliable way to
  // read scrollY on every frame; IntersectionObserver isn't needed here.
  function setupHeroSentinel() {
    var sentinel = document.getElementById('heroSentinel');
    if (!sentinel) return;

    var ON_AT = 320;   // scrollY past which compact turns ON
    var OFF_AT = 80;    // scrollY below which compact turns OFF
    // Gap (ON_AT - OFF_AT = 240px) is far larger than the header's
    // expanded/compact height delta, so toggling compact can never itself
    // push scrollY's *effective* position across the opposite threshold.

    var ticking = false;

    function apply() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      var isCompact = document.body.classList.contains('compact');
      if (!isCompact && y > ON_AT) {
        document.body.classList.add('compact');
      } else if (isCompact && y < OFF_AT) {
        document.body.classList.remove('compact');
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    apply(); // set correct initial state (e.g. on reload mid-page)
  }

  // -- hero: last confirmed formation banner --------------------------------
  function renderLastFormation() {
    if (!stories.length) {
      els.lfValue.textContent = 'No formations logged yet';
      els.lfDays.textContent = '—';
      if (els.lfLocation) els.lfLocation.style.display = 'none';
      if (els.lfDesc) els.lfDesc.textContent = '';
      return;
    }
    var latest = stories[0];
    els.lfValue.textContent = latest.title + ' — ' + formatShort(latest.date);
    els.lfDays.textContent = formatDaysAgo(daysAgo(latest.date));

    if (els.lfLocation) {
      var locSpan = els.lfLocation.querySelector('span');
      if (latest.location) {
        if (locSpan) locSpan.textContent = latest.location;
        els.lfLocation.style.display = '';
      } else {
        els.lfLocation.style.display = 'none';
      }
    }
    if (els.lfDesc) {
      els.lfDesc.textContent = latest.description || '';
      els.lfDesc.style.display = latest.description ? '' : 'none';
    }

    // Swap the placeholder div for a real thumbnail/video, same pattern
    // buildCard() uses for .card-media.
    if (els.lfMedia) {
      var fresh = withClass(buildMedia(latest), 'lf-media');
      fresh.id = 'lfMedia';
      els.lfMedia.replaceWith(fresh);
      els.lfMedia = fresh;
    }
  }

  // -- hero widget: recent coverage ------------------------------------------
  // Two sources feed one list: formation entries (STORIES, which carry a source
  // article) and standalone community coverage (COVERAGE — documentaries,
  // videos, podcasts, events). Both are normalised to a common shape, merged,
  // and sorted newest-first. The most recent few render as "lead" items with a
  // full summary paragraph; the tail stays as compact one-liners so the widget
  // gains depth at the top without becoming a wall of text.

  // Six, not seven: Recent coverage now has its own box in the 2x2 grid instead
  // of sharing Field footage's, and at full width seven items made it markedly
  // taller than everything beside it. The three leads keep their summaries.
  var NEWS_LIMIT = 6;
  var NEWS_LEAD_COUNT = 3;

  // Badge label + sprite icon per coverage kind. Anything unrecognised falls
  // back to the article treatment.
  var COVERAGE_KINDS = {
    article:     { label: 'Article',     icon: 'icon-doc' },
    video:       { label: 'Video',       icon: 'icon-play' },
    documentary: { label: 'Documentary', icon: 'icon-play' },
    podcast:     { label: 'Podcast',     icon: 'icon-rss' },
    event:       { label: 'Event',       icon: 'icon-calendar' },
    community:   { label: 'Community',   icon: 'icon-rss' }
  };

  function coverageKind(kind) {
    return COVERAGE_KINDS[String(kind || '').toLowerCase()] || COVERAGE_KINDS.article;
  }

  // COVERAGE ONLY — deliberately. This list used to be built from every STORIES
  // entry (each formation's own source page) with COVERAGE appended, which meant
  // "Recent coverage" was just the formation feed a second time: the same
  // titles, the same aggregator links, the same videos already embedded in
  // "Field footage" directly above it. A formation's own report page is not
  // coverage *about* the phenomenon, it IS the formation entry.
  // This widget now carries only genuine standalone coverage — articles, news,
  // documentaries, podcasts, events — from window.COVERAGE. If that array is
  // empty the widget renders its empty state, which is the honest outcome:
  // better to show nothing than to pad the list with the feed again.
  function coverageItems() {
    var items = [];
    coverage.forEach(function (c) {
      if (!c || !c.url || !c.date) return;
      items.push({
        id: c.id || c.url,
        date: c.date,
        kind: c.kind || 'article',
        title: c.title || '(untitled)',
        outlet: c.outlet || '',
        url: c.url,
        summary: c.summary || '',
        durationMin: c.durationMin
      });
    });
    items.sort(sortNewestFirst);
    return items.slice(0, NEWS_LIMIT);
  }

  function buildNewsItem(item, isLead) {
    var kind = coverageKind(item.kind);
    var li = document.createElement('li');
    li.className = 'news-item' + (isLead ? ' news-item--lead' : '');

    var a = document.createElement('a');
    // Coverage URLs come straight out of the scan; gate them like every other
    // data-supplied href (see isPublicUrl). An entry with a non-http URL still
    // renders — it just isn't clickable.
    if (isPublicUrl(item.url)) {
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }

    // Kind badge — only on lead items and on anything that isn't a plain
    // article, so the common case stays visually quiet.
    if (isLead || item.kind !== 'article') {
      var badge = document.createElement('span');
      badge.className = 'news-kind news-kind--' + escapeHtml(String(item.kind || 'article'));
      badge.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + kind.icon + '"/></svg>' +
        '<span>' + escapeHtml(kind.label) + '</span>';
      a.appendChild(badge);
    }

    var title = document.createElement('span');
    title.className = 'news-title';
    title.textContent = item.title;
    a.appendChild(title);

    if (isLead && item.summary) {
      var summary = document.createElement('p');
      summary.className = 'news-summary';
      summary.textContent = item.summary;
      a.appendChild(summary);
    }

    // Built as separate spans rather than one joined string so the date can be
    // tinted (.news-date) — in a uniformly grey meta line it was the hardest
    // part to pick out, and it's the part you scan for.
    var metaEl = document.createElement('span');
    metaEl.className = 'news-meta';
    var bits = [];
    if (item.outlet) bits.push({ text: item.outlet, cls: 'news-outlet' });
    bits.push({ text: formatShort(item.date), cls: 'news-date' });
    if (item.durationMin) bits.push({ text: item.durationMin + ' min', cls: 'news-dur' });
    bits.forEach(function (bit, bi) {
      if (bi) {
        var sep = document.createElement('span');
        sep.className = 'news-meta-sep';
        sep.textContent = '·';
        metaEl.appendChild(sep);
      }
      var span = document.createElement('span');
      span.className = bit.cls;
      span.textContent = bit.text;
      metaEl.appendChild(span);
    });
    a.appendChild(metaEl);

    li.appendChild(a);
    return li;
  }

  function renderNews() {
    var items = coverageItems();
    els.newsList.innerHTML = '';
    if (!items.length) {
      els.newsList.innerHTML = '<li class="empty-note">No coverage logged yet.</li>';
      return;
    }
    items.forEach(function (item, i) {
      els.newsList.appendChild(buildNewsItem(item, i < NEWS_LEAD_COUNT));
    });
  }

  // -- hero widget: field footage strip --------------------------------------
  function renderVideoStrip() {
    // Capped to 9 — a fixed 3x3 grid (see .video-strip's `repeat(3, 1fr)` in
    // styles.css). Field footage sits opposite Live chatter in the grid's top
    // row, and 12 thumbnails (4 rows) ran the box well past Live chatter's own
    // height, which is the box it's supposed to be balancing against, not
    // dwarfing. There are more than nine formations with footage, so nothing
    // is invented to fill the grid.
    var items = stories.filter(function (s) { return !!s.youtubeId; }).slice(0, 9);
    els.videoStrip.innerHTML = '';
    if (!items.length) {
      els.videoStrip.innerHTML = '<p class="empty-note">No footage logged yet.</p>';
      return;
    }
    items.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'video-thumb';
      btn.setAttribute('aria-label', 'Jump to ' + s.title);
      btn.innerHTML =
        '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(s.youtubeId) + '/hqdefault.jpg" alt="" loading="lazy">' +
        '<span class="video-thumb-overlay"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-play"/></svg></span>' +
        '<span class="video-thumb-label">' + escapeHtml(s.title) + '</span>';
      btn.addEventListener('click', function () { jumpToStory(s.id); });
      els.videoStrip.appendChild(btn);
    });
  }

  // -- hero widget: live chatter (curated posts) -----------------------------
  // Bluesky posts auto-load as real live embeds via Bluesky's public oEmbed
  // endpoint (https://embed.bsky.app/oembed) — no click required, and no
  // fabricated content: this only ever activates for posts a human (or the
  // scan) has verified and added to data.js. X posts render as a static rich
  // card instead, since reliable client-side X embeds aren't realistic in
  // 2026 (full rationale in data.js's schema comment). If a post can't be
  // confirmed it simply never appears — open-ended keyword search stays a
  // one-tap external link below, since that genuinely can't be embedded
  // live on either platform without a backend.

  function isBluesky(platform) {
    var p = String(platform || '').toLowerCase();
    return p === 'bluesky' || p === 'bsky';
  }

  function ensureBskyEmbedScript() {
    if (bskyScriptLoaded) return;
    bskyScriptLoaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = BSKY_EMBED_SCRIPT;
    script.charset = 'utf-8';
    document.body.appendChild(script);
  }

  // Static rich card used for every X post, and as the fallback for any
  // Bluesky post whose live embed fails to load (offline, blocked, etc.).
  function buildSocialCardBody(p) {
    var body = document.createElement('div');
    body.className = 'social-card-body';
    if (p.author || p.handle) {
      var authorRow = document.createElement('div');
      authorRow.className = 'social-author';
      if (p.author) {
        var name = document.createElement('span');
        name.className = 'social-author-name';
        name.textContent = p.author;
        authorRow.appendChild(name);
      }
      if (p.handle) {
        var handle = document.createElement('span');
        handle.className = 'social-author-handle';
        handle.textContent = p.handle;
        authorRow.appendChild(handle);
      }
      body.appendChild(authorRow);
    }
    if (p.text) {
      var text = document.createElement('p');
      text.className = 'social-text';
      text.textContent = p.text;
      body.appendChild(text);
    }
    var link = document.createElement('a');
    link.className = 'social-view-link';
    link.href = p.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View on ' + (isBluesky(p.platform) ? 'Bluesky' : 'X') + ' →';
    body.appendChild(link);
    return body;
  }

  // Fetches Bluesky's oEmbed JSON for a known post URL and swaps the
  // skeleton placeholder for the real embed HTML Bluesky returns (a
  // <blockquote>, auto-upgraded into a live iframe once embed.js runs).
  // Any failure — network, timeout, CORS when opened from file:// — falls
  // back to the same static card an X post would get, so the widget never
  // shows a broken or stuck state.
  function loadBlueskyEmbed(url, slot, buildFallback) {
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, BSKY_FETCH_TIMEOUT_MS) : null;
    var endpoint = BSKY_OEMBED_ENDPOINT + '?url=' + encodeURIComponent(url) + '&format=json';

    fetch(endpoint, controller ? { signal: controller.signal } : undefined)
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) throw new Error('oEmbed request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.html) throw new Error('oEmbed response missing html');
        var holder = document.createElement('div');
        holder.innerHTML = data.html;
        var blockquote = holder.querySelector('blockquote.bluesky-embed');
        if (!blockquote) throw new Error('oEmbed response missing blockquote');
        slot.classList.remove('social-skeleton');
        slot.classList.add('social-embed-wrap');
        slot.innerHTML = '';
        slot.appendChild(blockquote);
        ensureBskyEmbedScript();
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        slot.classList.remove('social-skeleton');
        slot.innerHTML = '';
        slot.appendChild(buildFallback());
      });
  }

  // Two sources feed this widget, and they are not equivalent:
  //
  //   1. story.socialPosts — hand-checked and tied to a specific formation.
  //      Scarce, but the good stuff, so these sort first.
  //   2. window.SOCIAL_FEED — public Bluesky chatter fetched at build time by
  //      dashboard/fetch_social.py during the daily scan. Nobody verified it,
  //      it belongs to no formation, and the card is labelled accordingly.
  //
  // A static site cannot query Bluesky itself without shipping the request to
  // every visitor, so the fetch happens once at scan time and lands in
  // social.js. See TODO.md item 5b.
  function collectFeedPosts() {
    var feed = window.SOCIAL_FEED;
    if (!feed || !Array.isArray(feed.posts)) return [];
    var seen = {};
    return feed.posts.filter(function (p) {
      if (!p || !isPublicUrl(p.url) || seen[p.url]) return false;
      seen[p.url] = true;
      return true;
    }).map(function (p) {
      return {
        story: null,
        platform: p.platform,
        url: p.url,
        author: p.author,
        handle: p.handle,
        text: p.text,
        postedAt: p.postedAt
      };
    });
  }

  function renderSocialPosts() {
    var posts = [];
    stories.forEach(function (s) {
      (s.socialPosts || []).forEach(function (p) {
        posts.push({
          story: s,
          platform: p.platform,
          url: p.url,
          author: p.author,
          handle: p.handle,
          text: p.text,
          postedAt: p.postedAt
        });
      });
    });

    // Verified-and-attached first, then chatter newest-first behind it.
    var feedPosts = collectFeedPosts().sort(function (a, b) {
      return String(b.postedAt || '').localeCompare(String(a.postedAt || ''));
    });
    posts = posts.concat(feedPosts);

    els.socialPosts.innerHTML = '';

    if (!posts.length) {
      var empty = document.createElement('div');
      empty.className = 'social-empty';
      empty.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-rss"/></svg>' +
        '<p><strong>Nothing to show yet.</strong> The daily scan checks again tomorrow — try a keyword search below in the meantime.</p>';
      els.socialPosts.appendChild(empty);
      return;
    }

    posts.slice(0, SOCIAL_POST_LIMIT).forEach(function (p) {
      var card = document.createElement('article');
      card.className = 'social-card';

      var head = document.createElement('div');
      head.className = 'social-card-head';

      var platformTag = document.createElement('span');
      platformTag.className = 'social-platform';
      platformTag.textContent = isBluesky(p.platform) ? 'bluesky' : 'x';
      head.appendChild(platformTag);

      var statusTag = document.createElement('span');
      if (!p.story) {
        // Chatter. Say so plainly — this is the one label on the page
        // attached to content nobody checked.
        statusTag.className = 'social-curated-tag';
        statusTag.textContent = 'unverified';
      } else if (isBluesky(p.platform)) {
        statusTag.className = 'social-live-tag';
        statusTag.textContent = 'auto-loads live';
      } else {
        statusTag.className = 'social-curated-tag';
        statusTag.textContent = 'curated';
      }
      head.appendChild(statusTag);

      var when = formatRelativeTime(p.postedAt);
      if (when) {
        var time = document.createElement('span');
        time.className = 'social-time';
        time.textContent = when;
        head.appendChild(time);
      }
      card.appendChild(head);

      // Feed posts belong to no formation, so there is nothing to jump to.
      if (p.story) {
        var mention = document.createElement('button');
        mention.type = 'button';
        mention.className = 'social-mention-link';
        mention.textContent = 'Mentions of ' + p.story.title;
        mention.addEventListener('click', function () { jumpToStory(p.story.id); });
        card.appendChild(mention);
      }

      if (isBluesky(p.platform)) {
        var slot = document.createElement('div');
        slot.className = 'social-embed-slot social-skeleton';
        card.appendChild(slot);
        loadBlueskyEmbed(p.url, slot, function () { return buildSocialCardBody(p); });
      } else {
        card.appendChild(buildSocialCardBody(p));
      }

      els.socialPosts.appendChild(card);
    });
  }

  // -- hero widget: customizable keyword search ------------------------------
  function getKeywordState() {
    try {
      var raw = window.localStorage.getItem(KEYWORD_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) { /* localStorage unavailable — fall back to defaults */ }
    return DEFAULT_KEYWORDS.slice();
  }

  function persistKeywords(list) {
    try { window.localStorage.setItem(KEYWORD_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function renderKeywordChips() {
    els.keywordChips.innerHTML = '';
    keywordState.forEach(function (kw) {
      var chip = document.createElement('span');
      chip.className = 'keyword-chip';
      var label = document.createElement('span');
      label.textContent = kw;
      chip.appendChild(label);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove ' + kw);
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-close"/></svg>';
      btn.addEventListener('click', function () {
        keywordState = keywordState.filter(function (k) { return k !== kw; });
        persistKeywords(keywordState);
        renderKeywordChips();
        updateSearchLinks();
      });
      chip.appendChild(btn);
      els.keywordChips.appendChild(chip);
    });
  }

  function updateSearchLinks() {
    var query = keywordState.length ? keywordState.join(' OR ') : 'crop circle';
    var encoded = encodeURIComponent(query);
    els.searchX.href = 'https://x.com/search?q=' + encoded + '&src=typed_query&f=live';
    els.searchBsky.href = 'https://bsky.app/search?q=' + encoded;
  }

  // -- hero widget: discussion forums -----------------------------------------
  // Standing discussion venues, not a live feed. None of these platforms'
  // content is CORS-readable from a static origin, so these are one-tap entry
  // points into the ongoing conversation rather than embedded posts.
  function renderDiscussionForums() {
    if (!els.discussionForums) return;
    els.discussionForums.innerHTML = '';
    if (!discussionForums.length) {
      // Hide the whole widget, not an inner block: Discussion forums is now a
      // top-level section in the widget grid rather than a .reddit-block tucked
      // inside Live chatter, and an empty bordered box reads as a broken panel.
      var section = els.discussionForums.closest('.widget');
      if (section) section.hidden = true;
      return;
    }
    discussionForums.forEach(function (f) {
      if (!f || !isPublicUrl(f.url) || !f.name) return;
      var a = document.createElement('a');
      a.className = 'forum-link';
      a.href = f.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var name = document.createElement('span');
      name.className = 'forum-link-name';
      name.textContent = f.name;
      a.appendChild(name);
      if (f.note) {
        var note = document.createElement('span');
        note.className = 'forum-link-note';
        note.textContent = f.note;
        a.appendChild(note);
      }
      els.discussionForums.appendChild(a);
    });
  }

  function wireKeywordForm() {
    els.keywordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = els.keywordInput.value.trim();
      if (!val) return;
      var exists = keywordState.some(function (k) { return k.toLowerCase() === val.toLowerCase(); });
      if (!exists && keywordState.length < KEYWORD_MAX) {
        keywordState.push(val);
        persistKeywords(keywordState);
        renderKeywordChips();
        updateSearchLinks();
      }
      els.keywordInput.value = '';
    });
  }

  // -- always land at the true top on load/refresh --------------------------
  // A lingering "#hero" hash (left over from clicking the Dashboard nav link,
  // or from browser scroll-restoration on reload) combined with the sticky
  // header's own flow height means the browser's native anchor-scroll lands
  // the viewport just *below* the header instead of at the real top of the
  // document. Force it back to (0,0) on load unless the hash is a deliberate
  // deep link (the timeline section, a specific day, or a specific card).
  function isDeepLinkHash(hash) {
    return hash === '#timeline' || /^#(day-|card-)/.test(hash);
  }

  // NOTE: `history` at this scope is the research-archive array (window.HISTORY),
  // not the browser's History API — always spell out `window.history` in here.
  function setupTopScroll() {
    if ('scrollRestoration' in window.history) {
      try { window.history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
    }
    if (!isDeepLinkHash(window.location.hash)) {
      window.scrollTo(0, 0);
      if (window.location.hash) {
        // Clearing the hash here (not just in the click handler below) is
        // the part that was missing: Chrome/Firefox keep re-running their
        // own fragment-scroll on every layout shift for as long as the URL
        // still has a matching "#hero" and the page hasn't fully settled —
        // a webfont swap or a late image landing is enough to trigger one.
        // That native re-scroll ignores this correction entirely (it's not
        // our code re-running), so it can put the header back over the hero
        // content a few hundred ms after this line runs. With no hash left
        // to re-anchor to, it has nothing to retry. Reproduced by
        // navigating research.html -> click "Dashboard": readyState was
        // already "complete" and scrollY had drifted back to exactly the
        // header's height (126px) before this fix — a single corrective
        // scroll on script execution is not sufficient on its own.
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        // Belt-and-braces: run the same correction again once every
        // resource (fonts included) has finished loading, in case a shift
        // still manages to land between the line above and `load`.
        window.addEventListener('load', function () { window.scrollTo(0, 0); }, { once: true });
      }
    }
    var navDashboard = document.getElementById('navDashboard');
    if (navDashboard) {
      navDashboard.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      });
    }
  }

  // A #card- link pointing at an id retired by a merge (data.js `mergedIds`)
  // has no element to scroll to, so the browser's native anchor jump silently
  // does nothing. Rewrite the hash to the surviving card and jump there. Runs
  // AFTER the first render — jumping before the feed exists would be undone by
  // that render.
  function resolveMergedHash() {
    var m = /^#card-(.+)$/.exec(window.location.hash);
    if (!m) return;
    var requested = decodeURIComponent(m[1]);
    var target = resolveStoryId(requested);
    if (target === requested) return;
    window.history.replaceState(
      null, '', window.location.pathname + window.location.search + '#card-' + target);
    jumpToStory(target);
  }

  // -- hero stats + footer ------------------------------------------------------------
  function renderStats() {
    els.statTotal.textContent = String(stories.length);

    var seasonYear = stories.length ? parseYMD(stories[0].date).getFullYear() : null;
    var seasonCount = seasonYear === null ? 0 : stories.filter(function (s) {
      return parseYMD(s.date).getFullYear() === seasonYear;
    }).length;
    els.statSeason.textContent = String(seasonCount);

    var scanStamp = formatScanStamp(meta.lastScan);
    var scanStatus = meta.lastScanStatus || 'ok';

    // The scan runs daily, so anything past ~36h means it stopped running (or
    // stopped being able to write) — treat that as an error no matter what the
    // stored status claims. Without this the dashboard happily shows a
    // week-old timestamp with no warning at all.
    var ageHours = scanAgeHours(meta.lastScan);
    var isStale = ageHours !== null && ageHours > 36;
    if (isStale && scanStatus !== 'flagged') {
      scanStatus = 'stale';
    }

    var needsAttention = scanStatus === 'error' || scanStatus === 'flagged' || scanStatus === 'stale';
    // Shared between the header chip and the footer so the two can't describe
    // the same scan differently.
    var statusLabel = scanStatus === 'stale'
      ? 'no scan in ' + Math.floor(ageHours / 24) + 'd'
      : scanStatus;

    // The header stamp is always the plain timestamp in the theme green. It
    // used to turn amber and append a "(no scan in 2d)" label, which made the
    // busiest corner of the page also the loudest. The staleness signal itself
    // is NOT lost — it still drives the hero's "Monitoring stalled" state (with
    // an amber pulse dot) and the footer stamp below, which is one clear alarm
    // instead of the same warning repeated in three places.
    els.statScan.textContent = scanStamp;
    // The footer block carries its own "Last scan" <dt>, so the value here is
    // just the stamp — the status suffix is only added when it needs attention.
    els.footerUpdated.textContent = scanStamp + (needsAttention ? ' (' + statusLabel + ')' : '');
    els.footerUpdated.classList.toggle('scan-warn', needsAttention);

    // The hero's green pulse claimed "Monitoring active" through a week of
    // failed scans. Tie it to the same staleness signal so the loudest thing
    // on the page can't contradict the timestamp right next to it.
    if (els.statusDot && els.statusLabel) {
      var monitoringDown = scanStatus === 'stale' || scanStatus === 'error';
      els.statusDot.classList.toggle('pulse-dot--warn', monitoringDown);
      els.statusLabel.classList.toggle('scan-warn', monitoringDown);
      els.statusLabel.textContent = monitoringDown
        ? 'Monitoring stalled'
        : 'Monitoring active';
    }
  }

  // -- wire controls ------------------------------------------------------------
  // Main dashboard search and the header search share one query — typing in
  // either box updates the other so they never fall out of sync.
  function syncSearch(value, source) {
    state.query = value;
    if (source !== els.search) els.search.value = value;
    if (els.headerSearch && source !== els.headerSearch) els.headerSearch.value = value;
    renderFeed();
  }

  function wireControls() {
    els.search.addEventListener('input', function () {
      syncSearch(els.search.value.trim(), els.search);
    });
    if (els.headerSearch) {
      els.headerSearch.addEventListener('input', function () {
        syncSearch(els.headerSearch.value.trim(), els.headerSearch);
      });
    }
    if (els.headerSearchForm) {
      els.headerSearchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var target = document.getElementById('timeline');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    els.jumpLatest.addEventListener('click', function () {
      var grouped = groupByDate(timelineStories().filter(matchesFilter));
      if (grouped.order.length) jumpToDate(grouped.order[0]);
    });
    wireScopeToggle();
    if (els.scrollCue) {
      els.scrollCue.addEventListener('click', function () {
        var target = document.getElementById('timeline');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // -- timeline scope toggle: "This season" (curated feed) vs "All history"
  // (curated + research archive merged). Only reshapes the timeline; the hero
  // stays on the curated feed. Hidden entirely when there's no history dataset.
  function wireScopeToggle() {
    if (!els.scopeToggle) return;
    if (!history.length) { els.scopeToggle.style.display = 'none'; return; }
    var btns = els.scopeToggle.querySelectorAll('.scope-btn');
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener('click', function () {
        var scope = btn.getAttribute('data-scope');
        if (scope === state.scope) return;
        state.scope = scope;
        Array.prototype.forEach.call(btns, function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        renderRail();   // the rail spans a different date range now
        render();
      });
    });
  }

  // -- main render ------------------------------------------------------------
  function render() {
    renderChips();
    renderFeed();
  }

  // Accept an incoming search from another page (the About page's header
  // search links here as index.html?q=…#timeline). Pre-fills the query so the
  // timeline lands already filtered.
  function applyQueryParam() {
    var m = /[?&]q=([^&#]*)/.exec(window.location.search);
    if (!m) return;
    var q = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
    if (!q) return;
    state.query = q;
    if (els.search) els.search.value = q;
    if (els.headerSearch) els.headerSearch.value = q;
  }

  setupTopScroll();
  applyQueryParam();
  renderStats();
  renderLastFormation();
  renderRail();
  renderNews();
  renderVideoStrip();
  renderSocialPosts();
  renderKeywordChips();
  updateSearchLinks();
  renderDiscussionForums();
  wireKeywordForm();
  wireControls();
  setupHeroSentinel();
  render();
  resolveMergedHash();
})();
