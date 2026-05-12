use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ThemeMode {
    Light,
    Dark,
    #[default]
    Auto,
}

impl ThemeMode {
    pub(crate) fn label(self) -> &'static str {
        match self {
            Self::Light => "Light",
            Self::Dark => "Dark",
            Self::Auto => "Auto",
        }
    }

    pub(crate) fn next(self) -> Self {
        match self {
            Self::Light => Self::Dark,
            Self::Dark => Self::Auto,
            Self::Auto => Self::Light,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EffectiveTheme {
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Screen {
    Weather,
    Caltrain,
    Calendar,
    Settings,
}

impl Screen {
    pub(crate) const ALL: [Self; 4] = [
        Self::Weather,
        Self::Caltrain,
        Self::Calendar,
        Self::Settings,
    ];
    const ROTATION: [Self; 3] = [Self::Weather, Self::Caltrain, Self::Calendar];

    pub(crate) fn title(self) -> &'static str {
        match self {
            Self::Weather => "Weather",
            Self::Caltrain => "Caltrain",
            Self::Calendar => "Calendar",
            Self::Settings => "Settings",
        }
    }

    pub(crate) fn next(self) -> Self {
        let views = if self == Self::Settings {
            &Self::ALL[..]
        } else {
            &Self::ROTATION[..]
        };
        let index = views.iter().position(|screen| *screen == self).unwrap_or(0);
        views[(index + 1) % views.len()]
    }

    pub(crate) fn previous(self) -> Self {
        let views = if self == Self::Settings {
            &Self::ALL[..]
        } else {
            &Self::ROTATION[..]
        };
        let index = views.iter().position(|screen| *screen == self).unwrap_or(0);
        views[(index + views.len() - 1) % views.len()]
    }
}

#[derive(Debug, Clone)]
pub(crate) struct Toast {
    pub(crate) message: String,
    pub(crate) created_at: DateTime<Local>,
}

impl Toast {
    pub(crate) fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            created_at: Local::now(),
        }
    }
}
