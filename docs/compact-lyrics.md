# Lyrics in the closed notch

Enable **Lyrics** and **Lyrics in the closed notch** in Settings. Both default to on.
While an MPRIS player plays a track with synchronized LRCLIB lyrics, the current line
replaces the compact clock. The existing island spring follows the measured text width.
Total lyric-mode width is capped at 560 logical pixels or 70% of the smallest connected
display's width, whichever is smaller. Long lines use an ellipsis; the expanded music
page still provides the full lyrics. The usual minimum notch width remains in effect.

Pausing, an empty timed line, the introduction, unavailable/unsynchronized lyrics, or
disabling either setting restores the clock. Calls and screen recordings take priority.
A song change rejects lyrics belonging to the previous metadata. Position updates and
line-boundary timers follow seeks and playback rate; hidden views stop their timers.
Open media and compact views share a position-polling demand so closing either view
cannot stop the other. No additional lyrics service or credentials are introduced.

## Research

- [Poni](https://github.com/liimalim/Poni) documents synchronized lyrics inside the closed notch, sourced from LRCLIB.
- [Oyenza Studio](https://github.com/lucacadalora/oyenza-studio) documents the sung line on the closed island, with title/artist between lines.
- [Nusa](https://rama2555.github.io/nusa/) uses a split lyrics panel with click-to-seek in its expanded music view.
- [LRCLIB API](https://lrclib.net/docs) supplies the existing daemon integration.

thepuchnotch adopts the compact sung-line pattern; adaptive sizing is this implementation's
response to the requested behavior. It uses the clock between lines instead of track metadata.

## Manual GNOME check

After reinstalling and reloading the extension, play a track with timed lyrics. Check
short/long lines, pause/resume, seek backward/forward, next track, empty timed lines,
opening/closing Music, both lyric switches, recording/call priority, DND, and mixed-scale
monitors. Confirm ellipsis at the width limit and no stale lyrics after switching songs.
