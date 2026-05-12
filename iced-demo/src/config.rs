use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::constants::APP_CONFIG;
use crate::model::{Screen, ThemeMode};
use crate::util::manifest_path;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AppConfig {
    #[serde(default = "default_weather_refresh")]
    pub(crate) weather_refresh_minutes: u16,
    #[serde(default)]
    default_view: String,
    #[serde(default)]
    pub(crate) theme: ThemeMode,
    #[serde(default)]
    pub(crate) auto_rotate: AutoRotateConfig,
    #[serde(default)]
    pub(crate) calendar: CalendarConfig,
    #[serde(default)]
    pub(crate) weather_locations: Vec<WeatherConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            weather_refresh_minutes: default_weather_refresh(),
            default_view: "weather".to_string(),
            theme: ThemeMode::Auto,
            auto_rotate: AutoRotateConfig::default(),
            calendar: CalendarConfig::default(),
            weather_locations: Vec::new(),
        }
    }
}

impl AppConfig {
    pub(crate) fn default_screen(&self) -> Screen {
        match self.default_view.as_str() {
            "caltrain" => Screen::Caltrain,
            "calendar" => Screen::Calendar,
            "settings" => Screen::Settings,
            _ => Screen::Weather,
        }
    }
}

fn default_weather_refresh() -> u16 {
    20
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AutoRotateConfig {
    #[serde(default = "default_true")]
    pub(crate) enabled: bool,
    #[serde(default = "default_rotation_seconds")]
    pub(crate) seconds: u16,
}

impl Default for AutoRotateConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            seconds: default_rotation_seconds(),
        }
    }
}

fn default_true() -> bool {
    true
}

fn default_rotation_seconds() -> u16 {
    45
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WeatherConfig {
    pub(crate) name: String,
    #[serde(default)]
    pub(crate) display_name: Option<String>,
    pub(crate) latitude: f64,
    pub(crate) longitude: f64,
    #[serde(default)]
    pub(crate) timezone: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CalendarConfig {
    #[serde(default = "default_calendar_data_url")]
    pub(crate) data_url: String,
    #[serde(default)]
    pub(crate) sources: Vec<CalendarSource>,
}

fn default_calendar_data_url() -> String {
    "./data/calendar-events.json".to_string()
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CalendarSource {
    pub(crate) id: String,
    pub(crate) label: String,
    pub(crate) color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct StoredSettings {
    #[serde(default = "default_true")]
    pub(crate) auto_rotate_enabled: bool,
    #[serde(default = "default_rotation_seconds")]
    pub(crate) auto_rotate_seconds: u16,
    #[serde(default)]
    pub(crate) theme: ThemeMode,
}

impl StoredSettings {
    pub(crate) fn from_config(config: &AppConfig) -> Self {
        Self {
            auto_rotate_enabled: config.auto_rotate.enabled,
            auto_rotate_seconds: config.auto_rotate.seconds.clamp(10, 600),
            theme: config.theme,
        }
    }
}

pub(crate) fn load_app_config() -> Result<AppConfig, String> {
    let path = manifest_path().join(APP_CONFIG);
    let contents =
        fs::read_to_string(&path).map_err(|err| format!("{} ({err})", path.display()))?;
    let start = contents
        .find('{')
        .ok_or_else(|| format!("{} missing config object", path.display()))?;
    let end = contents
        .rfind('}')
        .ok_or_else(|| format!("{} missing config object end", path.display()))?;
    json5::from_str(&contents[start..=end]).map_err(|err| format!("{} ({err})", path.display()))
}

pub(crate) fn load_settings(path: &Path) -> Result<StoredSettings, String> {
    if !path.exists() {
        return Err("not found".to_string());
    }
    let contents = fs::read_to_string(path).map_err(|err| format!("{} ({err})", path.display()))?;
    serde_json::from_str(&contents).map_err(|err| format!("{} ({err})", path.display()))
}

pub(crate) fn save_settings(path: &Path, settings: &StoredSettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("{} ({err})", parent.display()))?;
    }
    let contents =
        serde_json::to_string_pretty(settings).map_err(|err| format!("settings JSON ({err})"))?;
    fs::write(path, contents).map_err(|err| format!("{} ({err})", path.display()))
}

pub(crate) fn settings_path() -> PathBuf {
    if let Ok(config_home) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(config_home)
            .join("family-display")
            .join("settings.json");
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".config")
        .join("family-display")
        .join("settings.json")
}
