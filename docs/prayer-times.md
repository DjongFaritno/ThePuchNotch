# Prayer times in thepuchnotch

## Research and design

- [Nusa](https://rama2555.github.io/nusa/) puts the five daily prayers, the next prayer and its countdown in one page, with a prayer-time alert. It computes locally from a city or an optional device location.
- [Poni](https://github.com/liimalim/Poni) describes a Prayer Times tab, countdown reminders and adhan from a personal recording.
- [Oyenza Studio](https://github.com/lucacadalora/oyenza-studio#add-ons) provides a prayer add-on with city selection, local calculation, countdowns and stoppable adhan. Its Indonesia timetable work is specific to that implementation; this fork does not claim that validation or copy its code/audio.
- [AlAdhan API](https://aladhan.com/prayer-times-api) offers monthly city calendars, calculation-method and school parameters, timezone selection, and ISO 8601 timestamps. Method 20 is Kemenag. This is a calculated timetable, **not** a direct download of Kemenag's official published schedule. Compare the selected method/location against your mosque's timetable.

This implementation uses AlAdhan rather than introducing and maintaining a new astronomical calculation engine. It downloads only missing months, keeps them for offline use and makes the source explicit. Network access is required for a location/month that is not cached.

## Using it

1. Open Settings → Prayer Times and enter your city, country and IANA timezone. Indonesian presets include Jakarta, Bandung, Surabaya, Makassar and Jayapura. A preset fills the fields; **Apply** saves them. No GPS or IP geolocation is performed.
2. Choose the calculation method and Standard or Hanafi Ashar. The default is Jakarta, Indonesia, Asia/Jakarta, Kemenag, Standard; it is a starting value, not an inferred user location.
3. Enable prayer times. The Shalat tab displays Subuh, Dzuhur, Ashar, Maghrib and Isya, plus the upcoming prayer and its countdown. It participates in Page Order and custom page shortcuts.
4. Prayer reminders can be disabled independently. Choose Silent, Short chime, or your own local WAV/OGG adzan recording. No recording is bundled or downloaded. **Stop adzan** is on the page and the prayer alert.

Times and the calendar date use the selected location's timezone, not the desktop's. After Isya the countdown targets tomorrow's Subuh. Calculations at high latitudes that return absent or invalid times are shown as unavailable, never invented.

## Cache and alerts

`~/.local/share/thepuchnotch/prayer-cache.json` retains at most three monthly calendars and the last prayer already alerted. Cache identities include city, country, timezone, method and Ashar school. Changing these never reuses another location's schedule. Disabling the feature stops future requests; an already running request may finish, but its result is discarded after a configuration change.

The current month is fetched once when needed; the following month is requested on the last day so tomorrow's countdown works. Failures retry after 15 minutes while enabled. Already downloaded current dates still work offline. Yesterday's timetable is not relabelled as today's. Switching off and on retries immediately.

The service sleeps until a prayer, local midnight or retry. Waits re-check after suspend. Only prayer events up to 90 seconds old can alert; restarting or waking the computer does not replay earlier prayers. Do Not Disturb suppresses alerts and stops audio already playing. Fullscreen can defer an alert, but it expires after 90 seconds. Disabling prayer/reminders, changing location/audio, locking the session or disabling the extension stops playback. Audio also stops after ten minutes at the latest.

## API contract

`GET https://api.aladhan.com/v1/calendarByCity/{year}/{month}` with URL-encoded `city`, `country`, `method`, `school`, `timezonestring`, and `iso8601=true`. Each request has a 20-second timeout and uses the daemon's existing HTTPS client. Responses must have a full ordered month, the requested method/timezone, and five increasing timestamps per date. ISO offsets are cross-checked against IANA timezone rules.

The reduced fixture in `crates/thepuchnotch-core/tests/fixtures/prayer-jakarta.json` was captured from AlAdhan for Jakarta, November 2026, method 20. It contains only parser inputs, no user data. Tests cover invalid calendars, destination timezone/DST, next-day rollover, cache separation, and stale/duplicate alert suppression.

## Validation in the development sandbox

- Live AlAdhan city-calendar response checked with Jakarta, November 2026.
- Daemon debug build passed; all 89 core tests passed, including the prayer tests.
- All 13 JavaScript test files, ESLint, existing GJS format/download tests and strict GSettings schema validation passed.
- The full daemon suite had 287 passes, 47 failures and 8 ignored tests. Failures were in existing command execution, D-Bus and network/socket tests, with sandbox read-only/permission/address errors; this suite is not fully green in this environment.
- Real GNOME rendering and audible adzan playback still require a desktop-session check after installing the updated extension.
