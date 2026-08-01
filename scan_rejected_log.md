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
- 2026-07-30 | https://feeds.bbci.co.uk/news/articles/c51y8pjd14ro | unverifiable (HTTP 404); BBC article about a Dorset crop circle, surfaced in search results but page no longer exists
- 2026-07-31 | https://www.amper-kurier.de/de/region/alling/der-kornkreis-bei-genauerem-betrachten | stale date — article published 30 Jul 2015; Biburg/Alling formation is from 2015, not 2026
- 2026-07-31 | https://www.youtube.com/watch?v=jyjwBaQHj4s | not a new formation / not legitimate coverage — clickbait AI-generated video "AI Decoded the Truth Behind Mysterious Crop Circles 2026", no verifiable production details
- 2026-08-01 | https://www.landundforst.de/niedersachsen/bild-tages-mysterioeser-kornkreis-begeistert-schaulustige-562679 | stale date — article published July 29, 2020; Pähl/Ammersee (Georg Steingruber) formation is from July 26, 2020, not 2026
- 2026-08-01 | https://frequencywavetheory.substack.com/p/the-16th-crop-circle-of-2026-looks | not a new formation — paywalled Substack post (July 9, 2026) theorising about a mid-July 2026 formation already in database; no verifiable new location or date
