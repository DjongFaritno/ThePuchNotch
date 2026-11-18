// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

/** Default tab order, including pages that only appear when available. */
export const PAGE_ORDER = ['call', 'music', 'notifications', 'focus', 'reminders', 'shelf', 'calendar',
    'apps', 'devices', 'usage', 'prayer'];

/** Ignore stale names and duplicates; newly introduced pages follow the saved ones. */
export function normalizePageOrder(saved) {
    return [...new Set([...saved.filter(name => PAGE_ORDER.includes(name)), ...PAGE_ORDER])];
}
