#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
set -euo pipefail
cd "$(dirname "$0")/.."
task_tmp=$(mktemp -d)
trap 'rm -rf "$task_tmp"' EXIT
mkdir -p "$task_tmp/data/thenotch" "$task_tmp/data/thepuchnotch" "$task_tmp/config/thenotch" "$task_tmp/extension/schemas"
printf 'old' > "$task_tmp/data/thenotch/reminders.json"
printf 'keep-new' > "$task_tmp/data/thepuchnotch/reminders.json"
printf 'copy-me' > "$task_tmp/config/thenotch/config.json"
# No real user service, dconf setting or notification is touched.
systemctl() { :; }
gnome-extensions() { :; }
glib-compile-schemas() { :; }
dconf() {
    case "$1" in
        list) return 0 ;;
        dump) printf "[/]\nbot-shape='circle'\nbot-color='cloud'\nclock-date=true\nprefs-page='about'\n" ;;
        load) cat > "$task_tmp/copied-settings" ;;
    esac
}
source scripts/migrate-thenotch.sh
migrate_thenotch "$task_tmp/data" "$task_tmp/config" "$task_tmp/extension"
[ "$(cat "$task_tmp/data/thepuchnotch/reminders.json")" = keep-new ]
[ "$(cat "$task_tmp/data/thenotch/reminders.json")" = old ]
[ "$(cat "$task_tmp/config/thepuchnotch/config.json")" = copy-me ]
grep -q '^clock-date=true$' "$task_tmp/copied-settings"
! grep -q 'bot-\|prefs-page' "$task_tmp/copied-settings"
[ -f "$task_tmp/data/thepuchnotch/.migrated-thenotch" ]
rm "$task_tmp/config/thepuchnotch/config.json"
migrate_thenotch "$task_tmp/data" "$task_tmp/config" "$task_tmp/extension"
[ ! -f "$task_tmp/config/thepuchnotch/config.json" ]
echo 'Migration passed: originals retained, destination preserved, settings filtered, one-time import.'
