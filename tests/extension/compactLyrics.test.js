// SPDX-License-Identifier: GPL-3.0-or-later
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchingLyrics, lyricWidth} from '../../gnome-extension/src/compactLyrics.js';

const track = {artist: 'Example', title: 'Morning', album: 'Demo', length_us: 120500000};
const lyrics = {track: 'Example\u001fMorning\u001fDemo\u001f120', status: 'synced', lines: []};
test('matches rounded Rust duration, including half-second ties', () => {
    assert.equal(matchingLyrics(track, lyrics), true);
    assert.equal(matchingLyrics(track, {...lyrics, track: lyrics.track.slice(0, -3) + '121'}), true);
});
test('rejects stale song, album, duration, plain or missing lyrics', () => {
    for (const change of [{title: 'Evening'}, {artist: 'Someone'}, {album: 'Live'}, {length_us: 130000000}])
        assert.equal(matchingLyrics({...track, ...change}, lyrics), false);
    assert.equal(matchingLyrics(track, {...lyrics, status: 'plain'}), false);
    assert.equal(matchingLyrics(track, null), false);
    assert.equal(matchingLyrics(null, lyrics), false);
});
test('width follows text but reserves side content and respects display budget', () => {
    assert.equal(lyricWidth(70, 560, 900, 100), 70);
    assert.equal(lyricWidth(1000, 560, 900, 100), 460);
    assert.equal(lyricWidth(1000, 560, 350, 100), 250);
    assert.equal(lyricWidth(1000, 560, 90, 100), 0);
    assert.equal(lyricWidth(75.3, 560, 900, 100), 76);
});
