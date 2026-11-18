// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PAGE_ORDER, normalizePageOrder} from '../../gnome-extension/src/pageOrder.js';

test('missing settings preserve the default order', () => {
    assert.deepEqual(normalizePageOrder([]), PAGE_ORDER);
});

test('saved order survives unavailable pages and appends new pages', () => {
    const saved = ['usage', 'call', 'calendar', 'music'];
    assert.deepEqual(normalizePageOrder(saved), [...saved, ...PAGE_ORDER.filter(name => !saved.includes(name))]);
    assert.deepEqual(saved, ['usage', 'call', 'calendar', 'music']);
});

test('stale names and duplicate entries cannot remove or duplicate tabs', () => {
    const order = normalizePageOrder(['removed-page', 'shelf', 'shelf', 'music']);
    assert.deepEqual(order.slice(0, 2), ['shelf', 'music']);
    assert.equal(order.length, PAGE_ORDER.length);
    assert.deepEqual([...order].sort(), [...PAGE_ORDER].sort());
});
