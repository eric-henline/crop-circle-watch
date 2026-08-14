/* ==========================================================================
   Crop Circle Watch — data.js
   THIS IS THE FILE TO HAND-EDIT. No build step, no JSON escaping headaches —
   just a plain JavaScript array. Add a new story by copying an existing
   object in STORIES and changing the values. Save the file, refresh the
   page (or reload the live site) and it appears.

   Field reference for each story object:
     id          — unique slug, e.g. "2026-06-15-first-broad-drive"
     date        — "YYYY-MM-DD", the date the formation was REPORTED/found
     title       — formation name (shown as the card heading)
     location    — human-readable location string
     description — 1-3 sentences, plain text (no HTML)
     tags        — array of short strings, used for the filter chips
     sourceUrl   — link to the original source (required)
     sourceName  — short label for the source link, e.g. "Crop Circle Connector"
     youtubeId   — YouTube video ID only (the part after "v=" or after
                   "embed/"), or null if no video is available yet
     aliases     — OPTIONAL. Other names this same formation was reported under.
                   Aggregators routinely name one circle differently (Crop Circle
                   Connector's "Wanborough Plain" is Temporary Temples' "Fox
                   Hill"). One card, every name: the alternates render under the
                   title as "Also reported as …", and they're searchable, so
                   looking up either name finds the one record. Adding an alias
                   also teaches dedupe.js that name, so a later re-report under
                   it is recognised instead of logged again.
     mergedIds   — OPTIONAL. Ids of entries folded INTO this one. Two jobs: old
                   deep links (#card-<retired-id>) still land on the surviving
                   card, and the daily scan can tell a retired id from an id it
                   has never seen. Never reuse a retired id for a new formation.
     formationId — OPTIONAL. Canonical id from the research registry
                   (index/formations.json, built by pipeline/build_registry.py).
                   This is the LINK back to the master research database — the
                   same formation's full record, images, and authenticity tag.
                   See pipeline/LINKING_DESIGN.md.
     authenticity— OPTIONAL. Evidentiary tag carried from the research registry:
                   "Confirmed human-made" | "Unexplained (anomaly evidence)" |
                   "Contested" | "Unclassified". Rendered as a small badge on the
                   card (the "Unclassified" default is not shown).
     references  — OPTIONAL. Array of { label, url } provenance links — "where
                   this can be gathered / read more." Rendered as a compact
                   "More" row. Use PUBLIC, resolvable URLs (external report pages,
                   or the research repo if published) — the dashboard deploys as
                   its own site, so internal ../sessions/*.md paths won't resolve
                   for public visitors.
     socialPosts — OPTIONAL. Array of post objects the scan finds and
                   verifies by hand:
                     { platform, url, author, handle, text, postedAt }
                   Only `platform` ("x" or "bluesky") and `url` are required;
                   author/handle/text/postedAt are optional enrichment, e.g.
                     { platform: "bluesky",
                       url: "https://bsky.app/profile/handle.bsky.social/post/xyz" }
                     { platform: "x", url: "https://x.com/someone/status/123",
                       author: "Someone", handle: "@someone",
                       text: "excerpt of the post…",
                       postedAt: "2026-06-21T14:30:00Z" }
                   Rendering differs by platform: Bluesky posts auto-load as a
                   genuine live embed (via Bluesky's public oEmbed endpoint)
                   right in the "Live chatter" widget — no click required.
                   X/Twitter no longer supports reliable embeds on a static
                   site as of 2026, so X posts render as a rich static card
                   instead (using author/handle/text/postedAt when present,
                   otherwise falling back to a plain link). Open-ended
                   keyword search still isn't embeddable live on either
                   platform without a backend — that stays the one-tap
                   external search below. See README.md.

   The automated daily scan (see ../README.md and the scheduled task) adds
   new objects to the TOP of this array and updates DASHBOARD_META.lastScan.
   It never deletes or rewrites existing entries — edits/corrections to past
   entries are done by hand.
   ========================================================================== */

