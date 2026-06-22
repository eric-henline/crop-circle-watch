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

echo "" >> "$LOG"
echo "=== Scan runner started: $(date) ===" >> "$LOG"

if ! command -v claude &>/dev/null; then
  echo "ERROR: 'claude' CLI not found in PATH ($PATH)" >> "$LOG"
  exit 1
fi
echo "Using claude: $(command -v claude)" >> "$LOG"

cd "$REPO_DIR" || { echo "ERROR: dashboard directory not found at $REPO_DIR" >> "$LOG"; exit 1; }

if [ ! -f "$PROMPT_FILE" ]; then
  echo "ERROR: prompt file not found at $PROMPT_FILE" >> "$LOG"
  exit 1
fi
PROMPT="$(cat "$PROMPT_FILE")"

claude -p "$PROMPT" \
  --allowedTools "Read,Edit,WebSearch,WebFetch,Bash(git *),Bash(node *),Bash(cd *)" \
  >> "$LOG" 2>&1
EXIT_CODE=$?

echo "=== Scan runner finished: $(date) (exit $EXIT_CODE) ===" >> "$LOG"
exit $EXIT_CODE
