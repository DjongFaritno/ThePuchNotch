// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

//! Opt-in AlAdhan calendars, cached by location; deadlines use the destination's clock.
use crate::{clock, store::Store};
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Duration};
use thepuchnotch_core::prayer::{self, Config, Day, Month, Prayer};
use tokio::sync::Notify;
use zbus::{
    fdo, interface,
    object_server::{InterfaceRef, SignalEmitter},
};

#[derive(Default, Serialize, Deserialize)]
struct Saved {
    months: Vec<Month>,
    last_alert: i64,
}
#[derive(Default, Serialize)]
struct State {
    enabled: bool,
    city: String,
    timezone: String,
    method: u8,
    today: Option<Day>,
    next: Option<Prayer>,
    error: String,
    loading: bool,
}
pub struct PrayerService {
    config: Config,
    state: State,
    revision: u64,
    wake: Arc<Notify>,
}
impl PrayerService {
    pub fn new() -> (Self, Arc<Notify>) {
        let wake = Arc::new(Notify::new());
        (
            Self {
                config: Config::default(),
                state: State::default(),
                revision: 0,
                wake: wake.clone(),
            },
            wake,
        )
    }
}
#[interface(name = "io.github.DjongFaritno.thepuchnotch.Prayer1")]
impl PrayerService {
    async fn set_config(
        &mut self,
        config: &str,
        #[zbus(signal_emitter)] emitter: SignalEmitter<'_>,
    ) -> fdo::Result<()> {
        if config.len() > 2048 {
            return Err(fdo::Error::InvalidArgs(
                "Prayer configuration is too large".into(),
            ));
        }
        let mut next: Config =
            serde_json::from_str(config).map_err(|e| fdo::Error::InvalidArgs(e.to_string()))?;
        if let Err(error) = next.validate() {
            self.config.enabled = false;
            self.state = State {
                error: error.clone(),
                ..State::default()
            };
            self.revision += 1;
            self.wake.notify_one();
            self.state_changed(&emitter).await?;
            return Err(fdo::Error::InvalidArgs(error));
        }
        if next != self.config {
            self.config = next;
            self.revision += 1;
            self.state = State::default();
            self.wake.notify_one();
            self.state_changed(&emitter).await?;
        }
        Ok(())
    }
    #[zbus(property)]
    fn state(&self) -> String {
        serde_json::to_string(&self.state).unwrap_or_default()
    }
    #[zbus(signal)]
    async fn due(emitter: &SignalEmitter<'_>, prayer: &str) -> zbus::Result<()>;
}

fn fetch(config: Config, year: i32, month: u32) -> Result<Month, String> {
    let url = format!("https://api.aladhan.com/v1/calendarByCity/{year}/{month}");
    let value = crate::http::get(&url, Duration::from_secs(20))
        .query("city", &config.city)
        .query("country", &config.country)
        .query("method", config.method.to_string())
        .query("school", config.school.to_string())
        .query("timezonestring", &config.timezone)
        .query("iso8601", "true")
        .header(
            "User-Agent",
            concat!("thepuchnotch/", env!("CARGO_PKG_VERSION")),
        )
        .call()
        .and_then(|mut r| r.body_mut().read_json::<serde_json::Value>())
        .map_err(|_| {
            "Cannot reach AlAdhan. Check the location and connection; retrying in 15 minutes."
                .to_owned()
        })?;
    prayer::parse_calendar(&value, &config, year, month)
}

/// Sleeps until a prayer, local midnight, configuration change or a bounded network retry.
pub async fn run(iface: InterfaceRef<PrayerService>, wake: Arc<Notify>) {
    let mut store: Store<Saved> = Store::new("prayer-cache");
    let mut saved = store.load();
    // Limit disk data even when switching cities frequently.
    saved.months.truncate(3);
    let mut retry_at = 0;
    let mut seen_revision = 0;
    let mut error = String::new();
    loop {
        let (config, revision) = {
            let s = iface.get().await;
            (s.config.clone(), s.revision)
        };
        if !config.enabled {
            clock::wait_until(None, &wake).await;
            continue;
        }
        if revision != seen_revision {
            retry_at = 0;
            error.clear();
            seen_revision = revision;
        }
        let Ok(zone) = config.zone() else {
            clock::wait_until(None, &wake).await;
            continue;
        };
        let now = clock::now_ms();
        let today = prayer::local_date(now, zone);
        let tomorrow = today.succ_opt().unwrap_or(today);
        let key = config.location_key();
        let days: Vec<Day> = saved
            .months
            .iter()
            .filter(|m| m.key == key)
            .flat_map(|m| m.days.clone())
            .collect();
        let day = days.iter().find(|d| d.date == today.to_string()).cloned();
        // Missing intervening days must not turn a later cached month's dawn into "next prayer".
        let upcoming_days: Vec<Day> = days
            .iter()
            .filter(|d| d.date == today.to_string() || d.date == tomorrow.to_string())
            .cloned()
            .collect();
        let next = prayer::next_prayer(&upcoming_days, now);
        let recent = days
            .iter()
            .flat_map(|d| &d.prayers)
            .filter(|p| prayer::due(p, now, saved.last_alert))
            .max_by_key(|p| p.at_ms)
            .cloned();
        let missing = [today, tomorrow]
            .into_iter()
            .find(|date| !days.iter().any(|d| d.date == date.to_string()));
        {
            let mut s = iface.get_mut().await;
            // A concurrent config change must never publish or alert for the old city.
            if s.revision != revision {
                continue;
            }
            s.state = State {
                enabled: true,
                city: format!("{}, {}", config.city, config.country),
                timezone: config.timezone.clone(),
                method: config.method,
                today: day,
                next: next.clone(),
                loading: missing.is_some() && now >= retry_at,
                error: error.clone(),
            };
            let _ = s.state_changed(iface.signal_emitter()).await;
            if let Some(p) = recent {
                saved.last_alert = p.at_ms;
                store.save_now(&saved);
                if config.alerts {
                    let event = serde_json::json!({"name": p.name, "at_ms": p.at_ms, "time": p.time,
                        "city": config.city, "country": config.country, "timezone": config.timezone, "method": config.method, "school": config.school});
                    let _ = PrayerService::due(iface.signal_emitter(), &event.to_string()).await;
                }
            }
        }
        if let Some(date) = missing
            && now >= retry_at
        {
            let request = config.clone();
            let result =
                tokio::task::spawn_blocking(move || fetch(request, date.year(), date.month()))
                    .await;
            if iface.get().await.revision != revision {
                continue;
            }
            match result {
                Ok(Ok(month)) => {
                    saved.months.retain(|m| {
                        !(m.key == month.key && m.year == month.year && m.month == month.month)
                    });
                    saved.months.insert(0, month);
                    saved.months.truncate(3);
                    store.save(&saved);
                    error.clear();
                    retry_at = 0;
                }
                Ok(Err(message)) => {
                    error = message;
                    retry_at = clock::now_ms() + 900_000;
                }
                Err(_) => {
                    error = "Could not load prayer times; retrying in 15 minutes.".into();
                    retry_at = clock::now_ms() + 900_000;
                }
            }
            continue;
        }
        let mut deadlines = vec![prayer::midnight(tomorrow, zone).unwrap_or(now + 3_600_000)];
        if let Some(p) = next {
            deadlines.push(p.at_ms);
        }
        if missing.is_some() {
            deadlines.push(retry_at.max(now + 1_000));
        }
        clock::wait_until(deadlines.into_iter().min(), &wake).await;
    }
}
