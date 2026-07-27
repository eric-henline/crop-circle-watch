#!/bin/bash
# ============================================================
# Crop Circle Watch — daily scan runner (Mac-side)
#
# Called by launchd at 6:58 AM, 3 minutes after the existing 6:55 AM
# pmset wake (shared with the image-downloader job in ../images/).
# Runs Claude Code headless (`claude -p`) with full network access to
# search for, verify, and log new crop-circle formations into data.js,
# then commits (and pushes, if a remote is configured) the result.
# See dashboard_scan_prompt.md for the actual task instructions.
#
# Replaces the old Cowork-sandbox version of this scan, which could
# search the web but couldn't push (no network egress to github.com
# from that sandbox) — it just committed locally and left the 7:10 AM
# push job to catch up later. That Cowork scheduled task has been
# disabled; this script now owns the daily scan end to end.
#
# Requires the `claude` CLI to be installed AND already authenticated
# on this Mac — run `claude login` once interactively first (or set
# ANTHROPIC_API_KEY, see the ~/.anthropic_key note below). This is the
# first piece of automation in this project that depends on Claude
# Code running unattended; the image-downloader job deliberately used
# plain Python instead, specifically to avoid this dependency. Treat
# this job as less proven until you've watched it succeed a few
# mornings in a row — check scan_log.txt / scan_errors.txt.
# ============================================================

export HOME="/Users/erichenline"
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:$HOME/.claude/local/bin:/usr/bin:/bin"

# Do NOT load ~/.anthropic_key here. If that file sets ANTHROPIC_API_KEY to
# an exhausted or invalid key, it overrides the OAuth session from `claude login`
# and every run fails with "Credit balance is too low." The `claude` CLI
# already picks up OAuth credentials via the keychain from `claude login` —
# no explicit key is needed. If you ever need an explicit API key, set
# ANTHROPIC_API_KEY in the launchd plist's EnvironmentVariables block instead,
# not here where it silently clobbers the working OAuth session.
#
# if [ -f "$HOME/.anthropic_KEY" ]; then
#   source "$HOME/.anthropic_key"
# fi

# ---- Long-lived token (preferred) -------------------------------------------
# Created by `claude setup-token`; valid ~1 year. This exists because the
# interactive claude.ai OAuth session is not a credential a unattended job can
# rely on: its refresh chain broke on 2026-07-19 and never recovered on its own,
# and 8 consecutive 06:58 runs failed at authentication before anyone noticed.
#
# Read, not sourced — the file holds the bare token and nothing else, so a stray
# `export ANTHROPIC_API_KEY=` line in it can't silently clobber the session (the
# exact trap documented above). Absent or empty file: fall through to the
# keychain OAuth session, so this stays backward compatible.
TOKEN_FILE="$HOME/.claude-code-token"
if [ -r "$TOKEN_FILE" ]; then
  CLAUDE_CODE_OAUTH_TOKEN="$(tr -d ' \t\r\n' < "$TOKEN_FILE")"
  if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    export CLAUDE_CODE_OAUTH_TOKEN
  else
    unset CLAUDE_CODE_OAUTH_TOKEN
  fi
fi

REPO_DIR="$HOME/Projects/crop-circles/dashboard"
PROMPT_FILE="$REPO_DIR/dashboard_scan_prompt.md"
LOG="$REPO_DIR/scan_log.txt"
ERRLOG="$REPO_DIR/scan_errors.txt"

# Wall-clock cap on the whole headless run. Without this, a hung or looping
# `claude -p` call (waiting on something that never resolves, stuck in a
# retry loop, etc.) would block indefinitely and could still be running when
# tomorrow's 6:58 AM job fires. 15 minutes is generous for what this task
# normally takes (a handful of searches + a few fetches + a git commit).
TIMEOUT_SECONDS=900

echo "" >> "$LOG"
echo "=== Scan runner started: $(date) ===" >> "$LOG"

if ! command -v claude &>/dev/null; then
  echo "ERROR: 'claude' CLI not found in PATH ($PATH)" | tee -a "$LOG" "$ERRLOG" >/dev/null
  exit 1
fi
echo "Using claude: $(command -v claude)" >> "$LOG"

cd "$REPO_DIR" || { echo "ERROR: dashboard directory not found at $REPO_DIR" | tee -a "$LOG" "$ERRLOG" >/dev/null; exit 1; }

