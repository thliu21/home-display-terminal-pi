use std::fs;
use std::path::PathBuf;
use std::time::Duration;

use chrono::{DateTime, Local};
use iced::keyboard::{self, key};
use iced::{application, time, window, Font, Size, Subscription, Task, Theme};

mod config;
mod constants;
mod data;
mod model;
mod style;
mod util;
mod views;
mod weather;

use config::{
    load_app_config, load_settings, save_settings, settings_path, AppConfig, StoredSettings,
};
use constants::{GOOGLE_SANS, GOOGLE_SANS_NAME};
use data::{load_calendar, load_caltrain_rows, CalendarData, TrainRow};
use model::{EffectiveTheme, Screen, ThemeMode, Toast};
use style::Palette;
use util::{format_short_time, local_ip_address};
use weather::{fetch_weather, is_auto_light, AutoThemeWindow, WeatherLocation, WeatherPayload};

fn main() -> iced::Result {
    application(Dashboard::new, update, views::view)
        .title("Family Display")
        .subscription(subscription)
        .theme(app_theme)
        .style(views::app_style)
        .font(GOOGLE_SANS)
        .default_font(Font::with_name(GOOGLE_SANS_NAME))
        .window(window::Settings {
            size: Size::new(768.0, 1366.0),
            fullscreen: true,
            resizable: false,
            decorations: false,
            ..window::Settings::default()
        })
        .antialiasing(true)
        .run()
}

fn app_theme(_state: &Dashboard) -> Theme {
    Theme::TokyoNight
}

#[derive(Debug, Clone)]
pub(crate) enum Message {
    Keyboard(keyboard::Event),
    Tick,
    WeatherLoaded(Result<WeatherPayload, String>),
    ShowScreen(Screen),
    ToggleAutoRotate(bool),
    RotationSecondsChanged(String),
    SelectTheme(ThemeMode),
    SaveSettings,
    ResetSettings,
}

#[derive(Debug)]
pub(crate) struct Dashboard {
    pub(crate) config: AppConfig,
    pub(crate) settings: StoredSettings,
    settings_path: PathBuf,
    pub(crate) draft_auto_rotate: bool,
    pub(crate) draft_seconds: String,
    pub(crate) draft_theme: ThemeMode,
    pub(crate) screen: Screen,
    pub(crate) weather: Vec<WeatherLocation>,
    pub(crate) weather_status: String,
    pub(crate) weather_loading: bool,
    last_weather_refresh: Option<DateTime<Local>>,
    auto_theme_window: Option<AutoThemeWindow>,
    pub(crate) trains: Vec<TrainRow>,
    pub(crate) calendar: CalendarData,
    loaded_at: DateTime<Local>,
    last_rotation_at: DateTime<Local>,
    pub(crate) device_ip: Option<String>,
    pub(crate) toast: Option<Toast>,
    pub(crate) error: Option<String>,
}

impl Dashboard {
    fn new() -> (Self, Task<Message>) {
        let mut error = None;
        let config = match load_app_config() {
            Ok(config) => config,
            Err(err) => {
                error = Some(format!("Config: {err}"));
                AppConfig::default()
            }
        };
        let settings_path = settings_path();
        let settings = load_settings(&settings_path).unwrap_or_else(|err| {
            error = Some(format!("Settings: {err}"));
            StoredSettings::from_config(&config)
        });
        let trains = load_caltrain_rows().unwrap_or_else(|err| {
            error = Some(format!("Caltrain CSV: {err}"));
            Vec::new()
        });
        let calendar = load_calendar(&config.calendar.data_url).unwrap_or_else(|err| {
            error = Some(format!("Calendar JSON: {err}"));
            CalendarData::default()
        });
        let now = Local::now();
        let default_view = config.default_screen();
        let mut state = Self {
            draft_auto_rotate: settings.auto_rotate_enabled,
            draft_seconds: settings.auto_rotate_seconds.to_string(),
            draft_theme: settings.theme,
            settings,
            settings_path,
            screen: default_view,
            weather: Vec::new(),
            weather_status: "Updating weather".to_string(),
            weather_loading: true,
            last_weather_refresh: None,
            auto_theme_window: None,
            trains,
            calendar,
            loaded_at: now,
            last_rotation_at: now,
            device_ip: local_ip_address(),
            toast: None,
            error,
            config,
        };
        state.sync_settings_draft();

        let locations = state.config.weather_locations.clone();
        (
            state,
            Task::perform(fetch_weather(locations), Message::WeatherLoaded),
        )
    }

    fn sync_settings_draft(&mut self) {
        self.draft_auto_rotate = self.settings.auto_rotate_enabled;
        self.draft_seconds = self.settings.auto_rotate_seconds.to_string();
        self.draft_theme = self.settings.theme;
    }

    fn effective_theme(&self) -> EffectiveTheme {
        match self.settings.theme {
            ThemeMode::Light => EffectiveTheme::Light,
            ThemeMode::Dark => EffectiveTheme::Dark,
            ThemeMode::Auto => {
                if is_auto_light(Local::now(), &self.auto_theme_window) {
                    EffectiveTheme::Light
                } else {
                    EffectiveTheme::Dark
                }
            }
        }
    }

    pub(crate) fn palette(&self) -> Palette {
        Palette::new(self.effective_theme())
    }

