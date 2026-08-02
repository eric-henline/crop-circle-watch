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
#
# `git add -A` here is deliberately indiscriminate, which is fine for a stray
# data file and not fine for anything else — this job has no idea what it is
# sweeping up. hooks/pre-commit is the check on that: it rejects unattended
# commits of anything outside the data files (see SECURITY.md), and launchd
# gives this job no TTY, so the guard is active every time it matters.
#
# A rejected commit is the correct outcome, not a malfunction: it means files
# a human has not reviewed were sitting in the tree. Report it and skip the
# push rather than pushing a half-committed state.
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  if ! git commit -m "Auto-commit: local changes as of $(date '+%Y-%m-%d %H:%M')" >> "$LOG" 2>&1; then
    echo "ERROR: auto-commit rejected (see pre-commit guard) — not pushing" >> "$LOG"
    git reset >> "$LOG" 2>&1
    "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: push skipped" \
      "Uncommitted non-data files in the dashboard repo — review and commit by hand"
    echo "=== Push runner finished: $(date) (exit 1, commit rejected) ===" >> "$LOG"
    exit 1
  fi
fi

git push origin HEAD:master >> "$LOG" 2>&1
EXIT_CODE=$?

echo "=== Push runner finished: $(date) (exit $EXIT_CODE) ===" >> "$LOG"
exit $EXIT_CODE
