// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prayerCountdown, prayerAlertFresh} from '../../gnome-extension/src/prayerRules.js';
import {normalizePageOrder} from '../../gnome-extension/src/pageOrder.js';

test('next-day countdown uses epoch time, independent of the computer timezone', () => {
    const now = Date.parse('2026-11-18T23:30:00+07:00');
    assert.equal(prayerCountdown({at_ms: Date.parse('2026-11-19T04:00:00+07:00')}, now), '4 j 30 m');
    assert.equal(prayerCountdown({at_ms: now + 1}, now), '1 menit');
    assert.equal(prayerCountdown({at_ms: now}, now), '');
    assert.equal(prayerCountdown(null, now), '');
});

test('DND, disable, future and expired prayers cannot play delayed adzan', () => {
    const p = {at_ms: 1_000_000};
    assert.equal(prayerAlertFresh(p, true, false, p.at_ms), true);
    assert.equal(prayerAlertFresh(p, true, true, p.at_ms), false);
    assert.equal(prayerAlertFresh(p, false, false, p.at_ms), false);
    assert.equal(prayerAlertFresh(p, true, false, p.at_ms - 1), false);
    assert.equal(prayerAlertFresh(p, true, false, p.at_ms + 90001), false);
    assert.equal(prayerAlertFresh({}, true, false, p.at_ms), false);
});

test('adding prayer times preserves existing custom tab order', () => {
    const before = ['calendar', 'music', 'usage', 'call', 'shelf', 'notifications', 'focus', 'reminders', 'apps', 'devices'];
    assert.deepEqual(normalizePageOrder(before), [...before, 'prayer']);
    assert.equal(normalizePageOrder(['prayer', ...before])[0], 'prayer');
});
