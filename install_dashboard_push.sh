#!/bin/bash
# ============================================================
# Crop Circle Watch — GitHub Pages auto-push installer
#
# Sets up a launchd agent that runs `git push` for the dashboard
# once a day at 7:10 AM. Does NOT touch pmset or Energy Saver —
# it relies on the wake schedule already installed for the image
# downloader (~/Projects/crop-circles/images/install_automation.sh).
# If you haven't installed that one, the Mac needs to already be
# awake at 7:10 AM for this job to fire.
#
# Run the one-time GitHub setup in README.md BEFORE running this
# installer (the push will silently no-op without a remote, but
# there's no point installing the agent until origin exists).
#
# Usage:  bash install_dashboard_push.sh
# ============================================================

set -e

PLIST_SRC="$HOME/Projects/crop-circles/dashboard/com.cropcircles.dashboardpush.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.cropcircles.dashboardpush.plist"
RUNNER="$HOME/Projects/crop-circles/dashboard/push_dashboard.sh"

echo ""
echo "=== Crop Circle Watch — Auto-Push Installer ==="
echo ""

echo "1. Checking for git..."
if ! command -v git &>/dev/null; then
  echo "   x 'git' not found in PATH. Install Xcode Command Line Tools first:"
  echo "       xcode-select --install"
  exit 1
fi
echo "   - Found git at: $(command -v git)"

echo "2. Checking for an 'origin' remote..."
if git -C "$HOME/Projects/crop-circles/dashboard" remote get-url origin &>/dev/null; then
  echo "   - origin is configured: $(git -C "$HOME/Projects/crop-circles/dashboard" remote get-url origin)"
else
  echo "   ! No 'origin' remote yet. The agent will install fine, but pushes"
  echo "     will no-op (and log a note) until you complete the GitHub setup"
  echo "     in README.md."
fi

chmod +x "$RUNNER"
echo "3. - Runner script marked executable"

echo "4. Installing launchd agent..."
if [ -f "$PLIST_DST" ]; then
  launchctl unload "$PLIST_DST" 2>/dev/null || true
fi
cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"
echo "   - launchd agent loaded -> runs daily at 7:10 AM"

echo ""
echo "=== Installation complete ==="
echo ""
echo "  Schedule:   7:10 AM daily (after the existing 6:55 AM wake / 7:00 AM image job)"
echo "  Log:        ~/Projects/crop-circles/dashboard/push_log.txt"
echo "  Errors:     ~/Projects/crop-circles/dashboard/push_errors.txt"
echo ""
echo "  Run it RIGHT NOW to test:"
echo "    launchctl start com.cropcircles.dashboardpush"
echo "    cat ~/Projects/crop-circles/dashboard/push_log.txt"
echo ""
echo "  To uninstall:"
echo "    launchctl unload ~/Library/LaunchAgents/com.cropcircles.dashboardpush.plist"
echo "    rm ~/Library/LaunchAgents/com.cropcircles.dashboardpush.plist"
