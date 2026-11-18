// SPDX-License-Identifier: GPL-3.0-or-later
/** Property updates can arrive separately: never show the previous song's lyrics. */
export function matchingLyrics(track, lyrics) {
    if (!track || lyrics?.status !== 'synced' || !Array.isArray(lyrics.lines))
        return false;
    const parts = lyrics.track?.split('\u001f');
    return parts?.length === 4 && parts[0] === track.artist && parts[1] === track.title &&
        parts[2] === track.album && Math.abs(Number(parts[3]) - track.length_us / 1e6) <= 0.501;
}

/** The center's width in stage pixels, leaving room for signs, privacy dots and DND. */
export function lyricWidth(natural, maximum, available, chrome) {
    return Math.max(0, Math.ceil(Math.min(natural, Math.max(0, Math.min(maximum, available) - chrome))));
}
