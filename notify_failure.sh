#!/bin/bash
# ============================================================
# notify_failure.sh — native macOS alert for a broken scheduled job
#
# Usage: notify_failure.sh "<title>" "<message>"
#
# Fires a Notification Center alert (banner + sound + persists in
# Notification Center history until dismissed, so it's still visible even
# if nobody's looking at the screen when the 6:58 AM job runs) via
# `osascript`. This is the thing that makes a broken automation loud
# instead of silently failing for weeks — see the incident this fixes:
# the OAuth token expired on 2026-07-xx and every scan run failed at
# authentication for several days before anyone noticed, because nothing
# outside scan_log.txt / scan_errors.txt ever surfaced it.
#
# Deliberately just this one mechanism (no email/SMS/Slack): this is a
# personal Mac that's awake for the job anyway (pmset), and Notification
# Center history means a missed banner isn't a missed alert.
# ============================================================

TITLE="${1:-Crop Circle Watch}"
MESSAGE="${2:-A scheduled job failed. Check its log.}"

if command -v osascript &>/dev/null; then
  osascript -e "display notification \"${MESSAGE//\"/\\\"}\" with title \"${TITLE//\"/\\\"}\" sound name \"Basso\"" 2>/dev/null
fi
