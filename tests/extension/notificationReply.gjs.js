// SPDX-License-Identifier: GPL-3.0-or-later
import {replyParameters} from '../../gnome-extension/src/notificationReply.js';
const value = replyParameters({deviceId: 'test-device', requestReplyId: 'test-token'}, 'Halo 🙏');
if (value.get_type_string() !== '(sava{sv})')
    throw new Error('Wrong application action signature');
const [action, targets] = value.deepUnpack();
const [device, method, enabled, payload] = targets[0].deepUnpack();
const [token, text] = payload.deepUnpack();
if (action !== 'device' || device !== 'test-device' || method !== 'replyNotification' ||
    enabled !== true || token !== 'test-token' || text !== 'Halo 🙏')
    throw new Error('Reply routing or text was changed');
print('notification reply: D-Bus payload passed (no messages sent)');
