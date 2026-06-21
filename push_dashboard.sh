#!/bin/bash
# ============================================================
# Crop Circle Watch — GitHub Pages push runner
#
# Called by launchd once a day. Pushes whatever the Cowork
# scheduled scan committed locally up to GitHub, so the public
# dashboard URL stays in sync. Does NOT change any Energy Saver
# or pmset settings — it rides on the wake schedule already set
# up for the image downloader (~/Projects/crop-circles/images/).
#
# Requires the one-time setup in README.md to be done first
# (creating the GitHub repo, `git remote add origin ...`, and an
# initial `git push -u origin master`). Until that's done this
# script logs a message and exits cleanly without erroring.
# ============================================================

export HOME="/Users/erichenline"
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

REPO_DIR="$HOME/Projects/crop-circles/dashboard"
LOG="$REPO_DIR/push_log.txt"

echo "" >> "$LOG"
echo "=== Push runner started: $(date) ===" >> "$LOG"

cd "$REPO_DIR" || { echo "ERROR: dashboard directory not found at $REPO_DIR" >> "$LOG"; exit 1; }

if [ ! -d .git ]; then
  echo "ERROR: $REPO_DIR is not a git repo. Run the one-time setup in README.md first." >> "$LOG"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No 'origin' remote configured yet — nothing to push. See README.md for one-time GitHub setup." >> "$LOG"
  exit 0
fi

# Belt-and-suspenders: commit anything left uncommitted. Under normal
# operation the daily scan task already commits its own changes.
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Auto-commit: local changes as of $(date '+%Y-%m-%d %H:%M')" >> "$LOG" 2>&1
fi

git push origin HEAD:master >> "$LOG" 2>&1
EXIT_CODE=$?

echo "=== Push runner finished: $(date) (exit $EXIT_CODE) ===" >> "$LOG"
exit $EXIT_CODE
