// SPDX-License-Identifier: GPL-3.0-or-later
export const GSCONNECT_APP = 'org.gnome.Shell.Extensions.GSConnect';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Only accept GSConnect's explicit reply token, never infer a target from a chat title. */
export function replyTarget(notification) {
    if (notification?.source?._appId !== GSCONNECT_APP)
        return null;
    const {deviceId, requestReplyId} = notification;
    if (typeof deviceId !== 'string' || !deviceId || !UUID.test(requestReplyId ?? ''))
        return null;
    return {deviceId, requestReplyId};
}

export function sameReplyTarget(a, b) {
    return Boolean(a && b && a.deviceId === b.deviceId && a.requestReplyId === b.requestReplyId);
}

export function validReply(text) {
    return typeof text === 'string' && text.trim().length > 0 && text.length <= 4096;
}
