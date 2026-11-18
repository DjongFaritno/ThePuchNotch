// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {GSCONNECT_APP, validReply} from './notificationReplyRules.js';

export function replyParameters(target, text) {
    const payload = new GLib.Variant('(ssbv)', [target.deviceId, 'replyNotification', true,
        new GLib.Variant('(ssa{ss})', [target.requestReplyId, text, {}])]);
    return new GLib.Variant('(sava{sv})', ['device', [payload], {}]);
}

/** Hand a user-submitted reply to GSConnect. The acknowledgement is not a delivery receipt. */
export function sendReply(target, text, cancellable) {
    if (!validReply(text))
        return Promise.reject(new Error('Enter a message of at most 4096 characters.'));
    return new Promise((resolve, reject) => {
        Gio.DBus.session.call(GSCONNECT_APP, '/org/gnome/Shell/Extensions/GSConnect',
            'org.freedesktop.Application', 'ActivateAction',
            replyParameters(target, text),
            null, Gio.DBusCallFlags.NO_AUTO_START, 10000, cancellable, (connection, result) => {
                try {
                    connection.call_finish(result);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}