    fn save_settings(&mut self) -> Task<Message> {
        let seconds = self
            .draft_seconds
            .parse::<u16>()
            .unwrap_or(self.settings.auto_rotate_seconds)
            .clamp(10, 600);
        self.settings = StoredSettings {
            auto_rotate_enabled: self.draft_auto_rotate,
            auto_rotate_seconds: seconds,
            theme: self.draft_theme,
        };
        self.sync_settings_draft();
        self.last_rotation_at = Local::now();

        match save_settings(&self.settings_path, &self.settings) {
            Ok(()) => {
                self.toast = Some(Toast::new("Settings saved"));
                self.screen = Screen::Weather;
            }
            Err(err) => {
                self.toast = Some(Toast::new(format!("Settings error: {err}")));
            }
        }
        Task::none()
    }
}

fn update(state: &mut Dashboard, message: Message) -> Task<Message> {
    match message {
        Message::Keyboard(event) => {
            if let keyboard::Event::KeyPressed {
                key,
                physical_key,
                repeat: false,
                ..
            } = event
            {
                match key.as_ref() {
                    keyboard::Key::Named(key::Named::ArrowLeft) => {
                        state.screen = state.screen.previous();
                        state.last_rotation_at = Local::now();
                    }
                    keyboard::Key::Named(key::Named::ArrowRight | key::Named::Space) => {
                        state.screen = state.screen.next();
                        state.last_rotation_at = Local::now();
                    }
                    keyboard::Key::Character(value) => {
                        let key_value = key
                            .to_latin(physical_key)
                            .map(|ch| ch.to_string())
                            .unwrap_or_else(|| value.to_string())
                            .to_ascii_lowercase();
                        match key_value.as_str() {
                            "e" => {
                                state.screen = state.screen.previous();
                                state.last_rotation_at = Local::now();
                            }
                            "f" => {
                                state.screen = state.screen.next();
                                state.last_rotation_at = Local::now();
                            }
                            "t" => {
                                state.settings.theme = state.settings.theme.next();
                                state.draft_theme = state.settings.theme;
                                let _ = save_settings(&state.settings_path, &state.settings);
                                state.toast = Some(Toast::new(format!(
                                    "Theme: {}",
                                    state.settings.theme.label()
                                )));
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
            Task::none()
        }
        Message::Tick => {
            let now = Local::now();
            if let Some(toast) = &state.toast {
                if now
                    .signed_duration_since(toast.created_at)
                    .num_milliseconds()
                    > 1800
                {
                    state.toast = None;
                }
            }

            if state.settings.auto_rotate_enabled
                && state.screen != Screen::Settings
                && now
                    .signed_duration_since(state.last_rotation_at)
                    .num_seconds()
                    >= i64::from(state.settings.auto_rotate_seconds)
            {
                state.screen = state.screen.next();
                state.last_rotation_at = now;
            }

            let refresh_minutes = i64::from(state.config.weather_refresh_minutes.max(1));
            let should_refresh = state
                .last_weather_refresh
                .map(|last| now.signed_duration_since(last).num_minutes() >= refresh_minutes)
                .unwrap_or(false);
            if should_refresh && !state.weather_loading {
                state.weather_loading = true;
                state.weather_status = "Updating weather".to_string();
                let locations = state.config.weather_locations.clone();
                return Task::perform(fetch_weather(locations), Message::WeatherLoaded);
            }

            Task::none()
        }
        Message::WeatherLoaded(result) => {
            state.weather_loading = false;
            match result {
                Ok(payload) => {
                    state.auto_theme_window = payload.auto_theme_window;
                    state.weather = payload.locations;
                    state.loaded_at = Local::now();
                    state.last_weather_refresh = Some(state.loaded_at);
                    state.weather_status =
                        format!("Updated {}", format_short_time(state.loaded_at));
                    state.error = None;
                }
                Err(err) => {
                    state.weather_status = "Weather offline".to_string();
                    if state.weather.is_empty() {
                        state.error = Some(err);
                    }
                }
            }
            Task::none()
        }
        Message::ShowScreen(screen) => {
            state.screen = screen;
            state.last_rotation_at = Local::now();
            if screen == Screen::Settings {
                state.sync_settings_draft();
            }
            Task::none()
        }
        Message::ToggleAutoRotate(value) => {
            state.draft_auto_rotate = value;
            Task::none()
        }
        Message::RotationSecondsChanged(value) => {
            let filtered: String = value.chars().filter(|ch| ch.is_ascii_digit()).collect();
            state.draft_seconds = filtered.chars().take(3).collect();
            Task::none()
        }
        Message::SelectTheme(theme) => {
            state.draft_theme = theme;
            Task::none()
        }
        Message::SaveSettings => state.save_settings(),
        Message::ResetSettings => {
            let _ = fs::remove_file(&state.settings_path);
            state.settings = StoredSettings::from_config(&state.config);
            state.sync_settings_draft();
            state.last_rotation_at = Local::now();
            state.toast = Some(Toast::new("Settings reset"));
            Task::none()
        }
    }
}

fn subscription(_state: &Dashboard) -> Subscription<Message> {
    Subscription::batch([
        keyboard::listen().map(Message::Keyboard),
        time::every(Duration::from_secs(1)).map(|_| Message::Tick),
    ])
}
