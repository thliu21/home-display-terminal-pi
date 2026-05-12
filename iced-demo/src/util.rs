use std::net::IpAddr;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Datelike, Local, NaiveDateTime};
use chrono_tz::Tz;
use get_if_addrs::{get_if_addrs, IfAddr};

pub(crate) fn manifest_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf()
}

pub(crate) fn public_relative_path(config_url: &str, fallback: &str) -> PathBuf {
    if config_url.is_empty() {
        return manifest_path().join(fallback);
    }
    let trimmed = config_url.strip_prefix("./").unwrap_or(config_url);
    manifest_path().join("../public").join(trimmed)
}

pub(crate) fn local_ip_address() -> Option<String> {
    let interfaces = get_if_addrs().ok()?;
    interfaces.into_iter().find_map(|iface| match iface.addr {
        IfAddr::V4(addr) if !addr.ip.is_loopback() => Some(addr.ip.to_string()),
        IfAddr::V6(addr) if !addr.ip.is_loopback() => match IpAddr::V6(addr.ip) {
            IpAddr::V6(ip) if !ip.is_unique_local() => Some(ip.to_string()),
            _ => None,
        },
        _ => None,
    })
}

pub(crate) fn parse_open_meteo_time(value: &str) -> Option<NaiveDateTime> {
    NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M").ok()
}

pub(crate) fn timezone_day_key(date: DateTime<Local>, timezone: &str) -> i64 {
    if let Ok(tz) = timezone.parse::<Tz>() {
        let local = date.with_timezone(&tz);
        return i64::from(local.num_days_from_ce());
    }
    i64::from(date.num_days_from_ce())
}

pub(crate) fn parse_minutes(value: &str) -> Option<u16> {
    let (hour, minute) = value.split_once(':')?;
    Some(hour.parse::<u16>().ok()? * 60 + minute.parse::<u16>().ok()?)
}

pub(crate) fn format_short_time(time: DateTime<Local>) -> String {
    time.format("%-I:%M %p").to_string()
}

pub(crate) fn format_trend_hour(time: &str) -> String {
    let hour = time
        .get(11..13)
        .and_then(|value| value.parse::<u8>().ok())
        .unwrap_or(0);
    let display_hour = hour % 12;
    format!(
        "{}{}",
        if display_hour == 0 { 12 } else { display_hour },
        if hour < 12 { "a" } else { "p" }
    )
}
