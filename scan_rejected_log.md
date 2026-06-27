# Crop Circle Watch — scan rejection log

Append-only. The daily scan (see `dashboard_scan_prompt.md`) writes one
line here per candidate URL it fetched and rejected, so future runs can
skip re-checking a known dead end instead of re-fetching and re-judging it.
Not meant to be hand-edited, though it's safe to trim old entries if this
file gets long.

Format: `- YYYY-MM-DD | <url> | <reason>`
