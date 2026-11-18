# Reply from thepuchnotch

This implementation supports **reply-capable phone notifications forwarded by
GSConnect**, with KDE Connect on the paired Android phone. The Android app must
provide a notification reply action and notification sharing must be enabled.
No messaging account or credentials are stored in thepuchnotch.

Click **Reply** on the notification card or banner. The banner opens the editor
inside thepuchnotch's Notifications page. Type a message and press **Send** or Enter.
Escape or Cancel discards the draft. Closing the page also discards it.
Other notifications arriving do not replace the active editor or its recipient.

Only GSConnect notifications with an explicit device ID and valid reply UUID
are supported; app names or button labels are never used to guess a recipient.
The target is checked again before submission. Withdrawal, reply-token changes,
sharing/recording the screen, or leaving the page closes the editor. Reply fields
are hidden while sharing/recording, like notification bodies.

A submission disables Send until the D-Bus call finishes. Blank replies are
blocked; text is limited to 4096 characters. Draft text is never persisted or
logged. “Passed to GSConnect” acknowledges the local service call, **not delivery
to the recipient**. If confirmation fails, the draft stays; check the chat before
retrying because a timeout does not prove the reply was not sent.

## Compatibility and research

- [GSConnect's shell integration](https://github.com/GSConnect/gnome-shell-extension-gsconnect/blob/main/src/shell/notification.js)
  defines the device/reply metadata and application action used here.
- [GSConnect's notification plugin](https://github.com/GSConnect/gnome-shell-extension-gsconnect/blob/main/src/service/plugins/notification.js)
  implements `replyNotification` and forwards it to the paired device.
- [Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/dev/Telegram/SourceFiles/platform/linux/notifications_manager_linux.cpp)
  supports the `inline-reply` capability and `NotificationReplied` signal.
- [GNOME's notification proxy](https://github.com/GNOME/gnome-shell/blob/main/js/dbusServices/notifications/notificationDaemon.js)
  forwards a fixed set of signals that does not include `NotificationReplied`.
  Advertising inline reply from thepuchnotch alone would therefore not make native
  Telegram replies work. This implementation does not advertise that capability
  or replace the system notification server.

Native Telegram Desktop, WhatsApp Web, Discord and other desktop/browser clients
retain their existing notification actions; direct text reply is not implemented
for them. A similarly named Reply button can simply open the originating app.
No claim of universal chat support is made.

## Validation

Automated checks cover capability/recipient validation, token changes, empty and
oversized replies, Unicode, and the actual nested GVariant payload (without sending).

Manual checks still needed in a live paired GNOME session: receive a reply-capable
phone notification; open Reply from the banner and card; type while another arrives;
send once; verify receipt on the phone; test disconnected phone, service failure,
withdrawn notification, Escape, page switching, and screen sharing/recording.
