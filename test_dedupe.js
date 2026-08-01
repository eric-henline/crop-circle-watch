#!/usr/bin/env node
/* ==========================================================================
   Crop Circle Watch — test_dedupe.js
   Tests for dedupe.js. Plain Node, no framework:

     node test_dedupe.js

   The false NEGATIVES here (Roundway Hill 1 vs 2, the two Etchilhamptons) matter
   as much as the positives — the same site really does get a second, distinct
   formation weeks later, and merging those would erase a real crop circle from
   the record. Any change to the scoring must keep both halves passing.
   ========================================================================== */

'use strict';

var dedupe = require('./dedupe.js');

var passed = 0, failed = 0;

function ok(name, cond, detail) {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); }
}

function isDup(a, b) { return dedupe.scorePair(a, b).score >= dedupe.LIKELY; }
function why(a, b) {
  var r = dedupe.scorePair(a, b);
  return 'score ' + r.score + ' — ' + (r.reasons.join('; ') || 'no signals');
}

// --- OS grid ref parsing ---------------------------------------------------
console.log('\nOS grid references');

var su = dedupe.parseGridRef('Nr Wilton, Wiltshire, UK · Map ref SU0559233836');
ok('parses a 10-figure ref embedded in a location string',
  su && su.e === 405592 && su.n === 133836, JSON.stringify(su));

ok('SU 100km square resolves to 400000/100000',
  dedupe.parseGridRef('SU0000000000').e === 400000 &&
  dedupe.parseGridRef('SU0000000000').n === 100000);

ok('handles the letter-I gap in the grid (TQ)',
  dedupe.parseGridRef('TQ0000000000').e === 500000 &&
  dedupe.parseGridRef('TQ0000000000').n === 100000);

ok('lower-precision 6-figure refs pad to the same scale',
  dedupe.parseGridRef('SU 055 338').e === 405500);

ok('returns null for a location with no ref',
  dedupe.parseGridRef('Fox Hill, Wiltshire, UK') === null);

ok('returns null for an odd digit count',
  dedupe.parseGridRef('SU123456789') === null);

ok('distance between the two 15 Jun refs is ~29m',
  dedupe.gridDistance(
    dedupe.parseGridRef('SU0559233836'),
    dedupe.parseGridRef('SU0556533826')
  ) === 29);

// --- true positives: the real duplicates that shipped -----------------------
console.log('\nReal duplicates (must be caught)');

var firstBroadDrive = {
  id: '2026-06-15-first-broad-drive', date: '2026-06-15', title: 'First Broad Drive',
  location: 'Nr Wilton, Wiltshire, UK · Map ref SU0559233836',
  sourceUrl: 'https://www.cropcircleconnector.com/2026/first/first2026a.html',
  youtubeId: 'we8EFnHEP14'
};
var greatWishford = {
  id: '2026-06-15-great-wishford', date: '2026-06-15', title: 'Great Wishford',
  location: 'Nr Grovely Woods, Great Wishford, Wiltshire, UK · Map ref SU0556533826',
  sourceUrl: 'https://temporarytemples.co.uk/project/great-wishford-2026',
  youtubeId: null
};
ok('First Broad Drive == Great Wishford (29m apart, same day, different names)',
  isDup(firstBroadDrive, greatWishford), why(firstBroadDrive, greatWishford));

var foxHill = {
  id: '2026-07-21-fox-hill', date: '2026-07-21', title: 'Fox Hill',
  location: 'Fox Hill, Wiltshire, UK',
  sourceUrl: 'https://temporarytemples.co.uk/2026-fox-hill',
  youtubeId: 'I9OtDbbVsvA'
};
var wanborough = {
  id: '2026-07-21-wanborough-plain', date: '2026-07-21', title: 'Wanborough Plain',
  location: 'Nr Liddington, Wiltshire, UK · Map ref SU2283380804',
  sourceUrl: 'https://www.cropcircleconnector.com/2026/Wanborough/Wanborough2026a.html',
  youtubeId: 'I9OtDbbVsvA'
};
ok('Fox Hill == Wanborough Plain (same video, no shared name or ref)',
  isDup(foxHill, wanborough), why(foxHill, wanborough));

ok('a plain same-name re-report is caught',
  isDup(
    { date: '2026-07-11', title: 'Zeal\'s Knoll', location: 'Nr Mere, Wiltshire, UK' },
    { date: '2026-07-12', title: 'Zeals Knoll', location: 'Mere, Wiltshire' }
  ));

ok('a shared reference URL alone links two differently-named entries',
  isDup(
    { date: '2026-08-01', title: 'Alpha Field', location: 'Somerset, UK',
      sourceUrl: 'https://example.org/a' },
    { date: '2026-08-02', title: 'Beta Copse', location: 'Dorset, UK',
      sourceUrl: 'https://other.example/b',
      references: [{ label: 'CCC', url: 'https://www.example.org/a/' }] }
  ));

// Regression: the "(2)" gate must only apply between entries whose base names
// match. It once short-circuited ANY comparison against a numbered formation,
// which hid a differently-named duplicate sitting 6m from Roundway Hill (2).
var numbered = {
  date: '2026-07-18', title: 'Roundway Hill (2)',
  location: 'Nr Devizes, Wiltshire, UK · Map ref SU0101264744'
};
var nearNumbered = {
  date: '2026-07-18', title: 'Some Other Name',
  location: 'Nr Devizes, Wiltshire · Map ref SU0101264750'
};
ok('a differently-named entry next to a numbered formation is still caught',
  isDup(numbered, nearNumbered), why(numbered, nearNumbered));