window.DASHBOARD_META = {
  // Updated automatically by the daily scan. ISO 8601 with explicit offset
  // so it renders the same regardless of the visitor's timezone settings.
  lastScan: "2026-08-14T07:04:11-07:00",
  // Set by the daily scan at the end of each run. Three possible values:
  //   "ok"      — scan ran and completed normally (including "no new formations" days)
  //   "flagged" — safety valve triggered (>6 candidates found; needs manual review)
  //   "error"   — scan failed, timed out, or couldn't write/commit the output
  // When this is "error" or "flagged" the dashboard shows an amber warning
  // on the scan timestamp so you know to check scan_log.txt / scan_errors.txt.
  lastScanStatus: "ok",
  seasonLabel: "2026 UK season",
  // Seeds the "Live chatter" keyword chips on a visitor's first visit. After
  // that, each visitor's own additions/removals are kept in their browser's
  // localStorage and this list is ignored for them.
  defaultKeywords: ["crop circle 2026", "Wiltshire crop circle", "crop circle UK"]
};

window.STORIES = [
  {
    // MERGED 2026-07-30: Crop Circle Connector filed this as "Wanborough Plain"
    // and Temporary Temples as "Fox Hill". Same date, same drone video
    // (I9OtDbbVsvA), adjacent sites — one formation, two names.
    id: "2026-07-21-wanborough-plain",
    date: "2026-07-21",
    title: "Wanborough Plain",
    aliases: ["Fox Hill"],
    mergedIds: ["2026-07-21-fox-hill"],
    location: "Nr Liddington, Wiltshire, UK · Map ref SU2283380804",
    description: "Reported 21 July 2026 near Liddington, on the Wanborough Plain / Fox Hill downs. Temporary Temples describe a long pictogram of symbols, with full analysis and photography still pending at time of writing. Aerial images and video credited to Stonehenge Dronescapes; ground reports, diagrams, and design details not yet published.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/Wanborough/Wanborough2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "I9OtDbbVsvA",
    references: [
      { label: "Crop Circle Connector — Wanborough Plain", url: "https://www.cropcircleconnector.com/2026/Wanborough/Wanborough2026a.html" },
      { label: "Temporary Temples — Fox Hill", url: "https://temporarytemples.co.uk/2026-fox-hill" }
    ]
  },
  {
    id: "2026-07-18-roundway-hill-2",
    date: "2026-07-18",
    title: "Roundway Hill (2)",
    location: "Nr Devizes, Wiltshire, UK · Map ref SU0101264744",
    description: "Reported 18 July 2026 near Devizes, the second formation of the season at Roundway Hill (following the 11 July formation nearby). Aerial images credited to Stonehenge Dronescapes; ground reports and diagrams not yet published.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/roundway2/roundwayhill2026b.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "juHmZB625i8"
  },
  {
    id: "2026-07-16-odstone-barn",
    date: "2026-07-16",
    title: "Odstone Barn",
    aliases: ["Wayland's Smithy"],
    location: "Nr Wayland's Smithy, Oxfordshire, UK · Map ref SU2797284836",
    description: "Reported 16 July 2026 near Wayland's Smithy, roughly 70 metres across in wheat. Aerial images credited to Nick Bull (Crop Circles from Above); ground access details not yet confirmed.",
    tags: ["UK", "Oxfordshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/odstone/odstonebarn2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "uPaRxh2Y8FE"
  },
  {
    id: "2026-07-14-avebury-henge",
    date: "2026-07-14",
    title: "Avebury Henge",
    aliases: ["Stone Circle"],
    location: "Nr Avebury Henge, Wiltshire, UK · Map ref SU1051070223",
    description: "Reported 14 July 2026 in a wheat field near the historic Avebury Henge and close to Green Street. Temporary Temples describe a 'classical' collection of circles and rings approximately 250 feet across. Aerial footage credited to Stonehenge Dronescapes.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/avebury-2026",
    sourceName: "Temporary Temples",
    youtubeId: "f8LDLG2lsUw",
    references: [
      { label: "Temporary Temples — Avebury", url: "https://temporarytemples.co.uk/project/avebury-2026" },
      { label: "Crop Circle Connector — Stone Circle", url: "https://www.cropcircleconnector.com/2026/stone/stonecircle2026a.html" },
      { label: "Stonehenge Dronescapes (aerial video)", url: "https://www.youtube.com/watch?v=f8LDLG2lsUw" }
    ]
  },
  {
    id: "2026-07-12-milk-hill",
    date: "2026-07-12",
    title: "Milk Hill",
    location: "Nr Alton Barnes, Wiltshire, UK · Map ref SU1052564021",
    description: "Reported 12 July 2026 near Alton Barnes, on the historic Milk Hill site overlooking the Pewsey Vale. Aerial images credited to Stonehenge Dronescapes.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/milkhill/milkhill2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "smond6kwJWs"
  },
  {
    id: "2026-07-11-roundway-hill",
    date: "2026-07-11",
    title: "Roundway Hill",
    location: "Nr Devizes, Wiltshire, UK · Map ref SU0085764698",
    description: "Reported 11 July 2026 near Devizes, with aerial images credited to Stonehenge Dronescapes. Aerial video coverage of the design has nicknamed it the \"Cosmic Chicken.\"",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/roundway/roundway2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "MfSAwFcefBQ"
  },
  {
    id: "2026-07-07-maccoombe-down",
    date: "2026-07-07",
    title: "Maccoombe Down",
    location: "Nr Tidcombe, Wiltshire, UK · Map ref SU2931057192",
    description: "Reported 7 July 2026 near Tidcombe, described by Temporary Temples as a striking 3D design roughly 180ft in diameter. The field's owner — his first crop circle in 19 years — has granted limited public access along marked tractor-track routes.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/Maccoombe/Maccoombe2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "GBwSHN5Gv7g"
  },
  {
    id: "2026-07-05-zeals-knoll",
    date: "2026-07-05",
    title: "Zeal's Knoll",
    location: "Nr Mere, Wiltshire, UK · Map ref ST7903932923",
    description: "Reported 5 July 2026 in a wheat field near Mere, a compact 80-100ft design of standing circles of differing sizes arranged in a non-geometric group. Aerial photography by Temporary Temples' Steve Alexander.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/mere-2026",
    sourceName: "Temporary Temples",
    youtubeId: "aryGVVwyTkI"
  },
  {
    id: "2026-07-04-etchilhampton-2",
    date: "2026-07-04",
    title: "Etchilhampton (2)",
    location: "Etchilhampton Hill, Nr Devizes, Wiltshire, UK · Map ref SU0284560442",
    description: "Reported 4 July 2026 in wheat on Etchilhampton Hill, a tri-fold, roughly 180ft design of three circles and a triangle within a containing ring. Researchers noted its resemblance to the Morgans Hill design cut out by the farmer on 15 June.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/etchilhampton-2-2026",
    sourceName: "Temporary Temples",
    youtubeId: "6XH_1dCBFQM",
    references: [
      { label: "Temporary Temples — Etchilhampton (2)", url: "https://temporarytemples.co.uk/project/etchilhampton-2-2026" },
      { label: "Crop Circle Connector — Etchilhampton Hill", url: "https://www.cropcircleconnector.com/2026/lion/lion2026a.html" }
    ]
  },
  {
    id: "2026-07-03-alfreds-castle",
    date: "2026-07-03",
    title: "Alfred's Castle (Double Circle)",
    aliases: ["Alfred's Castle Settlement"],
    location: "Nr Ashbury & Bishopstone, Oxfordshire, UK · Map ref SU2772882233",
    description: "Two formations appeared the same night of 3 July 2026 on opposite sides of the Alfred's Castle earthwork: an old-fashioned dumbbell design with a crescent-moon motif, and a central circle with fine concentric rings.",
    tags: ["UK", "Oxfordshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/alfreds-castle-2026",
    sourceName: "Temporary Temples",
    youtubeId: "oqcf0UnEU1U",
    references: [
      { label: "Temporary Temples — Alfred's Castle", url: "https://temporarytemples.co.uk/project/alfreds-castle-2026" },
      { label: "Crop Circle Connector — Alfred's Castle Settlement", url: "https://www.cropcircleconnector.com/2026/alfred/alfred2026a.html" }
    ]
  },
  {
    // ADDED 2026-08-06 by manual check. Missed by every daily scan because
    // Crop Circle Connector files it on the "January to May" index page
    // (2026/May2026.html), which actually runs through June — the scan only
    // reads the index page matching the current month. It also surfaced on
    // the CCC Rumours page under a different name ("White Horse Trail, Nr
    // Hackpen"), which is why it was logged as an unverifiable rumour on
    // 2026-08-03 rather than recognised as this formation.
    id: "2026-06-29-walkers-plantation",
    date: "2026-06-29",
    title: "Walker's Plantation",
    aliases: ["Hackpen Hill", "White Horse Trail"],
    location: "Nr Hackpen Hill, Wiltshire, UK · Map ref SU1290975816",
    description: "Reported 29 June 2026 at Walker's Plantation below Hackpen Hill, a site with a long history of formations. Crop Circle Connector states it is a commissioned circle made for a new Sky History series with Bradley Walsh. The farmer does not permit public access to the field.",
    tags: ["UK", "Wiltshire", "2026 season", "commissioned"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/walker/walker2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: null,
    authenticity: "Confirmed human-made",
    references: [
      { label: "Crop Circle Connector — Walker's Plantation", url: "https://www.cropcircleconnector.com/2026/walker/walker2026a.html" },
      { label: "Kornkreise Schweiz — Nachtrag vom 29. Juni 2026", url: "https://kornkreiseschweiz.ch/2026/07/14/nachtrag-vom-29-juni-2026/" }
    ]
  },
  {
    id: "2026-06-25-etchilhampton",
    formationId: "etchilhampton-hill-2026",
    date: "2026-06-25",
    title: "Etchilhampton Hill",
    location: "Nr Devizes, Wiltshire, UK · Map ref SU0383960408",
    description: "Reported 25 June 2026, straddling a field of wild flowers (including poppies) and young wheat. Temporary Temples describe it as a quintuplet design roughly 180ft in diameter, set within a large containing ring.",
    tags: ["UK", "Wiltshire", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/project/etchilhampton-2026",
    sourceName: "Temporary Temples",
    youtubeId: null,
    references: [
      { label: "Temporary Temples — full report", url: "https://temporarytemples.co.uk/project/etchilhampton-2026" },
      { label: "Crop Circle Connector", url: "https://www.cropcircleconnector.com/2026/etchilhampton/etchilhampton2026a.html" }
    ]
  },
  {
    id: "2026-06-23-zurcher-weinland",
    date: "2026-06-23",
    title: "Zürcher Weinland",
    location: "Zürcher Weinland, Switzerland (exact location withheld at farmer's request)",
    description: "Reported 23 June 2026 in a wheat field, measuring approximately 215ft in length. Temporary Temples describe it as an elegant two-way spiral based on hexagon and vesica piscis geometry, reported to them by the Swiss research group Kornkreise Schweiz.",
    tags: ["Switzerland", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/project/zurcher-weinland-2026",
    sourceName: "Temporary Temples",
    youtubeId: null
  },
  {
    id: "2026-06-21-kingweston-solstice",
    date: "2026-06-21",
    title: "Kingweston (Solstice)",
    aliases: ["North Lodge"],
    location: "Nr Cedar Walk Plantation, Kingweston, Somerset, UK · Map ref ST5213531746",
    description: "Reported on the summer solstice, 21 June 2026, in young wheat near Cedar Walk Plantation and Kingweston House. Temporary Temples describe an eight-fold design roughly 180ft in diameter, with lollipop motifs and four eye-shapes at the centre. The farmer has requested no public access to the field.",
    tags: ["UK", "Somerset", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/kingweston2-2026",
    sourceName: "Temporary Temples",
    youtubeId: "FaVfeWRw2nw"
  },
  {
    id: "2026-06-15-morgans-hill",
    formationId: "morgans-hill-2026",
    date: "2026-06-15",
    title: "Morgans Hill",
    location: "Morgans Hill, Wiltshire, UK",
    description: "Reported 15 June 2026 in a barley field at Morgans Hill, measuring approximately 150ft+ in diameter. The circle was cut out by the farmer before it could be photographed, so no imagery exists; Temporary Temples noted they have no further information beyond the initial report.",
    tags: ["UK", "Wiltshire", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/2026-morgans-hill",
    sourceName: "Temporary Temples",
    youtubeId: null
  },
  {
    // MERGED 2026-07-30: Crop Circle Connector filed this as "First Broad Drive,
    // Nr Wilton" (SU0559233836) and Temporary Temples as "Great Wishford, Nr
    // Grovely Woods" (SU0556533826) — the two refs are 29m apart on the same
    // day. First Broad Drive is a ride through Grovely Wood, so both names
    // describe the same field. Kept under the Temporary Temples record because
    // it carries the research-registry formationId.
    id: "2026-06-15-great-wishford",
    formationId: "great-wishford-2026",
    date: "2026-06-15",
    title: "Great Wishford",
    aliases: ["First Broad Drive"],
    mergedIds: ["2026-06-15-first-broad-drive"],
    location: "Nr Grovely Woods, Great Wishford, Wiltshire, UK · Map ref SU0556533826",
    description: "Reported 15 June 2026 in young wheat near Grovely Woods, measuring approximately 120ft in diameter, and logged by Crop Circle Connector as the season's fourth confirmed formation. Temporary Temples describe it as another three-fold design with fascinating geometry and symbolism. The formation lasted only three days before the farmer cut it — one day before Temporary Temples' planned aerial flight — so their own coverage is drone stills by Tomasz Kaczmarek; the aerial video below comes from Crop Circle Connector's report of the same formation.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/great-wishford-2026",
    sourceName: "Temporary Temples",
    youtubeId: "we8EFnHEP14",
    references: [
      { label: "Temporary Temples — Great Wishford", url: "https://temporarytemples.co.uk/project/great-wishford-2026" },
      { label: "Crop Circle Connector — First Broad Drive", url: "https://www.cropcircleconnector.com/2026/first/first2026a.html" }
    ]
  },
  {
    id: "2026-05-31-ditcheat",
    formationId: "ditcheat-2026",
    date: "2026-05-31",
    title: "Ditcheat",
    location: "Nr Ditcheat & Pennard Hill, Somerset, UK · Map ref ST6167037280",
    description: "Reported 31 May 2026 in young wheat — the first crop circle of the 2026 season to appear in wheat rather than barley or oilseed rape. A three-fold, roughly 120ft design bearing a passing resemblance to the Strophalos (Hecate's Wheel) symbol.",
    tags: ["UK", "Somerset", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/project/ditcheat-2026",
    sourceName: "Temporary Temples",
    youtubeId: null
  },
  {
    id: "2026-05-22-white-sheet-downs",
    date: "2026-05-22",
    title: "White Sheet Downs",
    location: "Nr Mere, Wiltshire, UK · Map ref ST7995735447",
    description: "Third formation of the 2026 season, reported on 22 May on White Sheet Downs near Mere. Aerial footage filmed by Stonehenge Dronescapes, with additional aerial coverage from photographer Hugh Newman.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/white/white2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "alAdRZoutEM"
  },
  {
    id: "2026-05-10-kingweston-somerset",
    date: "2026-05-10",
    title: "Kingweston (Near Snap Hill)",
    aliases: ["Christian's Cross"],
    location: "Nr Snap Hill, Kingweston, Somerset, UK · Map ref ST5213029852",
    description: "First reported 10 May 2026 in young barley as a six-fold spinner design roughly 150ft in diameter; by 13 May, six additional curved paths had appeared in stages, making the pattern more complex.",
    tags: ["UK", "Somerset", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/project/kingweston-2026",
    sourceName: "Temporary Temples",
    youtubeId: null
  },
  {
    id: "2026-05-08-jacks-castle-plantation",
    date: "2026-05-08",
    title: "Jack's Castle Plantation",
    location: "Nr Alfred's Tower, Wiltshire, UK · Map ref ST7494035495",
    description: "Second formation of the 2026 season, reported 8 May near Alfred's Tower. Landowner access for ground photography was not yet granted as of the initial report, so most early documentation is aerial.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/jack/jack2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "ogoiKcXSk0Y"
  },
  {
    id: "2026-04-29-waden-hill",
    date: "2026-04-29",
    title: "Waden Hill",
    location: "Nr Avebury, Wiltshire, UK · Map ref SU1053268965",
    description: "The first confirmed formation of the UK's 2026 season, reported 29 April on Waden Hill near Avebury — opening the season just as the winter wheat reached the right height for a clean lay.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/wadenhill/wadenhill2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "LQO9XUtjwno"
  },
  {
    id: "2026-04-04-ilchester",
    date: "2026-04-04",
    title: "Ilchester (Bondip Hill)",
    location: "Bondip Hill, Nr Ilchester, Somerset, UK · Map ref ST5200324129",
    description: "Reported 4 April 2026 (Easter Sunday) in oilseed rape on Bondip Hill, north of the A303, measuring approximately 100ft. A cross-shaped formation with a central ring; Temporary Temples' geometric analysis notes concentric circles, octagrams, squares, and pentagonal ratios in the design. The first UK formation of the 2026 season, predating Waden Hill by 25 days.",
    tags: ["UK", "Somerset", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/ilchester-2026",
    sourceName: "Temporary Temples",
    youtubeId: "9kqt3QucmiY"
  }
];

/* ==========================================================================
   COVERAGE — community happenings that aren't tied to one formation.
   ==========================================================================
   STORIES above is formation-first: every entry is a specific circle in a
   specific field. That leaves nowhere to log a documentary, a conference, a
   researcher interview, a book release, or a notable YouTube deep-dive — so
   they go here instead, and the "Recent coverage" widget renders both lists
   merged and sorted by date.

   Field reference:
     id        — unique slug, e.g. "2026-06-02-doc-circular-evidence"
     date      — "YYYY-MM-DD", when it was published/aired/held
     kind      — one of: "article" | "video" | "documentary" | "podcast"
                 | "event" | "community".  Drives the badge + icon.
     title     — headline / title of the piece
     outlet    — publisher, channel, or venue, e.g. "BBC Four", "Temporary Temples"
     url       — link to the piece (required)
     summary   — OPTIONAL. 1-3 sentences of plain text. Shown in full on the
                 most recent items, so make it genuinely informative.
     youtubeId — OPTIONAL. Video ID only, when the piece is on YouTube.
     durationMin — OPTIONAL. Runtime in minutes, for video/documentary/podcast.
     formationId — OPTIONAL. Canonical registry id, if it centers on one
                 formation (see the STORIES field reference above).

   SOURCING RULE — same bar as STORIES: only add something that has been
   verified to exist at a resolvable URL. An empty list is correct and
   expected; a plausible-sounding invented documentary is not.
   ========================================================================== */
window.COVERAGE = [
  // Newest first. Every entry below was verified by opening the page: the URL
  // returns 200 and the summary describes what the piece actually says. This is
  // coverage ABOUT crop circles — commentary, interviews, news, podcasts,
  // events — NOT the per-formation report pages, which are the STORIES feed.
  {
    id: "2026-08-04-croppie-gossip-in-a-field-in-wiltshire",
    date: "2026-08-04",
    kind: "community",
    title: "Croppie Gossip: In A Field In Wiltshire…",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/08/04/croppie-gossip-in-a-field-in-wiltshire/",
    summary: "Investigates a suspicious overhead photo of an alleged August 2026 Wiltshire formation, posted via a fake Facebook account ('WiltshireWerewolf/Shortdude Bob'). Analyst Nick Bull identified Photoshop clone-tool artifacts in the image, indicating the photograph was digitally fabricated. The article also speculates on the identity of the person behind the account based on stylistic and contextual clues."
  },
  {
    id: "2026-08-01-croppie-gossip-new-month",
    date: "2026-08-01",
    kind: "community",
    title: "Croppie Gossip: New Month, Not Quite So New Things",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/08/01/croppie-gossip-new-month-not-quite-so-new-things/",
    summary: "End-of-season commentary column critiquing a circle maker who publicly claims the title of 'master', contrasting self-promotion with the genuine complexity of landmark formations such as Milk Hill and Chilbolton. A second item speculates about a sighting of musician and crop-circle enthusiast Prashant Trivedi in a recent Facebook post."
  },
  {
    id: "2026-07-21-croppie-gossip-crop-cutting",
    date: "2026-07-21",
    kind: "community",
    title: "Croppie Gossip: Crop Cutting, Crop Marks, Crop Clubs",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/07/21/croppie-gossip-crop-cutting-crop-marks-crop-crazies/",
    summary: "Season round-up arguing the 2026 season is ending early, as unusual weather brought the wheat harvest forward and destroyed the remaining formations. Also covers Mark Byrne's argument that crop circles obscure archaeologically important crop marks, and a debunking of the idea that organised circle-making clubs operate in Britain."
  },
  {
    id: "2026-07-18-croppie-gossip-conspiracy-camel",
    date: "2026-07-18",
    kind: "community",
    title: "Croppie Gossip: The Crying Conspiracy Camel",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/07/18/croppie-gossip-the-crying-conspiracy-camel/",
    summary: "Mid-season commentary column from The Croppie on the conspiracy claims circulating around the 2026 season."
  },
  {
    id: "2026-07-17-circles-festival",
    date: "2026-07-17",
    kind: "event",
    title: "The Circles Festival 2026",
    outlet: "Crop Circle Access",
    url: "https://www.cropcircleaccess.com/the-circles-festival-2026/",
    summary: "Three-day in-person gathering at Honeystreet Village, Wiltshire (July 17–19), marking the 25th anniversary of the Milk Hill Galaxy spiral and the Chilbolton Face & Message circles of 2001. Featured talks, films, a festival fair, workshops, field tours, and night watching under the stars."
  },
  {
    id: "2026-06-20-unknown-country-wilton",
    date: "2026-06-20",
    kind: "article",
    title: "Intricate Crop Circle Appears Near Wilton as 2026 Season Continues",
    outlet: "Whitley Strieber's Unknown Country",
    url: "https://unknowncountry.com/headline-news/intricate-crop-circle-appears-near-wilton-as-2026-season-continues/",
    summary: "News write-up of the season's fourth formation, describing drone footage of a complex geometric pattern of interconnected circles. Notes that roughly 80% of UK crop circles appear in Wiltshire and that annual UK totals run around thirty formations, and sets out the competing human-made and unexplained readings without endorsing either."
  },
  {
    id: "2026-06-09-wondering-monsters-ep29",
    date: "2026-06-09",
    kind: "podcast",
    title: "Crop Circles Explained? Mystery, Hoaxes, and Unanswered Questions",
    outlet: "Wondering Monsters Podcast (Ep. 29)",
    url: "https://wonderingmonsterspodcast.com/crop-circles-explained.php",
    summary: "Episode-length survey of the phenomenon: the Doug Bower and Dave Chorley board-and-string claims, the 1996 Stonehenge Julia Set, expulsion cavities in plant nodes, ball lightning and plasma vortex theories, Operation Blackbird, and the 2001 Arecibo response formation."
  },
  {
    id: "2026-05-15-dear-croppie-imprint",
    date: "2026-05-15",
    kind: "article",
    title: "Dear Croppie: Why Do Crop Circles Leave Their Imprint Behind After Harvest?",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/05/15/dear-croppie-why-do-crop-circles-leave-their-imprint-behind-immediately-after-they-are-harvested/",
    summary: "Reader-question column on why a formation's outline stays visible in the stubble immediately after a field has been harvested."
  },
  {
    id: "2026-05-01-circle-makers-speak-12",
    date: "2026-05-01",
    kind: "article",
    title: "Circle Makers Speak #12: Q&A Session (Part One)",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/05/01/circle-makers-speak-12-qa-session-part-one/",
    summary: "First part of a reader Q&A with a working circle maker, drawn from more than seventy submitted questions. Covers how they learned the craft, why they keep making formations, and their view of landmark circles such as Milk Hill."
  },
  {
    id: "2026-04-24-circle-makers-not-grassing",
    date: "2026-04-24",
    kind: "article",
    title: "No, Circle Makers Are Not Grassing On Each Other",
    outlet: "The Croppie",
    url: "https://thecroppie.com/2026/04/24/no-circle-makers-are-not-grassing-on-each-other/",
    summary: "Rebuts the rumour that rival circle-making teams report each other to the police, arguing it would only invite scrutiny on themselves. Attributes the actual complaints to farmers and rural residents who follow the makers' own public social media posts."
  }
  // Added by the daily scan (see dashboard_scan_prompt.md, Step 2c) and by hand.
  // Rules that matter: the URL must resolve and you must have read the page; the
  // piece must be about crop circles generally rather than a single formation
  // report (those belong in STORIES); and it must be recent. Never invent an
  // item — an honestly short list is correct, a padded one is not.
  //
  // {
  //   id: "2026-06-02-example-doc",
  //   date: "2026-06-02",
  //   kind: "documentary",
  //   title: "…",
  //   outlet: "…",
  //   url: "https://…",
  //   summary: "…",
  //   youtubeId: null,
  //   durationMin: 58
  // }
];

/* ==========================================================================
   DISCUSSION_FORUMS — standing discussion venues for the "Discussion forums"
   widget. Was REDDIT_FORUMS until 2026-08-01; renamed when two non-Reddit
   forums were added, since the old name became inaccurate.
   ==========================================================================
   Static links, not a live feed: none of these platforms send CORS headers
   a static site can fetch and re-render, so these are one-tap entry points
   rather than embedded content. Ordered most-relevant first.

   The four Reddit entries: added from knowledge and STILL unverified — a
   2026-07-31 attempt failed on every available route (curl to
   www.reddit.com/r/NAME/about.json returns 403 with an HTML shell;
   old.reddit.com redirects to a login wall and does so identically for a
   deliberately fake subreddit name, so the method can't tell a live sub from
   a dead one; the agent browser blocks reddit.com by policy; the search tool
   can't crawl reddit.com). r/aliens was dropped 2026-08-01 on user request
   rather than re-attempted — it was the weakest of the four anyway (general
   "speculative discussion," not actually crop-circle-adjacent the way
   r/HighStrangeness or r/UFOs are). What will actually verify the remaining
   three: open them in an ordinary logged-in browser, or use the Reddit OAuth
   client-credentials token the #5b social feed already needs (see TODO.md),
   which lifts the 403. Drop any that don't resolve to a live, on-topic sub.

   The two non-Reddit entries below WERE verified live on 2026-08-01 (real
   network access, not the sandboxed agent browser): curl confirmed both
   domains resolve and return 200, and both linked threads contain genuine,
   current-season crop-circle discussion (checked by grepping the fetched
   page for "crop circle" and reading the <title>). Three other candidates
   were tried and rejected on the same pass: abovetopsecret.com's origin
   server is down (Cloudflare 522, confirmed via `curl -v`, not just a bot
   block); unexplained-mysteries.com/forum/ returns HTTP 410 with a page
   titled "The Forum Has Closed"; godlikeproductions.com returns 403 to curl
   under two different user agents and can't be verified either way.

   Both new entries are single active threads, not standing boards — neither
   forum has a crop-circle-specific board, and their own site search only
   works via a JS-driven POST form (no linkable GET results page exists to
   use instead). That means, unlike the subreddits, these two rows will need
   manual refreshing once the linked thread goes quiet or a new season starts
   and a fresh thread appears elsewhere on the same forum.

     name  — display label, e.g. "r/cropcircles"
     url   — full https URL to the subreddit / thread
     note  — short line on what it's good for (one clause, no period)
   ========================================================================== */
window.DISCUSSION_FORUMS = [
  {
    name: "r/cropcircles",
    url: "https://www.reddit.com/r/cropcircles/",
    note: "the dedicated subreddit — new formations posted each season"
  },
  {
    name: "r/HighStrangeness",
    url: "https://www.reddit.com/r/HighStrangeness/",
    note: "wider anomalous-phenomena discussion, regular crop circle threads"
  },
  {
    name: "r/UFOs",
    url: "https://www.reddit.com/r/UFOs/",
    note: "large general forum, crop circles surface around major reports"
  },
  {
    name: "Cassiopaea Forum",
    url: "https://cassiopaea.org/forum/threads/2026-crop-circles.57805/",
    note: "this season's dedicated thread on a long-running paranormal-research forum"
  },
  {
    name: "Paranormal Forum",
    url: "https://paranormalforum.net/threads/first-crop-circle-of-26.37059/",
    note: "this season's opening thread — active general paranormal/anomalies board"
  }
];
