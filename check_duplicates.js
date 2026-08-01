#!/usr/bin/env node
/* ==========================================================================
   Crop Circle Watch — check_duplicates.js
   Reports formations in data.js that look like the same crop circle logged
   twice under two aggregators' names. Run it from this folder:

     node check_duplicates.js            # likely duplicates only
     node check_duplicates.js --all      # include weaker near-misses (score 3+)
     node check_duplicates.js --json     # machine-readable, for the daily scan
     node check_duplicates.js --check "Title|Location|YYYY-MM-DD|youtubeId"
                                         # test ONE candidate before adding it

   Exit code is 1 when likely duplicates are found, 0 when clean — so the daily
   scan can branch on it without parsing the output.

   All the actual matching logic lives in dedupe.js, shared with the browser.
   ========================================================================== */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var dedupe = require('./dedupe.js');

var argv = process.argv.slice(2);
var hasFlag = function (f) { return argv.indexOf(f) !== -1; };
var flagValue = function (f) {
  var i = argv.indexOf(f);
  return i !== -1 ? argv[i + 1] : null;
};

var asJson = hasFlag('--json');
var minScore = hasFlag('--all') ? 3 : dedupe.LIKELY;

// data.js is a plain script assigning onto `window`. Evaluate it in a throwaway
// sandbox rather than requiring it — no parsing, no export shim, and it stays
// the single source of truth.
function loadStories() {
  var file = path.join(__dirname, 'data.js');
  var sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return Array.isArray(sandbox.window.STORIES) ? sandbox.window.STORIES : [];
}

function label(s) {
  return s.title + '  [' + s.id + ']';
}

function describePair(p) {
  return [
    '  ' + label(p.a),
    '    ' + (p.a.location || '(no location)'),
    '    ' + (p.a.sourceName || '?') + ' — ' + (p.a.sourceUrl || 'no source'),
    '  ' + label(p.b),
    '    ' + (p.b.location || '(no location)'),
    '    ' + (p.b.sourceName || '?') + ' — ' + (p.b.sourceUrl || 'no source'),
    '    why: ' + p.reasons.join('; ')
  ].join('\n');
}

// --- single-candidate mode ---------------------------------------------------
// Used by the daily scan in Step 4: before writing a new story object, check it
// against everything already logged.
if (hasFlag('--check')) {
  var raw = flagValue('--check') || '';
  var parts = raw.split('|');
  var candidate = {
    id: '(candidate)',
    title: (parts[0] || '').trim(),
    location: (parts[1] || '').trim(),
    date: (parts[2] || '').trim(),
    youtubeId: (parts[3] || '').trim() || null
  };
  if (!candidate.title || !candidate.date) {
    console.error('Usage: node check_duplicates.js --check "Title|Location|YYYY-MM-DD|youtubeId"');
    process.exit(2);
  }
  var matches = dedupe.findMatchesFor(candidate, loadStories(), 3);
  if (asJson) {
    console.log(JSON.stringify({
      candidate: candidate,
      matches: matches.map(function (m) {
        return { id: m.story.id, title: m.story.title, score: m.score, likely: m.score >= dedupe.LIKELY, reasons: m.reasons };
      })
    }, null, 2));
  } else if (!matches.length) {
    console.log('No existing entry matches "' + candidate.title + '" — safe to add as a new formation.');
  } else {
    console.log('"' + candidate.title + '" (' + candidate.date + ') may already be logged:\n');
    matches.forEach(function (m) {
      console.log('  score ' + m.score + (m.score >= dedupe.LIKELY ? ' LIKELY DUPLICATE' : ' possible') +
        ' — ' + label(m.story) + '\n    why: ' + m.reasons.join('; '));
    });
    console.log('\nIf it is the same formation, MERGE into the existing entry (add the new');
    console.log('name to `aliases`, the new link to `references`) instead of adding a row.');
  }
  process.exit(matches.some(function (m) { return m.score >= dedupe.LIKELY; }) ? 1 : 0);
}

// --- whole-file mode ---------------------------------------------------------
var stories = loadStories();
var pairs = dedupe.findDuplicates(stories, minScore);
var likely = pairs.filter(function (p) { return p.likely; });

if (asJson) {
  console.log(JSON.stringify({
    checked: stories.length,
    likely: likely.length,
    pairs: pairs.map(function (p) {
      return {
        score: p.score, likely: p.likely, days: p.days, metres: p.metres,
        reasons: p.reasons,
        a: { id: p.a.id, title: p.a.title, location: p.a.location, sourceUrl: p.a.sourceUrl },
        b: { id: p.b.id, title: p.b.title, location: p.b.location, sourceUrl: p.b.sourceUrl }
      };
    })
  }, null, 2));
} else {
  console.log('Checked ' + stories.length + ' formations in data.js.\n');
  if (!pairs.length) {
    console.log('No duplicate formations detected.');
  } else {
    pairs.forEach(function (p) {
      console.log((p.likely ? 'LIKELY DUPLICATE' : 'possible') + '  (score ' + p.score + ')');
      console.log(describePair(p));
      console.log('');
    });
    if (likely.length) {
      console.log('To merge a pair: keep ONE entry, add the other\'s name to `aliases`,');
      console.log('its id to `mergedIds`, and its link to `references`. See README.md');
      console.log('("Duplicate formations"). Never delete the losing entry\'s information —');
      console.log('fold it in, so one card still carries both sources.');
    }
  }
}

process.exit(likely.length ? 1 : 0);
