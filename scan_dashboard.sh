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
# ---- Social feed refresh ----------------------------------------------------
# TODO item 5b. Pulls public Bluesky posts matching crop-circle terms and
# rewrites social.js, which the dashboard loads as window.SOCIAL_FEED. Runs
# BEFORE `claude -p` so the agent's Step 7 commit picks the file up in the same
# commit as data.js.
#
# Deliberately NOT fatal. This is a decorative widget hanging off a third-party
# API with no SLA; a Bluesky outage must never stop the actual formation scan,
# which is what this job exists for. fetch_social.py also declines to overwrite
# an existing social.js when a run returns nothing, so a bad morning leaves
# yesterday's chatter up rather than blanking the widget.
if [ -f "$REPO_DIR/fetch_social.py" ]; then
  if ! python3 "$REPO_DIR/fetch_social.py" >> "$LOG" 2>&1; then
    echo "WARNING: fetch_social.py failed; continuing with the existing social.js" >> "$LOG"
  fi
fi

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

# ---- Stale git lock sweep ---------------------------------------------------
# Twice now a 0-byte lock file left behind by a crashed process has silently
# blocked the scan's commit: .git/index.lock on 2026-07-27, .git/HEAD.lock on
# 2026-08-01. Both times the agent did the full morning's research and then
# could not save it, and both times it took a human noticing to recover.
#
# git itself never cleans these up — it cannot tell a crash leftover from a
# lock held by a git process running right now. This can, because it checks
# both conditions: nothing named git is running, and the lock is older than any
# plausible in-flight operation. Under those two facts the file is garbage.
#
# Fails OPEN: if the sweep cannot decide, it leaves the lock alone and lets the
# run proceed. A guard must never become a new reason the job doesn't happen.
# 10, not 30. The 2026-08-01 lock was created at 06:29 and the scan hit it just
# after 07:00 — about 31 minutes, which a 30-minute threshold would have caught
# only by luck, and a slightly earlier crash not at all. Ten minutes is still
# orders of magnitude longer than any real git operation on a repo this size,
# and `pgrep` above has already established no git process is running, which is
# the check actually doing the work; the age is only insurance against catching
# git between fork and exec.
# Sweeps EVERY *.lock under .git, not a hardcoded list. The first version of
# this named index.lock and HEAD.lock, which is what the two known incidents
# had left behind — and then the 2026-08-02 06:59 run was blocked by a THIRD
# kind, refs/heads/master.lock, which sailed straight past it. Git creates a
# lock beside whatever file it is about to rewrite (refs, packed-refs, config,
# objects/maintenance), so enumerating them by name will always be incomplete.
# The safety conditions below are what make this safe, not the file list.
LOCK_AGE_MINS=10
if ! pgrep -x git >/dev/null 2>&1; then
  while IFS= read -r lock; do
    [ -n "$lock" ] || continue
    lock_age=$(( ( $(date +%s) - $(stat -f %m "$lock" 2>/dev/null || echo 0) ) / 60 ))
    rel="${lock#"$REPO_DIR"/.git/}"
    if [ "$lock_age" -ge "$LOCK_AGE_MINS" ]; then
      echo "Pre-flight: removing stale $rel (${lock_age}m old, no git process)" >> "$LOG"
      rm -f "$lock"
    else
      echo "Pre-flight: $rel is only ${lock_age}m old — leaving it alone" >> "$LOG"
    fi
  done < <(find "$REPO_DIR/.git" -name "*.lock" -type f 2>/dev/null)
fi

# HEAD before the run. The agent commits on every run, including "no new
# formations" days, so a HEAD that has not moved afterwards means the day's work
# was not saved — see the verification block below.
HEAD_BEFORE="$(git rev-parse HEAD 2>/dev/null)"

if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" "$TIMEOUT_SECONDS" claude -p "$PROMPT" \
    --allowedTools "Read,Edit,WebSearch,WebFetch,Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git remote get-url:*),Bash(git push:*),Bash(node --check:*),Bash(node check_duplicates.js:*)" \
    >> "$LOG" 2>&1
