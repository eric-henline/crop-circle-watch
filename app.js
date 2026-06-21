/* ==========================================================================
   Crop Circle Watch — app.js
   Reads the global `STORIES` array and `DASHBOARD_META` object defined in
   data.js (no fetch, no build step — works from file:// or any static host).
   Renders: HUD stats, filter chips, date-grouped feed, year/month/day rail.
   ========================================================================== */

(function () {
  'use strict';

  var stories = (Array.isArray(window.STORIES) ? window.STORIES.slice() : []);
  var meta = window.DASHBOARD_META || {};

  // newest first, everywhere
  stories.sort(function (a, b) { return b.date.localeCompare(a.date) || (b.id || '').localeCompare(a.id || ''); });

  var state = { query: '', tag: 'all' };

  var els = {
    feed: document.getElementById('feed'),
    rail: document.getElementById('timelineRail'),
    chips: document.getElementById('filterChips'),
    search: document.getElementById('searchInput'),
    jumpLatest: document.getElementById('jumpLatest'),
    statTotal: document.getElementById('statTotal'),
    statLatest: document.getElementById('statLatest'),
    statScan: document.getElementById('statScan'),
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

  function formatScanStamp(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var hh = d.getHours(), mm = d.getMinutes();
    var ampm = hh >= 12 ? 'PM' : 'AM';
    var hh12 = hh % 12; if (hh12 === 0) hh12 = 12;
    var mmStr = (mm < 10 ? '0' : '') + mm;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + hh12 + ':' + mmStr + ' ' + ampm;
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
    var tags = collectTags(stories).slice(0, 7);
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
      var hay = [s.title, s.location, s.description, s.sourceName].join(' • ').toLowerCase();
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
        iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(story.youtubeId) + '?autoplay=1&rel=0';
        iframe.title = story.title;
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        wrap.innerHTML = '';
        wrap.appendChild(iframe);
      }, { once: true });
      wrap.appendChild(btn);
    } else {
      var ph = document.createElement('div');
      ph.className = 'media-placeholder';
      ph.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-wheat"/></svg>';
      wrap.appendChild(ph);
    }
    return wrap;
  }

  // -- card ------------------------------------------------------------
  function buildCard(story) {
    var node = els.cardTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector('.card-media').replaceWith(withClass(buildMedia(story), 'card-media'));

    var tagsEl = node.querySelector('.card-tags');
    (story.tags || []).forEach(function (t) {
      var span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    node.querySelector('.card-title').textContent = story.title;
    node.querySelector('.card-location span').textContent = story.location;
    node.querySelector('.card-desc').textContent = story.description;
    node.querySelector('.card-date span').textContent = formatShort(story.date);

    var srcLink = node.querySelector('.card-source');
    srcLink.href = story.sourceUrl;
    srcLink.querySelector('span').textContent = story.sourceName || 'Source';

    return node;
  }

  function withClass(el, cls) { el.className = cls; return el; }

  // -- render feed ------------------------------------------------------------
  function renderFeed() {
    var visible = stories.filter(matchesFilter);
    els.feed.innerHTML = '';

    if (visible.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-target"/></svg>' +
        '<h3>No formations match</h3>' +
        '<p>Try a different search term or clear the active filter.</p>';
      els.feed.appendChild(empty);
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
  }

  function todayYMD() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // -- render rail ------------------------------------------------------------
  function renderRail() {
    var allDates = groupByDate(stories).order;
    var built = buildRailTree(allDates);
    els.rail.innerHTML = '';

    built.years.forEach(function (year, yi) {
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

        built.tree[year].months[m].forEach(function (ymd) {
          var d = parseYMD(ymd);
          var count = groupByDate(stories).map[ymd].length;
          var row = document.createElement('div');
          row.className = 'rail-day';
          row.setAttribute('data-date', ymd);
          row.innerHTML = '<span>' + WEEKDAYS[d.getDay()] + ' ' + d.getDate() + '</span><span class="count">' + count + '</span>';
          row.addEventListener('click', function () { jumpToDate(ymd); });
          monthWrap.appendChild(row);
        });

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

  function jumpToDate(ymd) {
    // Clear active filters so the target date is guaranteed to be visible,
    // then scroll its section into view.
    state.query = '';
    state.tag = 'all';
    els.search.value = '';
    render();
    requestAnimationFrame(function () {
      var target = document.getElementById('day-' + ymd);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightRailDay(ymd);
    });
  }

  function highlightRailDay(ymd) {
    Array.prototype.forEach.call(els.rail.querySelectorAll('.rail-day'), function (row) {
      row.classList.toggle('active', row.getAttribute('data-date') === ymd);
    });
  }

  // -- HUD + footer ------------------------------------------------------------
  function renderStats() {
    els.statTotal.textContent = String(stories.length);
    els.statLatest.textContent = stories.length ? formatShort(stories[0].date) : '—';
    var scanStamp = formatScanStamp(meta.lastScan);
    els.statScan.textContent = scanStamp;
    els.footerUpdated.textContent = 'Last automated scan: ' + scanStamp;
  }

  // -- wire controls ------------------------------------------------------------
  function wireControls() {
    els.search.addEventListener('input', function () {
      state.query = els.search.value.trim();
      renderFeed();
    });
    els.jumpLatest.addEventListener('click', function () {
      var grouped = groupByDate(stories.filter(matchesFilter));
      if (grouped.order.length) jumpToDate(grouped.order[0]);
    });
  }

  // -- main render ------------------------------------------------------------
  function render() {
    renderChips();
    renderFeed();
  }

  renderStats();
  renderRail();
  wireControls();
  render();
})();
