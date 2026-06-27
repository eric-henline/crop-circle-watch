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

# Load ANTHROPIC_API_KEY from ~/.anthropic_key if present (keeps the key
# out of this script). Only needed as a fallback if `claude` isn't
# already logged in via `claude login` (OAuth/keychain) on this Mac —
# either auth method works with the invocation below.
if [ -f "$HOME/.anthropic_key" ]; then
  source "$HOME/.anthropic_key"
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
fi

echo "=== Scan runner finished: $(date) (exit $EXIT_CODE) ===" >> "$LOG"
exit $EXIT_CODE
