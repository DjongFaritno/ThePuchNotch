// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

//! Prayer configuration, validated API calendars and timezone-aware scheduling.
use chrono::{DateTime, Datelike, Duration, NaiveDate, TimeZone, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Location and calculation settings; no network activity until explicitly enabled.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct Config {
    pub enabled: bool,
    pub alerts: bool,
    pub city: String,
    pub country: String,
    pub timezone: String,
    pub method: u8,
    pub school: u8,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: false,
            alerts: true,
            city: "Jakarta".into(),
            country: "Indonesia".into(),
            timezone: "Asia/Jakarta".into(),
            method: 20,
            school: 0,
        }
    }
}
impl Config {
    /// Validate before constructing a request. No inferred location or silent timezone fallback.
    pub fn validate(&mut self) -> Result<(), String> {
        self.city = self.city.trim().to_owned();
        self.country = self.country.trim().to_owned();
        self.timezone = self.timezone.trim().to_owned();
        for text in [&self.city, &self.country] {
            if text.is_empty() || text.len() > 120 || text.chars().any(char::is_control) {
                return Err("Enter a city and country (1–120 characters).".into());
            }
        }
        self.zone()?;
        if ![1, 2, 3, 4, 5, 11, 13, 15, 17, 20].contains(&self.method) || self.school > 1 {
            return Err("Choose a supported calculation method and Asr school.".into());
        }
        Ok(())
    }
    pub fn zone(&self) -> Result<Tz, String> {
        self.timezone
            .parse()
            .map_err(|_| "Enter an IANA timezone, such as Asia/Jakarta.".into())
    }
    /// Cache identity deliberately excludes switches that do not affect the times.
    pub fn location_key(&self) -> String {
        serde_json::to_string(&(
            &self.city,
            &self.country,
            &self.timezone,
            self.method,
            self.school,
        ))
        .unwrap_or_default()
    }
}

/// One daily prayer; ISO timestamps keep its local date and UTC offset together.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Prayer {
    pub name: String,
    pub at_ms: i64,
    pub time: String,
}
/// All five prayers for one date in the selected location.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Day {
    pub date: String,
    pub prayers: Vec<Prayer>,
}
/// A checked calendar, isolated by location, method, timezone and school.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Month {
    pub key: String,
    pub year: i32,
    pub month: u32,
    pub days: Vec<Day>,
}

/// Reject partial months, malformed times, wrong methods/zones and mismatched dates atomically.
pub fn parse_calendar(
    value: &Value,
    config: &Config,
    year: i32,
    month: u32,
) -> Result<Month, String> {
    let bad = || "The prayer provider returned an invalid calendar.".to_owned();
    if value["code"].as_u64() != Some(200) {
        return Err(bad());
    }
    let zone = config.zone()?;
    let first = NaiveDate::from_ymd_opt(year, month, 1).ok_or_else(bad)?;
    let after = (first + Duration::days(32)).with_day(1).ok_or_else(bad)?;
    let count = (after - first).num_days() as usize;
    let rows = value["data"].as_array().ok_or_else(bad)?;
    if rows.len() != count {
        return Err(bad());
    }
    let mut days = Vec::new();
    for (index, row) in rows.iter().enumerate() {
        let date = first + Duration::days(index as i64);
        if row["date"]["gregorian"]["date"].as_str() != Some(&date.format("%d-%m-%Y").to_string())
            || row["meta"]["method"]["id"].as_u64() != Some(u64::from(config.method))
            || row["meta"]["timezone"].as_str() != Some(config.timezone.as_str())
        {
            return Err(bad());
        }
        let mut prayers = Vec::new();
        for (key, name) in [
            ("Fajr", "Subuh"),
            ("Dhuhr", "Dzuhur"),
            ("Asr", "Ashar"),
            ("Maghrib", "Maghrib"),
            ("Isha", "Isya"),
        ] {
            let iso = row["timings"][key].as_str().ok_or_else(bad)?;
            let at = DateTime::parse_from_rfc3339(iso).map_err(|_| bad())?;
            let local = at.with_timezone(&zone);
            // A timezone string and a timestamp must agree, including DST.
            if local.date_naive() != date
                || local.naive_local() != at.naive_local()
                || prayers
                    .last()
                    .is_some_and(|p: &Prayer| p.at_ms >= at.timestamp_millis())
            {
                return Err(bad());
            }
            prayers.push(Prayer {
                name: name.into(),
                at_ms: at.timestamp_millis(),
                time: local.format("%H:%M").to_string(),
            });
        }
        days.push(Day {
            date: date.to_string(),
            prayers,
        });
    }
    Ok(Month {
        key: config.location_key(),
        year,
        month,
        days,
    })
}