ok('a shared registry formationId links two entries',
  isDup(
    { date: '2026-08-01', title: 'Alpha Field', location: 'Somerset, UK', formationId: 'alpha-field-2026' },
    { date: '2026-08-03', title: 'Beta Copse', location: 'Dorset, UK', formationId: 'alpha-field-2026' }
  ));

ok('an alias on a merged entry still matches a later re-report',
  isDup(
    { date: '2026-07-21', title: 'Wanborough Plain', location: 'Nr Liddington, Wiltshire, UK',
      aliases: ['Fox Hill'] },
    { date: '2026-07-22', title: 'Fox Hill', location: 'Wiltshire, UK' }
  ));

// --- true negatives: distinct formations that must NOT be merged ------------
console.log('\nDistinct formations (must NOT be flagged)');

var roundway1 = {
  id: '2026-07-11-roundway-hill', date: '2026-07-11', title: 'Roundway Hill',
  location: 'Nr Devizes, Wiltshire, UK · Map ref SU0085764698', youtubeId: 'MfSAwFcefBQ'
};
var roundway2 = {
  id: '2026-07-18-roundway-hill-2', date: '2026-07-18', title: 'Roundway Hill (2)',
  location: 'Nr Devizes, Wiltshire, UK · Map ref SU0101264744', youtubeId: 'juHmZB625i8'
};
ok('Roundway Hill vs Roundway Hill (2) — same site, 7 days apart',
  !isDup(roundway1, roundway2), why(roundway1, roundway2));

var etch1 = {
  date: '2026-06-25', title: 'Etchilhampton Hill',
  location: 'Nr Devizes, Wiltshire, UK · Map ref SU0383960408'
};
var etch2 = {
  date: '2026-07-04', title: 'Etchilhampton (2)',
  location: 'Etchilhampton Hill, Nr Devizes, Wiltshire, UK · Map ref SU0284560442'
};
ok('the two Etchilhampton formations — 9 days apart',
  !isDup(etch1, etch2), why(etch1, etch2));

ok('same name and same day but map refs 1km apart is NOT a duplicate',
  !isDup(
    { date: '2026-06-15', title: 'Milk Hill', location: 'Wiltshire · Map ref SU1052564021' },
    { date: '2026-06-15', title: 'Milk Hill', location: 'Wiltshire · Map ref SU1152564021' }
  ), why(
    { date: '2026-06-15', title: 'Milk Hill', location: 'Wiltshire · Map ref SU1052564021' },
    { date: '2026-06-15', title: 'Milk Hill', location: 'Wiltshire · Map ref SU1152564021' }
  ));

ok('an exact same-name repeat a full season later is NOT a duplicate',
  !isDup(
    { date: '2025-06-15', title: 'Milk Hill', location: 'Nr Alton Barnes, Wiltshire, UK' },
    { date: '2026-06-15', title: 'Milk Hill', location: 'Nr Alton Barnes, Wiltshire, UK' }
  ));

ok('two unrelated Wiltshire formations on the same day are NOT a duplicate',
  !isDup(
    { date: '2026-06-15', title: 'Morgans Hill', location: 'Morgans Hill, Wiltshire, UK' },
    { date: '2026-06-15', title: 'Great Wishford', location: 'Nr Grovely Woods, Great Wishford, Wiltshire, UK' }
  ));

ok('generic shared words alone ("Hill", "Wiltshire", "UK") do not trigger a match',
  !isDup(
    { date: '2026-06-15', title: 'Golden Ball Hill', location: 'Nr Pewsey, Wiltshire, UK' },
    { date: '2026-06-15', title: 'Windmill Hill', location: 'Nr Avebury, Wiltshire, UK' }
  ));

// --- API behaviour ----------------------------------------------------------
console.log('\nAPI');

var set = [firstBroadDrive, greatWishford, foxHill, wanborough, roundway1, roundway2];
var found = dedupe.findDuplicates(set);
ok('findDuplicates finds exactly the 2 real pairs in a mixed set',
  found.length === 2, 'got ' + found.length);
ok('findDuplicates sorts strongest first',
  found.length === 2 && found[0].score >= found[1].score);

var matches = dedupe.findMatchesFor(
  { date: '2026-07-21', title: 'Foxhill', location: 'Liddington, Wiltshire' }, set);
ok('findMatchesFor spots a candidate that duplicates an existing entry',
  matches.length > 0, JSON.stringify(matches.map(function (m) { return m.story.id; })));

ok('findMatchesFor stays quiet on a genuinely new candidate',
  dedupe.findMatchesFor(
    { date: '2026-09-09', title: 'Barbury Castle', location: 'Nr Swindon, Wiltshire, UK' }, set
  ).length === 0);

var index = dedupe.mergedIdIndex([
  { id: 'keeper', title: 'Keeper', mergedIds: ['retired-a', 'retired-b'] },
  { id: 'other', title: 'Other' }
]);
ok('mergedIdIndex maps every retired id to its canonical story',
  index['retired-a'].id === 'keeper' && index['retired-b'].id === 'keeper' &&
  index['other'] === undefined);

// --- result -----------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
