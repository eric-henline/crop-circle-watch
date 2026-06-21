/* ==========================================================================
   Crop Circle Watch — app.js
   Reads the global `STORIES` array and `DASHBOARD_META` object defined in
   data.js (no fetch, no build step — works from file:// or any static host).

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

  // newest first, everywhere
  stories.sort(function (a, b) { return b.date.localeCompare(a.date) || (b.id || '').localeCompare(a.id || ''); });

  var DEFAULT_KEYWORDS = (Array.isArray(meta.defaultKeywords) && meta.defaultKeywords.length)
    ? meta.defaultKeywords
    : ['crop circle 2026', 'Wiltshire crop circle', 'crop circle UK'];
  var KEYWORD_KEY = 'ccw_keywords';
  var KEYWORD_MAX = 8;

  var state = { query: '', tag: 'all' };
  var railIndex = {};
  var sectionObserver = null;
  var keywordState = getKeywordState();

  var els = {
    feed: document.getElementById('feed'),
    rail: document.getElementById('timelineRail'),
    chips: document.getElementById('filterChips'),
    search: document.getElementById('searchInput'),
    jumpLatest: document.getElementById('jumpLatest'),
    scrollCue: document.getElementById('scrollCue'),
    statTotal: document.getElementById('statTotal'),
    statSeason: document.getElementById('statSeason'),
    statLatest: document.getElementById('statLatest'),
    statScan: document.getElementById('statScan'),
    seasonLabel: document.getElementById('seasonLabel'),
    lfValue: document.getElementById('lfValue'),
    lfDays: document.getElementById('lfDays'),
    newsList: document.getElementById('newsList'),
    videoStrip: document.getElementById('videoStrip'),
    socialPosts: document.getElementById('socialPosts'),
    keywordChips: document.getElementById('keywordChips'),
    keywordForm: document.getElementById('keywordForm'),
    keywordInput: document.getElementById('keywordInput'),
    searchX: document.getElementById('searchX'),
    searchBsky: document.getElementById('searchBsky'),
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
    node.id = 'card-' + story.id;

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
    var allDates = groupByDate(stories).order;
    var built = buildRailTree(allDates);
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

        built.tree[year].months[m].forEach(function (ymd) {
          var d = parseYMD(ymd);
          var count = groupByDate(stories).map[ymd].length;
          var row = document.createElement('div');
          row.className = 'rail-day';
          row.setAttribute('data-date', ymd);
          row.innerHTML = '<span>' + WEEKDAYS[d.getDay()] + ' ' + d.getDate() + '</span><span class="count">' + count + '</span>';
          row.addEventListener('click', function () { jumpToDate(ymd); });
          monthWrap.appendChild(row);
          railIndex[ymd] = row;
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
      setActiveRailDay(ymd);
    });
  }

  function jumpToStory(id) {
    state.query = '';
    state.tag = 'all';
    els.search.value = '';
    render();
    requestAnimationFrame(function () {
      var story = stories.filter(function (s) { return s.id === id; })[0];
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
  function setupHeroSentinel() {
    if (!('IntersectionObserver' in window)) return;
    var sentinel = document.getElementById('heroSentinel');
    if (!sentinel) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        document.body.classList.toggle('compact', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    obs.observe(sentinel);
  }

  // -- hero: last confirmed formation banner --------------------------------
  function renderLastFormation() {
    if (!stories.length) {
      els.lfValue.textContent = 'No formations logged yet';
      els.lfDays.textContent = '—';
      return;
    }
    var latest = stories[0];
    els.lfValue.textContent = latest.title + ' — ' + formatShort(latest.date);
    els.lfDays.textContent = formatDaysAgo(daysAgo(latest.date));
  }

  // -- hero widget: recent coverage ------------------------------------------
  function renderNews() {
    var items = stories.slice(0, 6);
    els.newsList.innerHTML = '';
    if (!items.length) {
      els.newsList.innerHTML = '<li class="empty-note">No coverage logged yet.</li>';
      return;
    }
    items.forEach(function (s) {
      var li = document.createElement('li');
      li.className = 'news-item';
      var a = document.createElement('a');
      a.href = s.sourceUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var title = document.createElement('span');
      title.className = 'news-title';
      title.textContent = s.title;
      var metaEl = document.createElement('span');
      metaEl.className = 'news-meta';
      metaEl.textContent = (s.sourceName || 'Source') + ' · ' + formatShort(s.date);
      a.appendChild(title);
      a.appendChild(metaEl);
      li.appendChild(a);
      els.newsList.appendChild(li);
    });
  }

  // -- hero widget: field footage strip --------------------------------------
  function renderVideoStrip() {
    var items = stories.filter(function (s) { return !!s.youtubeId; }).slice(0, 8);
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
  function renderSocialPosts() {
    var posts = [];
    stories.forEach(function (s) {
      (s.socialPosts || []).forEach(function (p) {
        posts.push({ story: s, platform: p.platform, url: p.url });
      });
    });
    els.socialPosts.innerHTML = '';
    if (!posts.length) {
      var note = document.createElement('p');
      note.className = 'empty-note';
      note.textContent = 'No curated posts yet — the next scan checks again. Try a keyword search below.';
      els.socialPosts.appendChild(note);
      return;
    }
    posts.slice(0, 5).forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'social-post';
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var tag = document.createElement('span');
      tag.className = 'social-platform';
      tag.textContent = p.platform;
      var label = document.createElement('span');
      label.textContent = 'Mentions of ' + p.story.title;
      a.appendChild(tag);
      a.appendChild(label);
      els.socialPosts.appendChild(a);
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

  // -- hero stats + footer ------------------------------------------------------------
  function renderStats() {
    els.statTotal.textContent = String(stories.length);
    els.statLatest.textContent = stories.length ? formatShort(stories[0].date) : '—';

    var seasonYear = stories.length ? parseYMD(stories[0].date).getFullYear() : null;
    var seasonCount = seasonYear === null ? 0 : stories.filter(function (s) {
      return parseYMD(s.date).getFullYear() === seasonYear;
    }).length;
    els.statSeason.textContent = String(seasonCount);

    var scanStamp = formatScanStamp(meta.lastScan);
    els.statScan.textContent = scanStamp;
    els.footerUpdated.textContent = 'Last automated scan: ' + scanStamp;
    els.seasonLabel.textContent = meta.seasonLabel || '—';
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
    if (els.scrollCue) {
      els.scrollCue.addEventListener('click', function () {
        var target = document.getElementById('timeline');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // -- main render ------------------------------------------------------------
  function render() {
    renderChips();
    renderFeed();
  }

  renderStats();
  renderLastFormation();
  renderRail();
  renderNews();
  renderVideoStrip();
  renderSocialPosts();
  renderKeywordChips();
  updateSearchLinks();
  wireKeywordForm();
  wireControls();
  setupHeroSentinel();
  render();
})();
