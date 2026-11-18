#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 zickrian
# Packs dist/thepuchnotch-<version>-<arch>-linux.tar.gz (+ .sha256) with ready-built programs; arg: version (default Cargo.toml).
# Needs libgtk-4-dev for thepuchnotch-shelf, and cmake g++ libclang-dev libvulkan-dev glslc for thepuchnotch-whisper.
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="${1:-$(sed -n 's/^version = "\(.*\)"/\1/p' Cargo.toml | head -n1)}"
NAME="thepuchnotch-$VERSION-$(uname -m)-linux"
OUT="dist/$NAME"

cargo build --release --locked -p thepuchnotch-daemon -p thepuchnotch-shelf -p thepuchnotch-whisper

rm -rf "$OUT" "dist/$NAME.tar.gz" "dist/$NAME.tar.gz.sha256"
mkdir -p "$OUT/bin"
install -m755 target/release/thepuchnotchd target/release/thepuchnotch-shelf target/release/thepuchnotch-whisper "$OUT/bin/"
strip "$OUT/bin/thepuchnotchd" "$OUT/bin/thepuchnotch-shelf" "$OUT/bin/thepuchnotch-whisper"
cp -r gnome-extension data install.sh uninstall.sh README.md LICENSE NOTICE CHANGELOG.md "$OUT/"
# What install.sh installs as commands: the voice set-up and the battery charge limit.
mkdir -p "$OUT/scripts"
install -m755 scripts/setup-voice.sh scripts/migrate-thenotch.sh scripts/thepuchnotch-charge-limit "$OUT/scripts/"
# Compiled on install, for the GLib there.
rm -f "$OUT/gnome-extension/schemas/gschemas.compiled"

tar -C dist -czf "dist/$NAME.tar.gz" "$NAME"
(cd dist && sha256sum "$NAME.tar.gz" > "$NAME.tar.gz.sha256")
rm -rf "$OUT"
echo "dist/$NAME.tar.gz"