else
  claude -p "$PROMPT" \
    --allowedTools "Read,Edit,WebSearch,WebFetch,Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git remote get-url:*),Bash(git push:*),Bash(node --check:*),Bash(node check_duplicates.js:*)" \
    >> "$LOG" 2>&1
fi
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
  echo "ERROR: scan timed out after ${TIMEOUT_SECONDS}s and was killed" >> "$LOG"
fi

# ---- Did the work actually get saved? ---------------------------------------
# `claude -p` exits 0 when the AGENT finished its turn — not when the agent's
# work landed. On 2026-08-01 the scan researched the whole morning, staged
# data.js / scan_rejected_log.md / social.js, hit a stale HEAD.lock on the
# commit, wrote "Commit: FAILED — manual fix required" into its own transcript,
# and this script recorded `exit 0`. No notification fired. The day's result sat
# unsaved in the working tree until a human happened to look.
#
# The lesson generalises past this job: an exit code reported by the process
# being monitored cannot tell you the process achieved anything. It needs an
# independent check of the world. Here that check is HEAD — the agent commits on
# every run, including days it finds nothing, so a HEAD that has not moved means
# the run produced no saved result.
#
# Fails OPEN in the sense that matters: if HEAD_BEFORE could not be read, the
# check is skipped rather than guessed at.
if [ $EXIT_CODE -eq 0 ] && [ -n "$HEAD_BEFORE" ]; then
  HEAD_AFTER="$(git rev-parse HEAD 2>/dev/null)"
  if [ "$HEAD_AFTER" = "$HEAD_BEFORE" ]; then
    echo "ERROR: scan reported success but HEAD did not move — nothing was committed" >> "$LOG"
    {
      echo ""
      echo "=== Scan committed nothing: $(date) ==="
      echo "claude -p exited 0 but HEAD is still $HEAD_BEFORE."
      echo "Working tree state:"
      git status --porcelain
      echo "Last 40 lines of this run:"
      tail -n 40 "$LOG"
    } >> "$ERRLOG"
    "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: scan saved nothing" \
      "Scan ran but committed nothing — check scan_errors.txt"
    # A flag, not EXIT_CODE=1: the generic failure block below keys off
    # EXIT_CODE, and setting it here would make this failure get logged and
    # notified twice, the second time with a vaguer message. The flag is folded
    # back into the exit status at the end of the script.
    COMMIT_MISSING=1
  else
    echo "Post-flight: commit verified — $HEAD_BEFORE -> $HEAD_AFTER" >> "$LOG"
  fi
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

# ---- Duplicate gate ---------------------------------------------------------
# Aggregators file the same formation under different names — Crop Circle
# Connector's "Wanborough Plain" was Temporary Temples' "Fox Hill", and both
# went live as two separate cards for the same circle. The scan prompt tells the
# agent to run this check itself before committing (Step 4), but a prompt is not
# an enforcement mechanism, and this job runs at 06:58 with nobody watching.
# Re-run it here on the committed result: too late to block the push the agent
# already made, but it turns a silent duplicate into a notification the same
# morning instead of something spotted weeks later by eye.
if command -v node &>/dev/null && [ -f "$REPO_DIR/check_duplicates.js" ]; then
  DUPE_OUT="$(cd "$REPO_DIR" && node check_duplicates.js 2>&1)"
  if [ $? -ne 0 ]; then
    {
      echo ""
      echo "=== Duplicate formations detected after scan: $(date) ==="
      echo "$DUPE_OUT"
    } | tee -a "$ERRLOG" >> "$LOG"
    "$REPO_DIR/notify_failure.sh" "Crop Circle Watch: duplicate formation" \
      "Same circle logged twice — see scan_errors.txt, then merge with aliases"
  else
    echo "$DUPE_OUT" >> "$LOG"
  fi
fi

# "The agent finished" and "the run produced a result" are different facts, and
# the exit status should reflect the second one.
if [ "$COMMIT_MISSING" = "1" ] && [ $EXIT_CODE -eq 0 ]; then
  EXIT_CODE=1
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
