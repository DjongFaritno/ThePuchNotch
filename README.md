<div align="center">

<img src="gnome-extension/icons/thepuchnotch-brand.svg" width="96" alt="ThePuchNotch mint capsule mascot">

# thepuchnotch

**A little space for everything happening now.**

Music, focus, prayer times, and your everyday GNOME desktop.

**Version 1.9.0** · GNOME Shell 46–51 · GPL-3.0-or-later

[Install](#install-on-fedora) · [Settings](#make-it-yours) · [Issues](https://github.com/DjongFaritno/ThePuchNotch/issues) · [Changelog](CHANGELOG.md)

</div>

## Origin & thanks

**ThePuchNotch is a fork of [Isle, created by zickrian](https://github.com/zickrian/isle).**
The core architecture and many features come from that project. This fork is maintained
by **DjongFaritno**, with development assistance from Codex. We gratefully retain the
original authorship, copyright notices, and GPL-3.0-or-later license. See [NOTICE](NOTICE)
and the [upstream release history](docs/upstream-changelog.md). This is an independent
fork, not an official Isle release. You can also [support the original creator](https://sociabuzz.com/zickrian/tribe).

![Puch assistant rendered in listening, thinking and success states](docs/images/puch-assistant.png)

*Render of the actual Cairo assistant; not a full desktop screenshot.*

## Features

- Music controls and synchronized LRCLIB lyrics; the closed notch follows each line's width.
- Reorderable pages for your own workspace.
- Prayer times, location/timezone settings, next-prayer countdown and optional local adzan audio.
- Notifications, calendar, reminders, clipboard, file shelf, device and system activity.
- Focus sessions and breaks.
- **Puch assistant:** a mint capsule companion with a dark visor, animated expressions,
  configurable colours, and supported AI command-line providers.
- A redesigned Settings home with navigation cards, dedicated modules and alerts pages,
  and a centered About page inspired by the DuoChat reference supplied by DjongFaritno.

### Current limits

Desktop/browser chat replies (including Telegram Desktop and WhatsApp Web) are **not
implemented**. The experimental reply adapter only supports reply-capable GSConnect
phone notifications; it is not universal chat support. See [reply compatibility](docs/notification-replies.md).
Lyrics depend on LRCLIB and the player's MPRIS metadata. Prayer times use AlAdhan;
verify the calculation method against your local mosque. Adzan audio is supplied by you.

## Install on Fedora

Use a GNOME session. Install build dependencies with Fedora's package manager:

```bash
sudo dnf install git gcc gcc-c++ pkgconf-pkg-config gtk4-devel cmake clang-devel
```

Install Rust through [rustup](https://rustup.rs/) and use the current stable toolchain
(Rust 1.92 or newer is needed for the optional shelf helper). Then:

```bash
git clone https://github.com/DjongFaritno/ThePuchNotch.git
cd ThePuchNotch
./install.sh
```

Run `install.sh` **as your normal user, without sudo**. Optional speech acceleration
needs Vulkan development tools; the installer skips optional helpers it cannot build.
After installation, **log out and log in again**, then enable the extension:

```bash
gnome-extensions enable thepuchnotch@DjongFaritno.github.io
```

Open preferences:

```bash
gnome-extensions prefs thepuchnotch@DjongFaritno.github.io
```

Check **About → Version 1.9.0** to identify this build. A source commit is not necessarily
a published binary release. The About page links to the repository's actual releases.

## Make it yours

| Settings page | What you can change |
|---|---|
| Home | Quick navigation cards |
| Workspace | Shape, glass, size, placement and interaction |
| Modules | Visible pages, ordering, keyboard shortcuts and clocks |
| Sounds & alerts | Notifications, system events, music lyrics and calls |
| Prayer Times | City, timezone, calculation method, reminders and local adzan |
| Puch assistant | Appearance, voice, provider and models |
| Focus / Library / Insights | Timer, clipboard and AI usage |
| About | Version, project links, credits, diagnostics and reset |

## Updating & migration

```bash
git pull --ff-only
./install.sh
```

Log out and back in after updating. The installer copies existing **thenotch** data
and preferences once, without overwriting ThePuchNotch files, and disables the old
thenotch extension/service. Original data is retained for rollback. An old Isle
extension is disabled to avoid overlap; its data is not imported or deleted.

| Component | New identity |
|---|---|
| Extension | `thepuchnotch@DjongFaritno.github.io` |
| Daemon | `~/.local/bin/thepuchnotchd` |
| User service | `thepuchnotchd.service` |
| Settings | `org.gnome.shell.extensions.thepuchnotch` |
| D-Bus | `io.github.DjongFaritno.thepuchnotch.*` |
| Data | `~/.local/share/thepuchnotch` |

The local source directory may have a different name; run the installer from the
checkout containing this README. To remove this installation, run `./uninstall.sh`.

## Development

```bash
cargo check --locked -p thepuchnotch-daemon
cargo test --locked -p thepuchnotch-core
npm ci
npm run lint
node --test tests/extension/*.test.js
glib-compile-schemas --strict --dry-run gnome-extension/schemas
bash tests/migration.sh
```

See [installation notes](docs/install.md), [security policy](SECURITY.md), and
[contributing](CONTRIBUTING.md). No chat tokens or user data belong in this repository.

## License

[GPL-3.0-or-later](LICENSE). Original copyright notices are preserved. Inter and other
bundled third-party components retain their respective licenses and acknowledgements.
