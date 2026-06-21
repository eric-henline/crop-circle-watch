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
     socialPosts — OPTIONAL. Array of { platform, url } objects for individual
                   posts the scan finds and verifies by hand, e.g.
                   { platform: "x", url: "https://x.com/someone/status/123" }
                   or { platform: "bluesky", url: "https://bsky.app/profile/.../post/..." }.
                   These render as plain outbound link-cards in the "Live
                   chatter" widget — never as embedded iframes. (Live,
                   keyword-searchable embeds aren't reliably embeddable on a
                   static site on either platform as of 2026, so curated
                   links + the keyword search-launcher below are the honest
                   substitute. See README.md.)

   The automated daily scan (see ../README.md and the scheduled task) adds
   new objects to the TOP of this array and updates DASHBOARD_META.lastScan.
   It never deletes or rewrites existing entries — edits/corrections to past
   entries are done by hand.
   ========================================================================== */

window.DASHBOARD_META = {
  // Updated automatically by the daily scan. ISO 8601 with explicit offset
  // so it renders the same regardless of the visitor's timezone settings.
  lastScan: "2026-06-20T10:15:00-07:00",
  seasonLabel: "2026 UK season",
  // Seeds the "Live chatter" keyword chips on a visitor's first visit. After
  // that, each visitor's own additions/removals are kept in their browser's
  // localStorage and this list is ignored for them.
  defaultKeywords: ["crop circle 2026", "Wiltshire crop circle", "crop circle UK"]
};

window.STORIES = [
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