# ---- Pre-flight: is authentication actually alive? --------------------------
# The 2026-07-19 outage burned 8 consecutive runs on calls that could only ever
# 401, and reported them as a generic "exit 1". This checks first, so a dead
# credential is named as such instead of being discovered from the stack trace.
#
# NB: do NOT gate on the token's expiresAt. The access token lives 8 hours and
# this job runs every 24, so at 06:58 it is *always* expired — the CLI is meant
# to silently refresh it. Gating on expiry would skip every single run. Only
# an explicit loggedIn:false means the session is genuinely unrecoverable.
#
# Fails OPEN by design: if `claude auth status` is missing, slow, or returns
# anything we can't parse, we run the scan anyway. A pre-flight check must
# never become a new reason the job doesn't happen.
preflight_auth() {
  # The setup-token / API-key path has no keychain session to inspect. Instead
  # warn on AGE: a setup-token is valid ~1 year, which unlike the OAuth refresh
  # chain is a deterministic expiry we can actually get ahead of. The token
  # file's mtime is its creation date — no extra state to keep in sync.
  if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Pre-flight: explicit token in environment, skipping session check" >> "$LOG"
    if [ -f "$TOKEN_FILE" ]; then
      local age_days
      age_days=$(( ( $(date +%s) - $(stat -f %m "$TOKEN_FILE") ) / 86400 ))
      echo "Pre-flight: token is ${age_days}d old" >> "$LOG"
      # 335d ≈ 11 months: a month of mornings to act before it lapses.
      if [ "$age_days" -ge 335 ]; then
        "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: token expiring" \
          "Auth token is ${age_days}d old (~1y limit) — run: claude setup-token"
      fi
    fi
    return 0
  fi

  local status logged_in
  status="$(claude auth status 2>/dev/null)" || return 0
  logged_in="$(printf '%s' "$status" | python3 -c \
    'import sys,json
try: print(json.load(sys.stdin).get("loggedIn"))
except Exception: print("unknown")' 2>/dev/null)" || return 0

  if [ "$logged_in" = "False" ] || [ "$logged_in" = "false" ]; then
    echo "ERROR: not logged in — skipping run (would 401)" | tee -a "$LOG" "$ERRLOG" >/dev/null
    "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: scan skipped" \
      "Not logged in — run: claude login"
    return 1
  fi

  echo "Pre-flight: auth OK (loggedIn=$logged_in)" >> "$LOG"
  return 0
}

if ! preflight_auth; then
  echo "=== Scan runner finished: $(date) (exit 1, auth pre-flight) ===" >> "$LOG"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "ERROR: prompt file not found at $PROMPT_FILE" | tee -a "$LOG" "$ERRLOG" >/dev/null
  exit 1
fi
PROMPT="$(cat "$PROMPT_FILE")"

# macOS doesn't ship GNU `timeout` — Homebrew's coreutils installs it as
# `gtimeout` by default to avoid clashing with anything else named timeout.
# Use whichever is actually on PATH; if neither is, fall back to running
# without a cap rather than failing the job outright (the rest of this
# script's job is more important than the timeout being present).
TIMEOUT_BIN=""
if command -v timeout &>/dev/null; then
  TIMEOUT_BIN="timeout"
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_BIN="gtimeout"
else
  echo "WARNING: no 'timeout'/'gtimeout' on PATH — running without a time cap. Install via 'brew install coreutils' to enable it." >> "$LOG"
fi

if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" "$TIMEOUT_SECONDS" claude -p "$PROMPT" \
    --allowedTools "Read,Edit,WebSearch,WebFetch,Bash(git *),Bash(node *),Bash(cd *)" \
    >> "$LOG" 2>&1
else
  claude -p "$PROMPT" \
    --allowedTools "Read,Edit,WebSearch,WebFetch,Bash(git *),Bash(node *),Bash(cd *)" \
    >> "$LOG" 2>&1
fi
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
  echo "ERROR: scan timed out after ${TIMEOUT_SECONDS}s and was killed" >> "$LOG"
fi

# scan_errors.txt is meant to be the thing worth checking when something's
# wrong, without combing the full (noisy, normal-by-default) scan_log.txt.
# A non-zero exit means the run itself failed (not "found nothing today",
# which is exit 0) — copy the tail of this run's log into the error log so
# it's actually populated, instead of a file the docs promise but nothing
# ever writes to.
if [ $EXIT_CODE -ne 0 ]; then
  {
    echo ""
    echo "=== Scan failed: $(date) (exit $EXIT_CODE) ==="
    tail -n 100 "$LOG"
  } >> "$ERRLOG"

  # Surface the failure immediately as a native macOS notification, instead
  # of relying on someone eventually reading scan_log.txt. This is the fix
  # for the OAuth-expiry incident: the scan silently failed at
  # authentication for days before anyone noticed, because a failure that
  # happens before the script can even touch data.js never shows up as the
  # dashboard's own amber "flagged/error" indicator — that only works once
  # the scan gets far enough to write DASHBOARD_META.lastScanStatus. A
  # wrapper-level notification is the only place this class of failure can
  # be caught. Pattern-match the tail for the known failure modes so the
  # alert says what to *do*, not just that something broke.
  TAIL_TEXT="$(tail -n 30 "$LOG")"
  if echo "$TAIL_TEXT" | grep -qi "OAuth access token has expired\|Not logged in"; then
    REASON="Auth expired — run: claude login"
  elif echo "$TAIL_TEXT" | grep -qi "credit balance is too low"; then
    REASON="Anthropic credit balance too low — check billing"
  elif echo "$TAIL_TEXT" | grep -qi "Invalid authentication credentials"; then
    REASON="Invalid credentials — check claude login / ANTHROPIC_API_KEY"
  elif [ "$EXIT_CODE" -eq 124 ]; then
    REASON="Timed out after ${TIMEOUT_SECONDS}s"
  elif echo "$TAIL_TEXT" | grep -qi "'claude' CLI not found"; then
    REASON="claude CLI missing from PATH"
  else
    REASON="Exit code $EXIT_CODE — see scan_errors.txt"
  fi
  "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: scan failed" "$REASON"
fi

echo "=== Scan runner finished: $(date) (exit $EXIT_CODE) ===" >> "$LOG"

# Both logs are append-only and nothing ever trimmed them — a repeating failure
# (the OAuth expiry ran for a week) dumps 100 lines into scan_errors.txt every
# morning, which is how it reached 178 KB. Keep the newest 2000 lines of each.
for f in "$LOG" "$ERRLOG"; do
  if [ -f "$f" ] && [ "$(wc -l < "$f")" -gt 2000 ]; then
    tail -n 2000 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done

exit $EXIT_CODE
