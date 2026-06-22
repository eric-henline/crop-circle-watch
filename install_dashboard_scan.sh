#!/bin/bash
# ============================================================
# Crop Circle Watch — daily scan installer (Mac-side)
#
# Sets up a launchd agent that runs the daily formation scan at
# 6:58 AM via headless Claude Code (`claude -p`). Does NOT touch
# pmset or Energy Saver — it relies on the wake schedule already
# installed for the image downloader
# (~/Projects/crop-circles/images/install_automation.sh). If you
# haven't installed that one, the Mac needs to already be awake at
# 6:58 AM for this job to fire.
#
# This replaces the Cowork-hosted "crop-circle-dashboard-scan"
# scheduled task, which only ran when the Cowork app happened to be
# open. After installing this, that Cowork task should be disabled
# so the scan doesn't run twice.
#
# IMPORTANT — auth: this is the first automation in this project that
# depends on the `claude` CLI itself running unattended. Before
# running this installer, make sure `claude` is installed and
# authenticated on this Mac: run `claude login` once interactively
# (or set ANTHROPIC_API_KEY in ~/.anthropic_key). If auth isn't set
# up, the scan will fail silently every morning until you check
# scan_log.txt / scan_errors.txt.
#
# Usage:  bash install_dashboard_scan.sh
# ============================================================

set -e

PLIST_SRC="$HOME/Projects/crop-circles/dashboard/com.cropcircles.dashboardscan.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.cropcircles.dashboardscan.plist"
RUNNER="$HOME/Projects/crop-circles/dashboard/scan_dashboard.sh"

echo ""
echo "=== Crop Circle Watch — Daily Scan Installer ==="
echo ""

echo "1. Checking for the claude CLI..."
if ! command -v claude &>/dev/null; then
  echo "   x 'claude' not found in PATH."
  echo "     Install Claude Code first, then run 'claude login' once"
  echo "     interactively before installing this job."
  exit 1
fi
echo "   - Found claude at: $(command -v claude)"

echo "   ! This only confirms the binary is on PATH, not that it's"
echo "     authenticated. Auth can't be reliably checked from a script —"
echo "     test it for real after install (see below)."

echo "2. Checking for an 'origin' remote..."
if git -C "$HOME/Projects/crop-circles/dashboard" remote get-url origin &>/dev/null; then
  echo "   - origin is configured: $(git -C "$HOME/Projects/crop-circles/dashboard" remote get-url origin)"
else
  echo "   ! No 'origin' remote yet. The scan will still run and commit"
  echo "     locally, but it will skip pushing (and say so in scan_log.txt)"
  echo "     until you complete the one-time GitHub setup in README.md."
fi

chmod +x "$RUNNER"
echo "3. - Runner script marked executable"

echo "4. Installing launchd agent..."
if [ -f "$PLIST_DST" ]; then
  launchctl unload "$PLIST_DST" 2>/dev/null || true
fi
cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"
echo "   - launchd agent loaded -> runs daily at 6:58 AM"

echo ""
echo "=== Installation complete ==="
echo ""
echo "  Schedule:   6:58 AM daily (after the 6:55 AM wake, before the 7:00 AM"
echo "              image job and the 7:10 AM push-retry job)"
echo "  Log:        ~/Projects/crop-circles/dashboard/scan_log.txt"
echo "  Errors:     ~/Projects/crop-circles/dashboard/scan_errors.txt"
echo ""
echo "  Run it RIGHT NOW to test (recommended before trusting it unattended):"
echo "    launchctl start com.cropcircles.dashboardscan"
echo "    cat ~/Projects/crop-circles/dashboard/scan_log.txt"
echo ""
echo "  Remember to disable the old Cowork 'crop-circle-dashboard-scan'"
echo "  scheduled task so the scan doesn't run twice."
echo ""
echo "  To uninstall:"
echo "    launchctl unload ~/Library/LaunchAgents/com.cropcircles.dashboardscan.plist"
echo "    rm ~/Library/LaunchAgents/com.cropcircles.dashboardscan.plist"
