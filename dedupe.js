/* ==========================================================================
   Crop Circle Watch — dedupe.js
   Duplicate detection for the formation log. Used by check_duplicates.js (the
   CLI the daily scan and the runner both call) and by test_dedupe.js. No
   dependencies, no build step. The UMD wrapper means it also loads in a browser
   as window.CCW_DEDUPE, but index.html deliberately does NOT ship it — the site
   renders already-merged data and has no reason to carry the matcher.

   THE PROBLEM IT SOLVES
   Aggregators name the same formation differently. Crop Circle Connector filed
   the 21 Jul 2026 circle as "Wanborough Plain"; Temporary Temples filed the
   same circle as "Fox Hill". Nothing in the title or location matches, so a
   title/location dedupe misses it entirely and the dashboard shows one crop
   circle twice.

   THE SIGNALS
   Never one signal — a formation is only flagged when independent evidence
   agrees. In descending order of strength:
     - OS grid ref proximity. Both aggregators publish a map ref; the same
       field gets refs within a few tens of metres even when the names differ.
       This is the strongest signal there is, and it is pure arithmetic.
     - Identical youtubeId. Two entries embedding the same drone video are the
       same formation, full stop.
     - A shared URL anywhere across sourceUrl/references. Entry A citing entry
       B's source means somebody already linked them.
     - Title/location word overlap, for the ordinary same-name case.
   Everything is gated on dates being close (DATE_WINDOW_DAYS): real distinct
   formations do appear in the same field weeks apart (Roundway Hill 11 Jul and
   Roundway Hill (2) 18 Jul are genuinely two circles, and must NOT be merged).

   WHAT IT DOES NOT DO
   It does not merge anything automatically. It reports pairs with a score and
   the reasons behind that score; a human (or the scan agent, following Step 4b)
   decides and edits data.js. Merging is destructive and permanent — a wrong
   auto-merge silently erases a real formation from the record.
   ========================================================================== */

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCW_DEDUPE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Two entries more than this many days apart are never considered the same
  // formation, no matter how well everything else matches. Reports of one
  // formation trickle in over a few days (a ground report can lag the first
  // aerial by 2-3 days), but not weeks.
  var DATE_WINDOW_DAYS = 4;

  // Grid refs closer than this are treated as the same field. A 1m-precision
  // 10-figure ref for one formation varies by a few tens of metres between
  // sources depending on whether they plotted the centre or an edge.
  var SAME_FIELD_METRES = 250;

  // Score at or above which a pair is called a likely duplicate.
  var LIKELY = 5;

  // Filler words that carry no identifying signal in a formation name or
  // location string, so they must not count toward word overlap.
  var STOPWORDS = {
    nr: 1, near: 1, the: 1, of: 1, and: 1, at: 1, in: 1, uk: 1, england: 1,
    hill: 1, field: 1, farm: 1, down: 1, downs: 1, wood: 1, woods: 1, map: 1,
    ref: 1, circle: 1, formation: 1, plain: 1, plantation: 1, barn: 1
  };

  // ---- OS national grid ----------------------------------------------------
  // "SU2283380804" / "SU 228 808" -> { e, n } in absolute metres. Returns null
  // for anything unparseable, which simply means "no proximity signal here" —
  // several entries (Fox Hill, the Swiss one) carry no ref at all.
  function parseGridRef(text) {
    if (typeof text !== 'string') return null;
    // Digit groups may be spaced ("SU 055 338") or run together
    // ("SU0559233836"); both are in use across the aggregators.
    var m = /\b([A-HJ-Z]{2})\s?(\d[\d\s]{2,12}\d)\b/i.exec(text);
    if (!m) return null;
    var letters = m[1].toUpperCase();
    var digits = m[2].replace(/\s+/g, '');
    if (digits.length < 4 || digits.length > 10 || digits.length % 2 !== 0) return null;

    // Two-letter 100km square -> its south-west corner, via the standard
    // 5x5 lettered grid with 'I' omitted.
    var l1 = letters.charCodeAt(0) - 65; if (l1 > 7) l1--;
    var l2 = letters.charCodeAt(1) - 65; if (l2 > 7) l2--;
    var e100 = ((l1 - 2) % 5) * 5 + (l2 % 5);
    var n100 = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);
    if (e100 < 0 || n100 < 0) return null;

    // Digits split in half; each half is padded out to a full 5-figure
    // (1 metre) value so refs of different precision compare correctly.
    var half = digits.length / 2;
    var pad = function (s) { return (s + '00000').slice(0, 5); };
    return {
      e: e100 * 100000 + parseInt(pad(digits.slice(0, half)), 10),
      n: n100 * 100000 + parseInt(pad(digits.slice(half)), 10)
    };
  }

  function gridDistance(a, b) {
    if (!a || !b) return null;
    var de = a.e - b.e, dn = a.n - b.n;
    return Math.round(Math.sqrt(de * de + dn * dn));
  }

  // ---- text ----------------------------------------------------------------
  // Shared normalisation: lowercase, drop the "· Map ref SU…" suffix and any
  // "(2)"/"(Solstice)" qualifier, and delete apostrophes rather than splitting
  // on them so "Zeal's Knoll" and "Zeals Knoll" normalise identically.
  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/·.*$/, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function words(str) {
    return normalize(str)
      .split(' ')
      .filter(function (w) { return w.length > 2 && !STOPWORDS[w]; });
  }

  // Do two names refer to the same place? Compared both spaced and squashed,
  // because aggregators split compound names inconsistently — the 21 Jul 2026
  // formation is "Fox Hill" on one site and "Foxhill" in the drone footage's
  // own title.
  function sameName(a, b) {
    var na = normalize(a), nb = normalize(b);
    if (!na || !nb) return false;
    return na === nb || na.replace(/ /g, '') === nb.replace(/ /g, '');
  }

  function overlapCount(a, b) {
    var seen = {}, n = 0;
    words(a).forEach(function (w) { seen[w] = 1; });
    words(b).forEach(function (w) { if (seen[w]) { n++; seen[w] = 0; } });
    return n;
  }

  // "Roundway Hill" vs "Roundway Hill (2)" — the parenthetical is exactly how
  // this dataset marks a SECOND, distinct formation at a known site, so an
  // entry carrying one is deliberately not the same circle as one without.
  function sequenceQualifier(title) {
    var m = /\((\d+)\)\s*$/.exec(String(title || '').trim());
    return m ? m[1] : null;
  }

  function daysApart(a, b) {
    var ms = Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z'));
    return isNaN(ms) ? Infinity : Math.round(ms / 86400000);
  }

  // Every public URL an entry points at, normalised for comparison.
  function urlsOf(story) {
    var out = [];
    var push = function (u) {
      if (typeof u !== 'string' || !/^https?:/i.test(u)) return;
      out.push(u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, ''));
    };
    push(story.sourceUrl);
    (story.references || []).forEach(function (r) { push(r && r.url); });
    (story.socialPosts || []).forEach(function (p) { push(p && p.url); });
    return out;
  }

  // Every name an entry answers to: its title plus any alias folded in by a
  // previous merge. Lets a re-reported formation match the merged record.
  function namesOf(story) {
    return [story.title].concat(story.aliases || []).filter(Boolean);
  }

  // ---- scoring -------------------------------------------------------------
  // Returns { score, reasons[] } for one pair.
  function scorePair(a, b) {
    var reasons = [];
    var score = 0;

    var gap = daysApart(a.date, b.date);
    if (gap > DATE_WINDOW_DAYS) return { score: 0, reasons: [], days: gap };

    // "Roundway Hill" vs "Roundway Hill (2)" is this dataset's own notation for
    // a SECOND, distinct formation at a known site — an explicit statement that
    // they are not the same circle. Only applies when the base names match: a
    // differing qualifier says nothing about two entries called different
    // things, and short-circuiting there would hide a real duplicate that
    // happens to sit next to a numbered formation.
    var qa = sequenceQualifier(a.title), qb = sequenceQualifier(b.title);
    if (qa !== qb && (qa || qb) && sameName(a.title, b.title)) {
      return { score: 0, reasons: ['distinct-sequence-qualifier'], days: gap };
    }

    var dist = gridDistance(parseGridRef(a.location), parseGridRef(b.location));
    if (dist !== null && dist <= SAME_FIELD_METRES) {
      score += 5;
      reasons.push('map refs ' + dist + 'm apart');
    } else if (dist !== null) {
      // Both sides published a ref and they disagree: strong evidence AGAINST,
      // enough to overrule a coincidental name/date match.
      score -= 4;
      reasons.push('map refs ' + dist + 'm apart (distinct fields)');
    }

    if (a.youtubeId && b.youtubeId && a.youtubeId === b.youtubeId) {
      score += 4;
      reasons.push('same video (' + a.youtubeId + ')');
    }

    var ua = urlsOf(a), ub = urlsOf(b);
    var sharedUrl = ua.filter(function (u) { return ub.indexOf(u) !== -1; })[0];
    if (sharedUrl) {
      score += 4;
      reasons.push('shared source URL (' + sharedUrl + ')');
    }

    if (a.formationId && b.formationId && a.formationId === b.formationId) {
      score += 5;
      reasons.push('same registry formationId (' + a.formationId + ')');
    }

    // Names: compare every name each side answers to (title + any alias folded
    // in by an earlier merge) against every name on the other side. An outright
    // name match is worth far more than incidental word overlap — "Golden Ball
    // Hill" and "Windmill Hill" share a word and nothing else.
    var nameMatch = false, bestOverlap = 0, matchedName = '';
    namesOf(a).forEach(function (na) {
      namesOf(b).forEach(function (nb) {
        if (sameName(na, nb)) { nameMatch = true; matchedName = na; }
        bestOverlap = Math.max(bestOverlap, overlapCount(na, nb));
      });
    });
    if (nameMatch) {
      score += 4;
      reasons.push('same formation name ("' + matchedName + '")');
    } else if (bestOverlap) {
      score += Math.min(3, bestOverlap * 2);
      reasons.push('title words in common (' + bestOverlap + ')');
    }

    var locOverlap = overlapCount(a.location, b.location);
    if (locOverlap) {
      score += Math.min(2, locOverlap);
      reasons.push('location words in common (' + locOverlap + ')');
    }

    // Two aggregators covering one formation usually file within a day of each
    // other, so tight date agreement corroborates whatever else matched. Only
    // ever a tie-breaker on top of a real signal — never evidence on its own.
    if (gap <= 1 && score > 0) {
      score += 1;
      reasons.push(gap === 0 ? 'same report date' : 'reported a day apart');
    }

    return { score: score, reasons: reasons, days: gap, metres: dist };
  }

  // ---- public API ----------------------------------------------------------
  // Every suspicious pair in a list of stories, strongest first. `minScore`
  // defaults to LIKELY; pass something lower (3) to see near-misses too.
  function findDuplicates(stories, minScore) {
    var threshold = typeof minScore === 'number' ? minScore : LIKELY;
    var list = Array.isArray(stories) ? stories : [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var r = scorePair(list[i], list[j]);
        if (r.score >= threshold) {
          out.push({
            a: list[i], b: list[j],
            score: r.score, reasons: r.reasons,
            days: r.days, metres: r.metres,
            likely: r.score >= LIKELY
          });
        }
      }
    }
    out.sort(function (x, y) { return y.score - x.score; });
    return out;
  }

  // Test a single candidate (not yet in data.js) against the existing set —
  // this is what the daily scan calls in Step 4 before writing a new entry.
  function findMatchesFor(candidate, stories, minScore) {
    var threshold = typeof minScore === 'number' ? minScore : LIKELY;
    return (stories || []).map(function (s) {
      var r = scorePair(candidate, s);
      return { story: s, score: r.score, reasons: r.reasons, days: r.days, metres: r.metres };
    }).filter(function (r) {
      return r.score >= threshold;
    }).sort(function (x, y) { return y.score - x.score; });
  }

  // id -> canonical story, for every id retired by a merge. Keeps old deep
  // links (#card-2026-07-21-fox-hill) and old external links working after the
  // entry they pointed at was folded into another.
  function mergedIdIndex(stories) {
    var index = {};
    (stories || []).forEach(function (s) {
      (s.mergedIds || []).forEach(function (old) { index[old] = s; });
    });
    return index;
  }

  return {
    findDuplicates: findDuplicates,
    findMatchesFor: findMatchesFor,
    mergedIdIndex: mergedIdIndex,
    scorePair: scorePair,
    parseGridRef: parseGridRef,
    gridDistance: gridDistance,
    namesOf: namesOf,
    LIKELY: LIKELY,
    DATE_WINDOW_DAYS: DATE_WINDOW_DAYS,
    SAME_FIELD_METRES: SAME_FIELD_METRES
  };
});
