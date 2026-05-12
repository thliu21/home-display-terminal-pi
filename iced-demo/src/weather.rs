use chrono::{DateTime, Local, NaiveDateTime, Timelike};
use chrono_tz::Tz;
use serde::Deserialize;

use crate::config::WeatherConfig;
use crate::util::{format_short_time, format_trend_hour, parse_open_meteo_time, timezone_day_key};

#[derive(Debug, Clone)]
pub(crate) struct WeatherPayload {
    pub(crate) locations: Vec<WeatherLocation>,
    pub(crate) auto_theme_window: Option<AutoThemeWindow>,
}

#[derive(Debug, Clone)]
pub(crate) struct WeatherLocation {
    pub(crate) display_name: String,
    pub(crate) condition: String,
    pub(crate) kind: String,
    pub(crate) icon: String,
    pub(crate) temperature_c: i32,
    pub(crate) feels_like_c: i32,
    pub(crate) humidity_percent: u8,
    pub(crate) wind_kmh: u16,
    pub(crate) high_c: i32,
    pub(crate) low_c: i32,
    pub(crate) local_time: String,
    pub(crate) day_offset: Option<i8>,
    pub(crate) trend: Vec<TrendPoint>,
}

#[derive(Debug, Clone)]
pub(crate) struct TrendPoint {
    pub(crate) time: String,
    pub(crate) temperature_c: i32,
}

