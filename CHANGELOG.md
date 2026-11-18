# Changelog

All notable changes to ThePuchNotch are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## Unreleased

## 1.9.0 - 2026-11-18

- Rebrand as thepuchnotch with independent extension, D-Bus, crate and package identities.
- Add a Settings home, separate Workspace / Modules / Sounds & alerts pages, and mint styling.
- Add Puch, the mint capsule assistant with a dark visor and luminous eyes.
- Redesign About with a centered identity, version, credits and project links.
- Add a non-destructive migration from thenotch and retain original Isle attribution.
- Move historical upstream release notes to [upstream-changelog.md](docs/upstream-changelog.md).

## 1.8.0 - 2026-11-18

Local thepuchnotch build; not an upstream Isle release. Desktop/browser chat replies
are not implemented in this version.

### Added

- **Chat replies:** reply from notification cards and banners for reply-capable
  GSConnect phone notifications. Includes a draft editor, explicit Send, recipient
  validation, and privacy handling during screen sharing.

- **Compact lyrics:** the closed notch follows synchronized LRCLIB lines and resizes
  to the text, with a display-aware width cap and ellipsis. Includes an independent
  setting and shared position monitoring for open media and monitor mirrors.

- **Prayer times:** an opt-in Shalat tab with five daily prayers, next-prayer countdown,
  AlAdhan monthly cache, city/country/timezone settings, calculation methods and Ashar school.
  Prayer alerts respect Do Not Disturb, expire after suspend/fullscreen, and support a
  chime or a local WAV/OGG adzan with Stop. Shalat participates in tab order and shortcuts.
