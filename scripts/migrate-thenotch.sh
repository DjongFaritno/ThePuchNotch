#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Sourced after the new extension is installed. Keep old files for rollback.
migrate_thenotch() {
    local data="$1" config="$2" destination="$3"
    local old_data="$data/thenotch" marker="$data/thepuchnotch/.migrated-thenotch"
    [ ! -f "$marker" ] || return 0
    local old_extension="$data/gnome-shell/extensions/thenotch@zickrian.github.io"
    if [ ! -d "$old_data" ] && [ ! -d "$old_extension" ]; then
        return 0
    fi
    echo 'Migrating thenotch settings and data; originals are kept for rollback.'
    gnome-extensions disable thenotch@zickrian.github.io 2>/dev/null || true
    systemctl --user disable --now thenotchd.service 2>/dev/null || true
    # Never overwrite a file already created by ThePuchNotch, including its install lock.
    mkdir -p "$data/thepuchnotch"
    if [ -d "$old_data" ]; then
        cp -a --no-clobber "$old_data/." "$data/thepuchnotch/"
    fi
    if [ -d "$config/thenotch" ]; then
        mkdir -p "$config/thepuchnotch"
        cp -a --no-clobber "$config/thenotch/." "$config/thepuchnotch/"
    fi
    if command -v dconf >/dev/null && [ -z "$(dconf list /org/gnome/shell/extensions/thepuchnotch/)" ]; then
        # Explicit custom appearances survive; old default circle/cloud adopt Puch's identity.
        dconf dump /org/gnome/shell/extensions/thenotch/ |
            sed -e "/^bot-shape='circle'$/d" -e "/^bot-color='cloud'$/d" -e '/^prefs-page=/d' |
            dconf load /org/gnome/shell/extensions/thepuchnotch/
    fi
    # Persist the new defaults only through the schema, never force a custom user choice.
    glib-compile-schemas "$destination/schemas"
    touch "$marker"
}
