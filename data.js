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
  lastScan: "2026-07-16T09:15:00-07:00",
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
    id: "2026-07-14-avebury-henge",
    date: "2026-07-14",
    title: "Avebury Henge",
    location: "Nr Avebury, Wiltshire, UK",
    description: "Reported 14 July 2026 near the historic Avebury Henge. Aerial footage credited to Stonehenge Dronescapes; no written report from Crop Circle Connector or Temporary Temples was available yet at time of writing, so design details and an exact map reference are not yet confirmed.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.youtube.com/watch?v=f8LDLG2lsUw",
    sourceName: "Stonehenge Dronescapes (YouTube)",
    youtubeId: "f8LDLG2lsUw"
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
    tags: ["UK", "Wiltshire", "2026 season"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/Maccoombe/Maccoombe2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: null
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
    youtubeId: "6XH_1dCBFQM"
  },
  {
    id: "2026-07-03-alfreds-castle",
    date: "2026-07-03",
    title: "Alfred's Castle (Double Circle)",
    location: "Nr Ashbury & Bishopstone, Oxfordshire, UK · Map ref SU2772882233",
    description: "Two formations appeared the same night of 3 July 2026 on opposite sides of the Alfred's Castle earthwork: an old-fashioned dumbbell design with a crescent-moon motif, and a central circle with fine concentric rings.",
    tags: ["UK", "Oxfordshire", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/alfreds-castle-2026",
    sourceName: "Temporary Temples",
    youtubeId: "oqcf0UnEU1U"
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
    location: "Nr Cedar Walk Plantation, Kingweston, Somerset, UK · Map ref ST5213531746",
    description: "Reported on the summer solstice, 21 June 2026, in young wheat near Cedar Walk Plantation and Kingweston House. Temporary Temples describe an eight-fold design roughly 180ft in diameter, with lollipop motifs and four eye-shapes at the centre. The farmer has requested no public access to the field.",
    tags: ["UK", "Somerset", "2026 season", "video"],
    sourceUrl: "https://temporarytemples.co.uk/project/kingweston2-2026",
    sourceName: "Temporary Temples",
    youtubeId: "FaVfeWRw2nw"
  },
  {
    id: "2026-06-15-first-broad-drive",
    date: "2026-06-15",
    title: "First Broad Drive",
    location: "Nr Wilton, Wiltshire, UK · Map ref SU0559233836",
    description: "The fourth confirmed formation of the 2026 UK season, found in a field near Wilton on 15 June. Picked up by Crop Circle Connector and covered the same week by Unknown Country as a fresh, newly-discovered design — not a repeat of an earlier formation.",
    tags: ["UK", "Wiltshire", "2026 season", "video"],
    sourceUrl: "https://www.cropcircleconnector.com/2026/first/first2026a.html",
    sourceName: "Crop Circle Connector",
    youtubeId: "we8EFnHEP14"
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
    id: "2026-06-15-great-wishford",
    formationId: "great-wishford-2026",
    date: "2026-06-15",
    title: "Great Wishford",
    location: "Nr Grovely Woods, Great Wishford, Wiltshire, UK · Map ref SU0556533826",
    description: "Reported 15 June 2026 in young wheat near Grovely Woods, measuring approximately 120ft in diameter. Temporary Temples describe it as another three-fold design with fascinating geometry and symbolism. The formation lasted only three days before the farmer cut it — one day before Temporary Temples' planned aerial flight — so drone stills by Tomasz Kaczmarek exist but no aerial video was recorded.",
    tags: ["UK", "Wiltshire", "2026 season"],
    sourceUrl: "https://temporarytemples.co.uk/project/great-wishford-2026",
    sourceName: "Temporary Temples",
    youtubeId: null
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
  }
];