/// The next prayer, including tomorrow's dawn after today's Isya.
pub fn next_prayer(days: &[Day], now: i64) -> Option<Prayer> {
    days.iter()
        .flat_map(|day| &day.prayers)
        .filter(|p| p.at_ms > now)
        .min_by_key(|p| p.at_ms)
        .cloned()
}

/// A selected location's day, independent of the computer's timezone.
pub fn local_date(now: i64, zone: Tz) -> NaiveDate {
    DateTime::<Utc>::from_timestamp_millis(now)
        .unwrap_or_default()
        .with_timezone(&zone)
        .date_naive()
}
/// Midnight may be skipped by daylight saving rules; use the first existing quarter hour.
pub fn midnight(date: NaiveDate, zone: Tz) -> Option<i64> {
    let start = date.and_hms_opt(0, 0, 0)?;
    (0..=8).find_map(|quarter| {
        zone.from_local_datetime(&(start + Duration::minutes(quarter * 15)))
            .earliest()
            .map(|time| time.timestamp_millis())
    })
}
/// Only a recent prayer can alert. Suspend/login must never replay old adhans.
pub fn due(prayer: &Prayer, now: i64, last_alert: i64) -> bool {
    prayer.at_ms > last_alert && (0..=90_000).contains(&(now - prayer.at_ms))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn location_and_method_isolate_cache_but_switches_do_not() {
        let a = Config::default();
        let mut b = a.clone();
        b.enabled = true;
        b.alerts = false;
        assert_eq!(a.location_key(), b.location_key());
        b.city = "Bandung".into();
        assert_ne!(a.location_key(), b.location_key());
        b = a.clone();
        b.method = 3;
        assert_ne!(a.location_key(), b.location_key());
        b.timezone = "not-a-zone".into();
        assert!(b.validate().is_err());
    }
    #[test]
    fn midnight_uses_destination_timezone_and_dst() {
        let zone: Tz = "America/New_York".parse().unwrap();
        let d = NaiveDate::from_ymd_opt(2026, 3, 8).unwrap();
        assert_eq!(
            midnight(d.succ_opt().unwrap(), zone).unwrap() - midnight(d, zone).unwrap(),
            23 * 3_600_000
        );
        let now = DateTime::parse_from_rfc3339("2026-12-31T18:00:00Z")
            .unwrap()
            .timestamp_millis();
        assert_eq!(
            local_date(now, "Asia/Jakarta".parse().unwrap()).to_string(),
            "2027-01-01"
        );
    }
    #[test]
    fn no_early_duplicate_or_stale_adhan() {
        let p = Prayer {
            name: "Subuh".into(),
            at_ms: 100_000,
            time: "04:00".into(),
        };
        assert!(!due(&p, 99_999, 0));
        assert!(due(&p, 100_000, 0));
        assert!(!due(&p, 100_000, 100_000));
        assert!(!due(&p, 190_001, 0));
        assert!(!due(&p, 99_000, 100_000));
    }
    #[test]
    fn actual_api_calendar_is_validated_and_partial_or_wrong_dates_rejected() {
        let value: Value =
            serde_json::from_str(include_str!("../tests/fixtures/prayer-jakarta.json")).unwrap();
        let c = Config::default();
        let parsed = parse_calendar(&value, &c, 2026, 11).unwrap();
        assert_eq!(parsed.days.len(), 30);
        assert_eq!(parsed.days[0].prayers[0].time, "04:06");
        let last = parsed.days[0].prayers.last().unwrap();
        assert_eq!(
            next_prayer(&parsed.days, last.at_ms).unwrap(),
            parsed.days[1].prayers[0]
        );
        assert_eq!(
            next_prayer(
                &parsed.days,
                parsed.days.last().unwrap().prayers.last().unwrap().at_ms
            ),
            None
        );

        let mut broken = value.clone();
        broken["data"].as_array_mut().unwrap().pop();
        assert!(parse_calendar(&broken, &c, 2026, 11).is_err());
        broken = value.clone();
        broken["data"][0]["timings"]["Fajr"] = "04:00".into();
        assert!(parse_calendar(&broken, &c, 2026, 11).is_err());
        assert!(parse_calendar(&value, &c, 2026, 12).is_err());
        let mut wrong = c.clone();
        wrong.method = 3;
        assert!(parse_calendar(&value, &wrong, 2026, 11).is_err());
    }
}