#[derive(Debug, Clone)]
pub(crate) struct AutoThemeWindow {
    timezone: Tz,
    sunrise: NaiveDateTime,
    sunset: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoResponse {
    current: Option<OpenMeteoCurrent>,
    daily: Option<OpenMeteoDaily>,
    hourly: Option<OpenMeteoHourly>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoCurrent {
    time: Option<String>,
    temperature_2m: Option<f64>,
    relative_humidity_2m: Option<f64>,
    apparent_temperature: Option<f64>,
    weather_code: Option<u16>,
    wind_speed_10m: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoDaily {
    temperature_2m_max: Option<Vec<f64>>,
    temperature_2m_min: Option<Vec<f64>>,
    sunrise: Option<Vec<String>>,
    sunset: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct OpenMeteoHourly {
    time: Option<Vec<String>>,
    temperature_2m: Option<Vec<f64>>,
}

pub(crate) async fn fetch_weather(locations: Vec<WeatherConfig>) -> Result<WeatherPayload, String> {
    if locations.is_empty() {
        return Err("Add weather locations in app-config.js".to_string());
    }

    let client = reqwest::Client::new();
    let mut cards = Vec::new();
    let home_timezone = locations
        .first()
        .and_then(|location| location.timezone.as_deref())
        .unwrap_or("America/Los_Angeles")
        .to_string();
    let home_day_key = timezone_day_key(Local::now(), &home_timezone);
    let mut auto_theme_window = None;

    for (index, location) in locations.into_iter().take(4).enumerate() {
        let timezone = location
            .timezone
            .clone()
            .unwrap_or_else(|| "auto".to_string());
        let response = client
            .get("https://api.open-meteo.com/v1/forecast")
            .query(&[
                ("latitude", location.latitude.to_string()),
                ("longitude", location.longitude.to_string()),
                (
                    "current",
                    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m".to_string(),
                ),
                (
                    "daily",
                    "temperature_2m_max,temperature_2m_min,sunrise,sunset".to_string(),
                ),
                ("hourly", "temperature_2m".to_string()),
                ("temperature_unit", "celsius".to_string()),
                ("wind_speed_unit", "kmh".to_string()),
                ("precipitation_unit", "inch".to_string()),
                ("timezone", timezone.clone()),
                ("forecast_days", "2".to_string()),
            ])
            .send()
            .await
            .map_err(|err| format!("Weather request failed: {err}"))?;

        if !response.status().is_success() {
            return Err(format!("Weather request failed: {}", response.status()));
        }

        let data: OpenMeteoResponse = response
            .json()
            .await
            .map_err(|err| format!("Weather response failed: {err}"))?;
        let card = weather_card_from_response(&location, &timezone, data, home_day_key)?;
        if index == 0 {
            auto_theme_window = card.1;
        }
        cards.push(card.0);
    }

    Ok(WeatherPayload {
        locations: cards,
        auto_theme_window,
    })
}

pub(crate) fn is_auto_light(now: DateTime<Local>, window: &Option<AutoThemeWindow>) -> bool {
    if let Some(window) = window {
        let local = now.with_timezone(&window.timezone).naive_local();
        return local >= window.sunrise && local < window.sunset;
    }
    let hour = now.hour();
    (7..19).contains(&hour)
}

fn weather_card_from_response(
    config: &WeatherConfig,
    timezone: &str,
    data: OpenMeteoResponse,
    home_day_key: i64,
) -> Result<(WeatherLocation, Option<AutoThemeWindow>), String> {
    let current = data.current.ok_or("missing current weather")?;
    let daily = data.daily.unwrap_or(OpenMeteoDaily {
        temperature_2m_max: None,
        temperature_2m_min: None,
        sunrise: None,
        sunset: None,
    });
    let hourly = data.hourly.unwrap_or(OpenMeteoHourly {
        time: None,
        temperature_2m: None,
    });
    let code = current.weather_code.unwrap_or(3);
    let (condition, kind) = weather_code_label(code);
    let icon = weather_icon(kind);
    let temperature = current.temperature_2m.unwrap_or_default().round() as i32;
    let timezone_value = timezone.parse::<Tz>().ok();
    let local_now = timezone_value
        .map(|tz| {
            Local::now()
                .with_timezone(&tz)
                .format("%-I:%M %p")
                .to_string()
        })
        .unwrap_or_else(|| format_short_time(Local::now()));
    let day_offset = timezone_day_key(Local::now(), timezone) - home_day_key;
    let auto_window = timezone_value.and_then(|tz| {
        let sunrise = daily.sunrise.as_ref()?.first()?;
        let sunset = daily.sunset.as_ref()?.first()?;
        Some(AutoThemeWindow {
            timezone: tz,
            sunrise: parse_open_meteo_time(sunrise)?,
            sunset: parse_open_meteo_time(sunset)?,
        })
    });

    Ok((
        WeatherLocation {
            display_name: config
                .display_name
                .clone()
                .unwrap_or_else(|| config.name.clone()),
            condition: condition.to_string(),
            kind: kind.to_string(),
            icon: icon.to_string(),
            temperature_c: temperature,
            feels_like_c: current
                .apparent_temperature
                .unwrap_or(temperature as f64)
                .round() as i32,
            humidity_percent: current.relative_humidity_2m.unwrap_or_default().round() as u8,
            wind_kmh: current.wind_speed_10m.unwrap_or_default().round() as u16,
            high_c: daily
                .temperature_2m_max
                .as_ref()
                .and_then(|temps| temps.first())
                .copied()
                .unwrap_or(temperature as f64)
                .round() as i32,
            low_c: daily
                .temperature_2m_min
                .as_ref()
                .and_then(|temps| temps.first())
                .copied()
                .unwrap_or(temperature as f64)
                .round() as i32,
            local_time: local_now,
            day_offset: i8::try_from(day_offset).ok().filter(|offset| *offset != 0),
            trend: build_trend(current.time.as_deref(), &hourly),
        },
        auto_window,
    ))
}

fn build_trend(current_time: Option<&str>, hourly: &OpenMeteoHourly) -> Vec<TrendPoint> {
    let times = hourly.time.as_deref().unwrap_or_default();
    let temps = hourly.temperature_2m.as_deref().unwrap_or_default();
    if times.is_empty() || temps.is_empty() {
        return Vec::new();
    }

    let current_hour = current_time.and_then(|time| time.get(0..13));
    let start = current_hour
        .and_then(|hour| times.iter().position(|time| time.get(0..13) >= Some(hour)))
        .unwrap_or(0);

    times
        .iter()
        .skip(start)
        .zip(temps.iter().skip(start))
        .take(13)
        .map(|(time, temp)| TrendPoint {
            time: format_trend_hour(time),
            temperature_c: temp.round() as i32,
        })
        .collect()
}

fn weather_code_label(code: u16) -> (&'static str, &'static str) {
    match code {
        0 | 1 => ("Clear", "sun"),
        2 => ("Partly cloudy", "cloud-sun"),
        3 => ("Cloudy", "cloud"),
        45 | 48 => ("Fog", "fog"),
        51 | 53 => ("Drizzle", "drizzle"),
        55 | 61 | 63 | 65 | 80 | 81 | 82 => ("Rain", "rain"),
        56 | 57 | 66 | 67 => ("Freezing rain", "sleet"),
        71 | 73 | 75 | 77 | 85 | 86 => ("Snow", "snow"),
        95 | 96 | 99 => ("Thunderstorm", "storm"),
        _ => ("Weather", "cloud"),
    }
}

fn weather_icon(kind: &str) -> &'static str {
    match kind {
        "sun" => "clear-day.svg",
        "cloud-sun" => "cloudy-1-day.svg",
        "cloud" => "cloudy.svg",
        "drizzle" => "rainy-1.svg",
        "rain" => "rainy-3.svg",
        "snow" => "snowy-2.svg",
        "sleet" => "rain-and-sleet-mix.svg",
        "storm" => "thunderstorms.svg",
        "fog" => "fog.svg",
        _ => "cloudy.svg",
    }
}
