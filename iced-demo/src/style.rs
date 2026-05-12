use iced::widget::{button, container};
use iced::{gradient, Border, Color, Shadow, Vector};

use crate::model::EffectiveTheme;

#[derive(Debug, Clone, Copy)]
pub(crate) struct Palette {
    pub(crate) effective: EffectiveTheme,
    pub(crate) bg: Color,
    pub(crate) panel: Color,
    pub(crate) panel_strong: Color,
    pub(crate) text: Color,
    pub(crate) muted: Color,
    pub(crate) line: Color,
    pub(crate) nav_bg: Color,
    pub(crate) blue: Color,
    pub(crate) ip: Color,
}

impl Palette {
    pub(crate) fn new(effective: EffectiveTheme) -> Self {
        match effective {
            EffectiveTheme::Dark => Self {
                effective,
                bg: rgb(7, 17, 15),
                panel: rgba(246, 241, 229, 0.08),
                panel_strong: rgba(246, 241, 229, 0.13),
                text: rgb(247, 241, 228),
                muted: rgb(185, 192, 173),
                line: rgba(247, 241, 228, 0.14),
                nav_bg: rgba(247, 241, 228, 0.10),
                blue: rgb(143, 188, 230),
                ip: rgba(247, 241, 228, 0.42),
            },
            EffectiveTheme::Light => Self {
                effective,
                bg: rgb(247, 251, 255),
                panel: rgba(255, 255, 255, 0.68),
                panel_strong: rgba(255, 255, 255, 0.90),
                text: rgb(23, 35, 38),
                muted: rgb(99, 112, 115),
                line: rgba(37, 60, 67, 0.12),
                nav_bg: rgba(255, 255, 255, 0.78),
                blue: rgb(52, 127, 209),
                ip: rgba(23, 35, 38, 0.42),
            },
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct WeatherTone {
    pub(crate) accent: Color,
    start: Color,
    end: Color,
    border: Color,
}

impl WeatherTone {
    pub(crate) fn from_kind(kind: &str, theme: EffectiveTheme) -> Self {
        let (accent, start, end, border) = match (theme, kind) {
            (EffectiveTheme::Light, "sun") => (
                rgb(138, 98, 0),
                rgb(255, 225, 138),
                rgb(255, 241, 197),
                rgba(138, 98, 0, 0.18),
            ),
            (EffectiveTheme::Light, "cloud-sun") => (
                rgb(51, 93, 105),
                rgb(201, 232, 240),
                rgb(234, 242, 216),
                rgba(51, 93, 105, 0.18),
            ),
            (EffectiveTheme::Light, "rain") | (EffectiveTheme::Light, "drizzle") => (
                rgb(7, 92, 120),
                rgb(139, 211, 230),
                rgb(217, 243, 248),
                rgba(7, 92, 120, 0.18),
            ),
            (EffectiveTheme::Light, "snow") | (EffectiveTheme::Light, "sleet") => (
                rgb(51, 98, 127),
                rgb(199, 229, 255),
                rgb(240, 247, 255),
                rgba(51, 98, 127, 0.18),
            ),
            (EffectiveTheme::Light, "storm") => (
                rgb(55, 49, 95),
                rgb(169, 166, 200),
                rgb(230, 225, 240),
                rgba(55, 49, 95, 0.18),
            ),
            (EffectiveTheme::Light, "fog") => (
                rgb(75, 91, 86),
                rgb(207, 215, 210),
                rgb(238, 240, 234),
                rgba(75, 91, 86, 0.18),
            ),
            (EffectiveTheme::Light, _) => (
                rgb(66, 93, 104),
                rgb(189, 210, 221),
                rgb(230, 238, 244),
                rgba(66, 93, 104, 0.18),
            ),
            (EffectiveTheme::Dark, "sun") => (
                rgb(255, 211, 107),
                rgb(81, 65, 26),
                rgb(47, 40, 21),
                rgba(255, 211, 107, 0.18),
            ),
            (EffectiveTheme::Dark, "cloud-sun") => (
                rgb(183, 216, 216),
                rgb(48, 68, 73),
                rgb(26, 43, 47),
                rgba(183, 216, 216, 0.16),
            ),
            (EffectiveTheme::Dark, "rain") | (EffectiveTheme::Dark, "drizzle") => (
                rgb(143, 220, 240),
                rgb(13, 63, 80),
                rgb(18, 48, 59),
                rgba(143, 220, 240, 0.16),
            ),
            (EffectiveTheme::Dark, "snow") | (EffectiveTheme::Dark, "sleet") => (
                rgb(202, 232, 255),
                rgb(41, 71, 91),
                rgb(24, 44, 58),
                rgba(202, 232, 255, 0.16),
            ),
            (EffectiveTheme::Dark, "storm") => (
                rgb(207, 196, 255),
                rgb(55, 49, 82),
                rgb(33, 29, 53),
                rgba(207, 196, 255, 0.16),
            ),
            (EffectiveTheme::Dark, "fog") => (
                rgb(201, 213, 206),
                rgb(52, 62, 58),
                rgb(30, 39, 36),
                rgba(201, 213, 206, 0.16),
            ),
            (EffectiveTheme::Dark, _) => (
                rgb(194, 211, 220),
                rgb(42, 60, 70),
                rgb(23, 36, 43),
                rgba(194, 211, 220, 0.14),
            ),
        };
        Self {
            accent,
            start,
            end,
            border,
        }
    }
}

pub(crate) fn app_background_style(palette: Palette) -> container::Style {
    container::Style::default()
        .background(
            gradient::Linear::new(2.35)
                .add_stop(0.0, palette.bg)
                .add_stop(0.55, palette.panel_strong.scale_alpha(1.0))
                .add_stop(1.0, palette.bg),
        )
        .color(palette.text)
}

pub(crate) fn panel_style(palette: Palette) -> container::Style {
    container::Style::default()
        .background(palette.panel)
        .color(palette.text)
        .border(Border::default().rounded(8).width(1).color(palette.line))
        .shadow(Shadow {
            color: rgba(0, 0, 0, 0.22),
            offset: Vector::new(0.0, 14.0),
            blur_radius: 32.0,
        })
}

pub(crate) fn card_shell_style(palette: Palette) -> container::Style {
    container::Style::default()
        .background(
            gradient::Linear::new(std::f32::consts::PI)
                .add_stop(0.0, palette.panel_strong)
                .add_stop(1.0, palette.panel),
        )
        .color(palette.text)
        .border(Border::default().rounded(8).width(1).color(palette.line))
        .shadow(Shadow {
            color: rgba(0, 0, 0, 0.28),
            offset: Vector::new(0.0, 20.0),
            blur_radius: 54.0,
        })
}

pub(crate) fn weather_hero_style(tone: WeatherTone) -> container::Style {
    container::Style::default()
        .background(
            gradient::Linear::new(2.35)
                .add_stop(0.0, tone.start)
                .add_stop(1.0, tone.end),
        )
        .color(tone.accent)
        .border(Border::default().rounded(6).width(1).color(tone.border))
        .shadow(Shadow {
            color: rgba(0, 0, 0, 0.18),
            offset: Vector::new(0.0, 14.0),
            blur_radius: 30.0,
        })
}

pub(crate) fn button_style(palette: Palette, active: bool) -> button::Style {
    let (background, text_color) = if active {
        (palette.text, palette.bg)
    } else {
        (palette.nav_bg, palette.muted)
    };
    button::Style {
        background: Some(background.into()),
        text_color,
        border: Border::default().rounded(999).width(1).color(palette.line),
        shadow: Shadow::default(),
        snap: true,
    }
}

pub(crate) fn rgb(r: u8, g: u8, b: u8) -> Color {
    Color::from_rgb8(r, g, b)
}

pub(crate) fn rgba(r: u8, g: u8, b: u8, a: f32) -> Color {
    Color::from_rgba8(r, g, b, a)
}

pub(crate) fn rgba_from(color: Color, alpha: f32) -> Color {
    Color { a: alpha, ..color }
}

pub(crate) fn parse_hex_color(value: &str) -> Option<Color> {
    let value = value.strip_prefix('#')?;
    if value.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&value[0..2], 16).ok()?;
    let g = u8::from_str_radix(&value[2..4], 16).ok()?;
    let b = u8::from_str_radix(&value[4..6], 16).ok()?;
    Some(rgb(r, g, b))
}
