#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 zickrian
# Removes everything install.sh and thepuchnotch-setup-voice put in place. Your shelf, clipboard history,
# tasks, timer settings and app usage in ~/.local/share/thepuchnotch are kept; delete that folder to remove them.
set -uo pipefail

UUID="thepuchnotch@DjongFaritno.github.io"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
# A system-wide package (.deb, .rpm, AUR) stays in use: it keeps the extension on and the voice set-up.
SYSTEM=0
[ -d "/usr/share/gnome-shell/extensions/$UUID" ] && SYSTEM=1

if [ "$SYSTEM" = 0 ]; then
    gnome-extensions disable "$UUID" 2>/dev/null
    # Drop it from the enabled list, in case GNOME Shell never loaded it, and from the disabled
    # one, where disabling put it: left there, it would keep a later install off.
    for key in enabled-extensions disabled-extensions; do
        current=$(gsettings get org.gnome.shell "$key")
        updated=$(printf '%s' "$current" | sed -e "s/, '$UUID'//" -e "s/'$UUID', //" -e "s/\['$UUID'\]/@as []/")
        [ "$updated" != "$current" ] && gsettings set org.gnome.shell "$key" "$updated"
    done
fi
systemctl --user disable --now thepuchnotchd.service 2>/dev/null
# Without a user service manager (install.sh allows that) the disable still succeeds, but D-Bus started
# thepuchnotchd, which would run on from its deleted file.
pkill -u "$(id -u)" -x thepuchnotchd 2>/dev/null
pkill -x thepuchnotch-shelf 2>/dev/null

rm -rf "$DATA/gnome-shell/extensions/$UUID" "$DATA/doc/thepuchnotch" "$DATA/fonts/thepuchnotch"
fc-cache "$DATA/fonts" >/dev/null 2>&1
if [ "$SYSTEM" = 0 ]; then
    # The voice assistant's speech models (and an older setup's Python venv, up to 3 GB with CUDA), thepuchnotch's
    # caches and its AIs' own homes.
    rm -rf "$DATA/thepuchnotch/models" "$DATA/thepuchnotch/voice-venv" "$DATA/thepuchnotch/thepuchnotch-whisper.py" "$DATA/thepuchnotch/assistant" "$DATA/thepuchnotch/codex" \
           "$DATA/thepuchnotch/agy" "$DATA/thepuchnotch/grok" "$DATA/thepuchnotch/opencode" "$DATA/thepuchnotch/claude-sign-in.json" \
           "$DATA/thepuchnotch/updates.json" "$DATA/thepuchnotch/install.lock" \
           "${XDG_CACHE_HOME:-$HOME/.cache}/thepuchnotch" "${XDG_RUNTIME_DIR:-/nonexistent}/thepuchnotch-covers"
    # The battery charge limit, set with thepuchnotch-charge-limit, would outlive thepuchnotch: lifted (asks for the password).
    if [ -e /etc/systemd/system/thepuchnotch-charge-limit.service ]; then
        echo "Lifting the battery charge limit thepuchnotch set (sudo asks for your password)."
        sudo systemctl disable --now thepuchnotch-charge-limit.service 2>/dev/null
        sudo rm -f /etc/systemd/system/thepuchnotch-charge-limit.service
        sudo systemctl daemon-reload 2>/dev/null
        for file in /sys/class/power_supply/BAT*/charge_control_end_threshold; do
            [ -e "$file" ] && echo 100 | sudo tee "$file" >/dev/null
        done
    fi
fi
# The AI alerts' hooks in Claude Code's and Codex's own settings would run an thepuchnotchd that is gone.
[ -x "$HOME/.local/bin/thepuchnotchd" ] && "$HOME/.local/bin/thepuchnotchd" --unhook-all 2>/dev/null
rm -f "$HOME/.local/bin/thepuchnotchd" "$HOME/.local/bin/thepuchnotch-shelf" "$HOME/.local/bin/thepuchnotch-whisper" "$HOME/.local/bin/thepuchnotch-charge-limit" \
      "$HOME/.local/bin/thepuchnotch-setup-voice" "$HOME/.local/bin/thepuchnotch-uninstall" \
      "$DATA/dbus-1/services/io.github.DjongFaritno.thepuchnotch.Daemon.service" \
      "$DATA/dbus-1/services/io.github.DjongFaritno.thepuchnotch.ShelfWindow.service" \
      "$DATA/dbus-1/services/io.github.thepuchnotch.Daemon.service" \
      "$DATA/dbus-1/services/io.github.thepuchnotch.ShelfWindow.service" \
      "$CONFIG/systemd/user/thepuchnotchd.service"
systemctl --user daemon-reload 2>/dev/null
if [ "$SYSTEM" = 1 ]; then
    echo "thepuchnotch in your home folder has been removed; the system-wide package now runs instead (remove it with apt, dnf or pacman)."
    exit 0
fi
echo "thepuchnotch has been removed."
HUB="${HF_HUB_CACHE:-${HF_HOME:-${XDG_CACHE_HOME:-$HOME/.cache}/huggingface}/hub}"
if ls -d "$HUB"/models--Systran--faster-whisper-* >/dev/null 2>&1; then
    echo "An older speech model stays in $HUB (models--Systran--faster-whisper-*); delete it to free its space."
fi
