// SPDX-License-Identifier: GPL-3.0-or-later
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GSCONNECT_APP, replyTarget, sameReplyTarget, validReply} from '../../gnome-extension/src/notificationReplyRules.js';
const n = {source: {_appId: GSCONNECT_APP}, deviceId: 'paired-phone', requestReplyId: '12345678-1234-4123-8123-123456789abc'};
test('only explicitly reply-capable GSConnect notifications expose an editor', () => {
    assert.deepEqual(replyTarget(n), {deviceId: n.deviceId, requestReplyId: n.requestReplyId});
    for (const item of [null, {}, {...n, source: {_appId: 'other'}}, {...n, deviceId: ''},
        {...n, requestReplyId: undefined}, {...n, requestReplyId: 'reply'}, {title: 'WhatsApp', actions: [{label: 'Reply'}]}])
        assert.equal(replyTarget(item), null);
});
test('new device or reply token invalidates a previously opened target', () => {
    const a = replyTarget(n);
    assert.equal(sameReplyTarget(a, {...a}), true);
    assert.equal(sameReplyTarget(a, {...a, deviceId: 'other-phone'}), false);
    assert.equal(sameReplyTarget(a, {...a, requestReplyId: 'other'}), false);
    assert.equal(sameReplyTarget(a, null), false);
});
test('blank and oversized submissions are blocked; Unicode is preserved', () => {
    for (const text of ['', ' \n\t', null, 'a'.repeat(4097)])
        assert.equal(validReply(text), false);
    for (const text of ['Terima kasih 🙏', 'مرحبا', 'a'.repeat(4096)])
        assert.equal(validReply(text), true);
});
