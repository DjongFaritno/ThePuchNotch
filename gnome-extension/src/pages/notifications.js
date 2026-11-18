// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

// Notifications: a heading with Do Not Disturb and Clear (and, while it is on, what still gets through),
// over a list of cards, newest first. Click one to open it. See docs/product-spec.md.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {VERTICAL, px} from '../compat.js';
import * as Format from '../format.js';
import {sendReply} from '../notificationReply.js';
import {replyTarget, sameReplyTarget, validReply} from '../notificationReplyRules.js';
import {notificationIcon, plainBody} from '../notifications.js';
import {Lines, WrapLayout, icon, iconButton, isSymbolic, label, ownIcon, pillButton, setButtonIcon, wrapLines} from '../widgets.js';
import {Page} from './page.js';

/** A card offers at most this many of its notification's buttons ("Mark as read", "Accept"). */
const MAX_ACTIONS = 3;
/** A notification's text shows on up to this many lines, the last ending in "…" when there is more. */
const BODY_LINES = 3;

/** The app's icon, small beside its row: a colour one as is, a symbolic one on a grey rounded square. */
function notificationBadge(gicon) {
    gicon = gicon ? ownIcon(gicon) : icon('dialog-information-symbolic');
    if (!isSymbolic(gicon))
        return new St.Icon({gicon, icon_size: 20, y_align: Clutter.ActorAlign.CENTER});
    return new St.Bin({
        style_class: 'thepuchnotch-notification-glyph',
        child: new St.Icon({gicon, icon_size: 12}),
        y_align: Clutter.ActorAlign.CENTER,
    });
}

