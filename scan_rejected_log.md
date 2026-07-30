# Crop Circle Watch — scan rejection log

Append-only. The daily scan (see `dashboard_scan_prompt.md`) writes one
line here per candidate URL it fetched and rejected, so future runs can
skip re-checking a known dead end instead of re-fetching and re-judging it.
Not meant to be hand-edited, though it's safe to trim old entries if this
file gets long.

Format: `- YYYY-MM-DD | <url> | <reason>`

- 2026-07-27 | https://temporarytemples.co.uk/project/ilchester-2026 | outside scan window (April 4 formation) — genuine missing entry, add manually; video youtubeId 9kqt3QucmiY confirmed; predates Waden Hill as first 2026 UK formation
- 2026-07-27 | https://www.cropcircleconnector.com/2026/walker/walker2026a.html | outside scan window (June 29 formation) — confirmed human-made, commissioned for Sky History TV series with Bradley Walsh; not a mysterious formation
- 2026-07-27 | https://www.modenatoday.it/cronaca/cerchi-nel-grano-finale-emilia.html | unverifiable (HTTP 403 on fetch); no Italian 2026 formations confirmed from any source
- 2026-07-28 | https://www.kreisbote.de/lokales/weilheim-schongau/kornkreis-fischenpaehl-13854364.html | stale date — article published 07 Aug 2020; Pähl/Fischen formation is from July 2020, not 2026
- 2026-07-28 | https://temporarytemples.co.uk/project/waylands-smithy-2026 | duplicate — same formation as Odstone Barn (CCC, Jul 16 2026, SU2797284836); TT calls it "Wayland's Smithy" but OS grid refs and date match; already in database as 2026-07-16-odstone-barn
- 2026-07-29 | https://www.abendzeitung-muenchen.de/bayern/schon-wieder-ein-kornkreis-am-ammersee-art-1070778 | stale date — article published July 24, 2025; Frieding/Andechs formation is from July 2025, not 2026; already in formations.md as Frieding/Andechs 2025
- 2026-07-29 | https://www.cropcircleaccess.com/latestcropcircles/gurston-ashes-nr-fovant-wiltshire-reported-23rd-july/ | stale date — formation from 2018, not 2026; CropCircleAccess page is undated and surfaced by search as a 2026 candidate but image metadata confirms 2018
