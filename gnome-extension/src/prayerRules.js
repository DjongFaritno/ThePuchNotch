// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

/** The method IDs supported by AlAdhan; Kemenag is a calculation method, not a published timetable. */
export const PRAYER_METHODS = [
    ['20', 'Kemenag (Indonesia)'], ['3', 'Muslim World League'], ['2', 'ISNA (North America)'],
    ['4', 'Umm al-Qura (Makkah)'], ['5', 'Egyptian Survey Authority'], ['1', 'Karachi'],
    ['11', 'Singapore'], ['17', 'JAKIM (Malaysia)'], ['15', 'Moonsighting Committee'], ['13', 'Diyanet (Turkey)'],
];
export const PRAYER_KEYS = ['prayer-enabled', 'prayer-alerts', 'prayer-city', 'prayer-country',
    'prayer-timezone', 'prayer-method', 'prayer-school'];

/** The provider's epoch time is authoritative; never parse HH:MM in the computer's timezone. */
export function prayerCountdown(next, now = Date.now()) {
    if (!next || !Number.isFinite(next.at_ms) || next.at_ms <= now)
        return '';
    const minutes = Math.ceil((next.at_ms - now) / 60000);
    return minutes >= 60 ? `${Math.floor(minutes / 60)} j ${minutes % 60} m` : `${minutes} menit`;
}

/** A queued alert expires rather than playing an old adhan after fullscreen or suspend. */
export function prayerAlertFresh(prayer, enabled, dnd, now = Date.now()) {
    return enabled && !dnd && Number.isFinite(prayer.at_ms) && now >= prayer.at_ms && now - prayer.at_ms <= 90000;
}