/** The page over `center`, which keeps the notifications and Do Not Disturb. */
export const NotificationsPage = GObject.registerClass(
class NotificationsPage extends Page {
    /** The list itself is built late, on the first warm-up or showing. */
    _init(daemon, center, {height}) {
        super._init(daemon, {
            style_class: 'thepuchnotch-page thepuchnotch-notifications',
            layout_manager: new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}),
            height,
        });
        this.name = 'notifications';
        this._center = center;

        this.add_child(this._buildBar());
        this.add_child(this._buildDndNote());
        this.add_child(this._buildList());
        this.add_child(this._buildReply());

        this._centerHandlers = [
            // Closed, the list is only rebuilt when next shown (see `onActivate`).
            center.connect('changed', () => this._onListChanged()),
            // Shown anew but not marked seen: its banner does that once shown (see `acknowledge`).
            center.connect('updated', () => this._onListChanged({seen: false})),
            // Seen or not shows only in the tab's dot: the cards stay.
            center.connect('seen-changed', () => this.emit('news-changed')),
            center.connect('dnd-changed', () => this._updateDnd()),
        ];
        // Built when first warmed up or shown (see `warmUp`).
        this._times = [];
        this._stale = true;
        this._updateDnd();
        this.connect('destroy', () => this._onDestroy());
    }

    /** Unseen notifications make it the page to open on. */
    get relevant() {
        return this._center.hasUnseen;
    }

    /** Unseen ones put a dot on the tab. */
    get hasNews() {
        return this._center.hasUnseen;
    }

    /** How many there are, then Do Not Disturb and Clear All as small round buttons. */
    _buildBar() {
        const bar = new St.BoxLayout({style_class: 'thepuchnotch-notifications-bar'});
        bar.add_child(label('Notifications', 'thepuchnotch-notifications-heading', {x_expand: true, y_align: Clutter.ActorAlign.CENTER}));
        this._dndButton = iconButton('thepuchnotch-bell', 'thepuchnotch-button-round thepuchnotch-button-small thepuchnotch-dnd-toggle', () => {
            this._center.dnd = !this._center.dnd;
        }, {size: 13, accessibleName: 'Do Not Disturb'});
        this._dndButton.y_align = Clutter.ActorAlign.CENTER;
        this._clearButton = pillButton('Clear', 'thepuchnotch-pill-small thepuchnotch-notifications-clear', () => this._center.clearAll());
        this._clearButton.y_align = Clutter.ActorAlign.CENTER;
        bar.add_child(this._dndButton);
        bar.add_child(this._clearButton);
        return bar;
    }

    /** While Do Not Disturb is on, what it does: a moon and a line under the heading. */
    _buildDndNote() {
        this._dndNote = new St.BoxLayout({style_class: 'thepuchnotch-notifications-dnd-note', visible: false});
        // Dimmed as the line beside it: the moon is drawn white, so its colour can't be set.
        this._dndNote.add_child(new St.Icon({gicon: icon('thepuchnotch-moon'), icon_size: 10, opacity: 130, y_align: Clutter.ActorAlign.CENTER}));
        const text = label('Do Not Disturb: new ones wait here; urgent ones still show', 'thepuchnotch-notifications-dnd-text',
            {x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        text.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        this._dndNote.add_child(text);
        return this._dndNote;
    }

    /** The scrolling list of rows, with "No notifications" in its place when empty. */
    _buildList() {
        this._list = new St.BoxLayout({...VERTICAL, style_class: 'thepuchnotch-notification-list'});
        this._scroll = new St.ScrollView({
            style_class: 'thepuchnotch-task-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            // Scrolls with the wheel or touchpad; no scrollbar over the cards.
            vscrollbar_policy: St.PolicyType.EXTERNAL,
            x_expand: true,
            y_expand: true,
        });
        this._scroll.set_child(this._list);

        this._empty = new St.BoxLayout({...VERTICAL, style_class: 'thepuchnotch-empty', x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, x_expand: true});
        this._empty.add_child(new St.Icon({gicon: icon('thepuchnotch-bell'), icon_size: 24, style_class: 'thepuchnotch-empty-icon', x_align: Clutter.ActorAlign.CENTER}));
        this._empty.add_child(label('No notifications', 'thepuchnotch-empty-title', {x_align: Clutter.ActorAlign.CENTER}));
        this._empty.add_child(label('You’re all caught up', 'thepuchnotch-empty-hint', {x_align: Clutter.ActorAlign.CENTER}));

        const column = new St.Widget({layout_manager: new Clutter.BinLayout(), x_expand: true, y_expand: true});
        column.add_child(this._scroll);
        column.add_child(this._empty);
        return column;
    }

    /** Rebuilds now if shown, or marks the list stale for the next showing. */
    _onListChanged({seen = true} = {}) {
        if (this._replyNotification && (!this._center.notifications.includes(this._replyNotification) ||
            !sameReplyTarget(this._replyTarget, replyTarget(this._replyNotification))))
            this._closeReply();
        if (this.active)
            this._update({seen});
        else
            this._stale = true;
        this.markCold();
        this.emit('news-changed');
    }

    /** Rebuilds every row; `seen` false leaves them unread even while shown. */
    _update({seen = true} = {}) {
        this._stale = false;
        /** Each row's "5m ago", with when it came, to bring up to date without a rebuild. */
        this._times = [];
        const notifications = this._center.notifications;
        this._clearButton.visible = notifications.length > 0;

        // Newest first, one row each, as a list to scroll.
        this._list.destroy_all_children();
        for (const notification of notifications)
            this._list.add_child(this._row(notification));
        this._empty.visible = notifications.length === 0;
        this._scroll.visible = notifications.length > 0;

        // Seen while open: no unread dot for something already on screen.
        if (this.active && seen)
            this._center.acknowledgeAll();
    }

    /** The bell turns into a checked moon, and the note shows, while Do Not Disturb is on. */
    _updateDnd() {
        const on = this._center.dnd;
        if (on)
            this._dndButton.add_style_pseudo_class('checked');
        else
            this._dndButton.remove_style_pseudo_class('checked');
        setButtonIcon(this._dndButton, on ? 'thepuchnotch-moon' : 'thepuchnotch-bell');
        this._dndNote.visible = on;
    }

    /** A row: the app's icon, who, what under it on up to three lines, its buttons, and when; × under the pointer. */
    _row(notification) {
        const content = new St.BoxLayout({style_class: 'thepuchnotch-notification', x_expand: true});
        const badge = notificationBadge(notificationIcon(notification));
        content.add_child(badge);

        // On one line: a title may hold line breaks too.
        const title = label((notification.title || notification.source?.title || '').replace(/\s+/g, ' ').trim(), 'thepuchnotch-notification-title');
        title.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        const texts = new St.BoxLayout({...VERTICAL, style_class: 'thepuchnotch-notification-texts', x_expand: true,
            y_align: Clutter.ActorAlign.CENTER});
        texts.add_child(title);
        // While the screen is shared, only who wrote, not what.
        const text = this._sharing ? '' : plainBody(notification).replace(/\s+/g, ' ').trim();
        if (text) {
            // Filling its lines' height: given only its own (one line), it would show one.
            const body = label(text, 'thepuchnotch-notification-body', {y_align: Clutter.ActorAlign.FILL});
            wrapLines(body, Pango.EllipsizeMode.END);
            texts.add_child(new Lines(body, BODY_LINES));
        }
        content.add_child(texts);
        // Its buttons, as GNOME's banner had them, on a line of their own; not while the screen is shared.
        const actions = this._sharing ? [] : (notification.actions ?? []).slice(0, MAX_ACTIONS);
        if (actions.length) {
            // Whole, never cut: those that don't fit go on to a line below.
            const buttons = new St.Widget({style_class: 'thepuchnotch-notification-actions', x_expand: true,
                layout_manager: new WrapLayout(px(6))});
            for (const action of actions) {
                buttons.add_child(pillButton(action.label, 'thepuchnotch-pill-small thepuchnotch-notification-action', () => {
                    action.activate();
                    this.emit('request-close');
                }));
            }
            texts.add_child(buttons);
        }
        if (!this._sharing && replyTarget(notification))
            texts.add_child(pillButton('Reply', 'thepuchnotch-pill-small thepuchnotch-notification-action',
                () => this.openReply(notification)));
        // More than a line: from the top, the icon and the time level with the title.
        const tall = texts.get_n_children() > 1;
        if (tall)
            badge.y_align = texts.y_align = Clutter.ActorAlign.START;

        // The time, and in its place under the pointer the ×.
        const corner = new St.Widget({layout_manager: new Clutter.BinLayout(),
            y_align: tall ? Clutter.ActorAlign.START : Clutter.ActorAlign.CENTER});
        const time = label(Format.ago(notification.datetime), 'thepuchnotch-notification-time', {x_align: Clutter.ActorAlign.END});
        this._times.push([time, notification.datetime]);
        corner.add_child(time);
        // Every one can be put away, a resident one too, as in GNOME's list.
        const tools = new St.BoxLayout({style_class: 'thepuchnotch-notification-tools', x_align: Clutter.ActorAlign.END, opacity: 0, visible: false});
        const dismiss = iconButton('thepuchnotch-close-symbolic', 'thepuchnotch-button-flat thepuchnotch-notification-dismiss',
            () => notification.destroy(), {size: 10, accessibleName: 'Dismiss'});
        dismiss.y_align = Clutter.ActorAlign.CENTER;
        tools.add_child(dismiss);
        corner.add_child(tools);
        content.add_child(corner);

        const row = new St.Button({style_class: 'thepuchnotch-notification-row', child: content, x_expand: true, can_focus: true});
        row.connect('clicked', () => {
            notification.activate();
            this.emit('request-close');
        });
        row.connect('notify::hover', () => {
            tools.show();
            tools.ease({opacity: row.hover ? 255 : 0, duration: 120,
                onComplete: () => (tools.visible = row.hover)});
            time.ease({opacity: row.hover ? 0 : 255, duration: 120});
        });
        return row;
    }

    /** Keep the editor outside the rebuilt list so incoming notifications cannot erase a draft. */
    _buildReply() {
        this._replyBox = new St.BoxLayout({...VERTICAL, style_class: 'thepuchnotch-reply', visible: false});
        this._replyTitle = label('', 'thepuchnotch-notification-title');
        this._replyEntry = new St.Entry({hint_text: 'Type a reply…', can_focus: true, x_expand: true,
            style_class: 'thepuchnotch-reminder-field'});
        this._replyEntry.clutter_text.set_max_length(4096);
        this._replyStatus = label('', 'thepuchnotch-notification-body');
        wrapLines(this._replyStatus, Pango.EllipsizeMode.NONE);
        const buttons = new St.BoxLayout({style_class: 'thepuchnotch-notification-actions'});
        this._replySend = pillButton('Send', 'thepuchnotch-pill-small', () => this._sendReply());
        const cancel = pillButton('Cancel', 'thepuchnotch-pill-small', () => this._closeReply());
        buttons.add_child(this._replySend);
        buttons.add_child(cancel);
        for (const actor of [this._replyTitle, this._replyEntry, this._replyStatus, buttons])
            this._replyBox.add_child(actor);
        this._replyEntry.clutter_text.connect('text-changed', () => this._syncReplyButton());
        this._replyEntry.clutter_text.connect('activate', () => this._sendReply());
        this._replyEntry.clutter_text.connect('key-press-event', (_actor, event) => {
            if (event.get_key_symbol() !== Clutter.KEY_Escape)
                return Clutter.EVENT_PROPAGATE;
            this._closeReply();
            return Clutter.EVENT_STOP;
        });
        return this._replyBox;
    }

    openReply(notification) {
        const target = replyTarget(notification);
        if (this._sharing || !this.active || !target || !this._center.notifications.includes(notification))
            return;
        // Do not silently replace an unfinished draft with another recipient.
        if (this._replyNotification && this._replyNotification !== notification) {
            this._replyStatus.text = 'Send or cancel this reply before replying to another chat.';
            return;
        }
        this._replyNotification = notification;
        this._replyTarget = target;
        this._replyTitle.text = `Reply to ${(notification.title || 'chat').replace(/\s+/gu, ' ')}`;
        this._replyStatus.text = '';
        this._replyBox.show();
        this._syncReplyButton();
        this.emit('request-keyboard', true);
        this._replyEntry.grab_key_focus();
    }

    _syncReplyButton() {
        const enabled = !this._replyPending && validReply(this._replyEntry.text);
        this._replySend.reactive = this._replySend.can_focus = enabled;
        this._replySend.opacity = enabled ? 255 : 110;
    }

    async _sendReply() {
        const notification = this._replyNotification;
        if (this._replyPending || this._sharing || !this.active || !validReply(this._replyEntry.text))
            return;
        if (!this._center.notifications.includes(notification) ||
            !sameReplyTarget(this._replyTarget, replyTarget(notification))) {
            this._closeReply();
            return;
        }
        const operation = new Gio.Cancellable();
        this._replyPending = operation;
        this._replyEntry.clutter_text.editable = false;
        this._replyStatus.text = 'Passing reply to GSConnect…';
        this._syncReplyButton();
        try {
            await sendReply(this._replyTarget, this._replyEntry.text, operation);
            if (this._replyPending !== operation)
                return;
            this._replyEntry.text = '';
            this._replyStatus.text = 'Passed to GSConnect. Delivery depends on your phone connection.';
        } catch {
            if (this._replyPending !== operation)
                return;
            this._replyStatus.text = 'Could not confirm the reply. Check the chat before retrying.';
        } finally {
            if (this._replyPending === operation) {
                this._replyPending = null;
                this._replyEntry.clutter_text.editable = true;
                this._syncReplyButton();
            }
        }
    }

    _closeReply() {
        const wasOpen = this._replyBox.visible;
        this._replyPending?.cancel();
        this._replyPending = null;
        this._replyNotification = this._replyTarget = null;
        this._replyEntry.text = '';
        this._replyEntry.clutter_text.editable = true;
        this._replyBox.hide();
        if (wasOpen)
            this.emit('request-keyboard', false);
    }

    onDeactivate() {
        this._closeReply();
    }

    /** New cards are built ahead while another page is open too. */
    get warmsOpen() {
        return true;
    }

    /** Builds the list ahead, if it is out of date. */
    warmUp() {
        if (this._stale)
            this._update();
    }

    /** While the screen is shared or recorded, the cards leave out what the notifications say. */
    set sharing(sharing) {
        if (sharing === Boolean(this._sharing))
            return;
        this._sharing = sharing;
        if (sharing)
            this._closeReply();
        if (this.active)
            this._update();
        else
            this._stale = true;
        this.markCold();
    }

    /** Opening the page counts as seeing them all. */
    onActivate() {
        this._center.acknowledgeAll();
        // Rebuilt only if something came or went while it was closed; else just the times move on.
        if (this._stale)
            this._update();
        else
            this._times.forEach(([time, datetime]) => (time.text = Format.ago(datetime)));
    }

    /** Lets go of the notification center's signals. */
    _onDestroy() {
        this._replyPending?.cancel();
        this._replyPending = null;
        this._centerHandlers.forEach(id => this._center.disconnect(id));
    }
});
