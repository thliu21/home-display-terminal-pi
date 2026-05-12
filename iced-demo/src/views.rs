use std::collections::HashMap;

use chrono::Local;
use iced::alignment::{Horizontal, Vertical};
use iced::widget::{
    button, canvas, checkbox, column, container, row, scrollable, svg, text, text_input, Column,
    Row, Space,
};
use iced::{
    theme, Alignment, Border, Color, Element, Fill, Length, Point, Rectangle, Renderer, Theme,
};

use crate::config::CalendarSource;
use crate::constants::ICON_DIR;
use crate::data::{CalendarEvent, TrainRow, TrainStatus};
use crate::model::{Screen, ThemeMode};
use crate::style::{
    app_background_style, button_style, card_shell_style, panel_style, parse_hex_color, rgb, rgba,
    rgba_from, weather_hero_style, Palette, WeatherTone,
};
use crate::util::{format_short_time, manifest_path};
use crate::weather::{TrendPoint, WeatherLocation};
use crate::{Dashboard, Message};

pub(crate) fn app_style(state: &Dashboard, _theme: &Theme) -> theme::Style {
    let palette = state.palette();
    theme::Style {
        background_color: palette.bg,
        text_color: palette.text,
    }
}

pub(crate) fn view(state: &Dashboard) -> Element<'_, Message> {
    let palette = state.palette();
    let body = match state.screen {
        Screen::Weather => weather_screen(state, palette),
        Screen::Caltrain => caltrain_screen(state, palette),
        Screen::Calendar => calendar_screen(state, palette),
        Screen::Settings => settings_screen(state, palette),
    };

    let mut shell = column![header(state, palette), body, footer(state, palette)]
        .spacing(22)
        .height(Fill);

    if let Some(ip) = &state.device_ip {
        shell = shell.push(text(format!("IP {ip}")).size(14).color(palette.ip));
    }
    if let Some(toast) = &state.toast {
        shell = shell.push(
            container(text(&toast.message).size(20).color(palette.bg))
                .padding([10, 18])
                .style(move |_| {
                    container::Style::default()
                        .background(palette.text)
                        .border(iced::border::rounded(8))
                }),
        );
    }

    container(shell)
        .width(Fill)
        .height(Fill)
        .padding(36)
        .style(move |_| app_background_style(palette))
        .into()
}

fn header(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    let today = Local::now().format("%A, %B %-d").to_string();
    let status = if let Some(error) = &state.error {
        error.as_str()
    } else {
        state.weather_status.as_str()
    };

    row![
        column![
            text(today).size(18).color(palette.muted),
            text(state.screen.title()).size(62).color(palette.text),
        ]
        .spacing(5),
        Space::new().width(Fill),
        container(
            column![
                text(status).size(15).color(palette.muted),
                text(format_short_time(Local::now()))
                    .size(40)
                    .color(palette.text),
            ]
            .align_x(Alignment::End)
            .spacing(3),
        )
        .padding([12, 16])
        .style(move |_| panel_style(palette)),
    ]
    .align_y(Alignment::Center)
    .into()
}

fn footer(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    let mut nav = Row::new().spacing(10).align_y(Alignment::Center);
    for screen in Screen::ALL {
        nav = nav.push(nav_button(
            screen.title(),
            state.screen == screen,
            palette,
            screen,
        ));
    }

    row![
        Space::new().width(Fill),
        nav,
        Space::new().width(Fill),
        text("E previous   F next   T theme")
            .size(16)
            .color(palette.muted),
    ]
    .spacing(18)
    .align_y(Alignment::Center)
    .height(56)
    .into()
}

fn nav_button(
    label: &'static str,
    active: bool,
    palette: Palette,
    screen: Screen,
) -> Element<'static, Message> {
    button(text(label).size(16))
        .padding([10, 18])
        .style(move |_, _| button_style(palette, active))
        .on_press(Message::ShowScreen(screen))
        .into()
}

fn weather_screen(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    if state.weather.is_empty() {
        let message = if state.weather_loading {
            "Updating weather"
        } else {
            "Weather is unavailable. Check network access on the Pi."
        };
        return empty_state(message, palette);
    }

    let first_row = Row::new()
        .spacing(18)
        .height(Length::FillPortion(1))
        .push(weather_card(&state.weather[0], palette))
        .push(weather_card(&state.weather[1], palette));
    let second_row = Row::new()
        .spacing(18)
        .height(Length::FillPortion(1))
        .push(weather_card(&state.weather[2], palette))
        .push(weather_card(&state.weather[3], palette));

    column![first_row, second_row]
        .spacing(18)
        .width(Fill)
        .height(Fill)
        .into()
}

fn weather_card(location: &WeatherLocation, palette: Palette) -> Element<'_, Message> {
    let tone = WeatherTone::from_kind(&location.kind, palette.effective);
    let icon_path = manifest_path().join(ICON_DIR).join(&location.icon);
    let day_offset = location
        .day_offset
        .map(|offset| format!("{offset:+}"))
        .unwrap_or_default();

    let hero = container(
        column![
            row![
                svg(svg::Handle::from_path(icon_path))
                    .width(118)
                    .height(118),
                Space::new().width(Fill),
                column![
                    text(&location.condition).size(18).color(tone.accent),
                    text(format!("{}°", location.temperature_c))
                        .size(92)
                        .color(tone.accent),
                ]
                .align_x(Alignment::End)
                .spacing(0),
            ]
            .align_y(Alignment::Start),
            Space::new().height(Fill),
            TrendChart::new(location.trend.clone(), tone.accent).view(),
            Space::new().height(Length::Fixed(4.0)),
            row![
                text(&location.display_name).size(31).color(tone.accent),
                Space::new().width(Fill),
                text(format!("{} {}", location.local_time, day_offset))
                    .size(23)
                    .color(tone.accent),
            ]
            .align_y(Alignment::End),
        ]
        .height(Fill),
    )
    .height(Length::FillPortion(4))
    .width(Fill)
    .padding(22)
    .style(move |_| weather_hero_style(tone));

    let meta = container(
        row![
            meta_item("Wind", format!("{} km/h", location.wind_kmh), palette),
            meta_item(
                "Humidity",
                format!("{}%", location.humidity_percent),
                palette
            ),
            meta_item("Feels", format!("{}°C", location.feels_like_c), palette),
            meta_item(
                "High / Low",
                format!("{}° / {}°", location.high_c, location.low_c),
                palette
            ),
        ]
        .spacing(12)
        .height(Fill),
    )
    .height(Length::Fixed(70.0))
    .padding([10, 16])
    .style(move |_| {
        container::Style::default()
            .background(palette.panel.scale_alpha(0.2))
            .color(palette.text)
    });

    container(column![hero, meta].height(Fill))
        .width(Length::FillPortion(1))
        .height(Fill)
        .padding(6)
        .style(move |_| card_shell_style(palette))
        .into()
}

fn meta_item(label: &'static str, value: String, palette: Palette) -> Element<'static, Message> {
    column![
        text(label).size(13).color(palette.muted),
        text(value).size(16).color(palette.text),
    ]
    .spacing(3)
    .width(Length::FillPortion(1))
    .into()
}

fn caltrain_screen(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    if state.trains.is_empty() {
        return empty_state(
            "Caltrain schedule is unavailable. Check data/caltrain-commute.csv.",
            palette,
        );
    }

    column![
        train_panel(
            "Sunnyvale to San Francisco",
            "Weekday commute, 5:00-10:00 AM",
            state
                .trains
                .iter()
                .filter(|row| row.panel == "Morning northbound"),
            palette,
        ),
        train_panel(
            "San Francisco to Sunnyvale",
            "Weekday commute, 3:00-10:00 PM",
            state
                .trains
                .iter()
                .filter(|row| row.panel == "Evening southbound"),
            palette,
        ),
    ]
    .spacing(18)
    .width(Fill)
    .height(Fill)
    .into()
}

fn train_panel<'a>(
    title: &'static str,
    subtitle: &'static str,
    rows: impl Iterator<Item = &'a TrainRow>,
    palette: Palette,
) -> Element<'a, Message> {
    let mut list = Column::new().spacing(6);
    let mut count = 0;
    for row_data in rows {
        count += 1;
        list = list.push(train_row(row_data, palette));
    }

    container(
        column![
            row![
                column![
                    text(subtitle).size(15).color(palette.muted),
                    text(title).size(36).color(palette.text),
                ]
                .spacing(3),
                Space::new().width(Fill),
                text(format!("{count} trains"))
                    .size(16)
                    .color(palette.muted),
            ]
            .align_y(Alignment::End),
            scrollable(list).height(Fill),
        ]
        .spacing(12),
    )
    .height(Length::FillPortion(1))
    .width(Fill)
    .padding(18)
    .style(move |_| card_shell_style(palette))
    .into()
}

fn train_row(row_data: &TrainRow, palette: Palette) -> Element<'_, Message> {
    let status = row_data.status(Local::now());
    let base_bg = match status {
        TrainStatus::Departed => palette.nav_bg.scale_alpha(0.45),
        TrainStatus::Running => rgba(143, 188, 230, 0.3),
        TrainStatus::Upcoming => palette.nav_bg,
    };
    let text_color = match status {
        TrainStatus::Departed => palette.muted.scale_alpha(0.75),
        _ => palette.text,
    };
    let pill_bg = parse_hex_color(&row_data.color).unwrap_or(rgb(220, 221, 222));
    let pill_fg = parse_hex_color(&row_data.text_color).unwrap_or(rgb(0, 0, 0));

    container(
        row![
            row![
                text(&row_data.depart).size(28).color(text_color),
                text("->").size(20).color(palette.muted),
                text(&row_data.arrive).size(28).color(text_color),
            ]
            .spacing(8)
            .align_y(Alignment::Center)
            .width(Length::FillPortion(5)),
            row![
                container(text(&row_data.service).size(14).color(pill_fg))
                    .padding([6, 10])
                    .width(86)
                    .style(move |_| {
                        container::Style::default()
                            .background(pill_bg)
                            .border(Border::default().rounded(999))
                    }),
                text(format!("#{}", row_data.train))
                    .size(19)
                    .color(text_color),
            ]
            .spacing(10)
            .align_y(Alignment::Center)
            .width(Length::FillPortion(4)),
            text(&row_data.duration)
                .size(17)
                .color(palette.muted)
                .width(Length::FillPortion(2)),
        ]
        .spacing(12)
        .align_y(Alignment::Center),
    )
    .padding([7, 12])
    .height(48)
    .style(move |_| {
        container::Style::default().background(base_bg).border(
            Border::default()
                .rounded(8)
                .width(1)
                .color(if status == TrainStatus::Running {
                    rgba(143, 188, 230, 0.72)
                } else {
                    palette.line
                }),
        )
    })
    .into()
}

fn calendar_screen(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    let source_by_id: HashMap<&str, &CalendarSource> = state
        .config
        .calendar
        .sources
        .iter()
        .map(|source| (source.id.as_str(), source))
        .collect();

    let mut source_chips = Row::new().spacing(8).align_y(Alignment::Center);
    for source in &state.config.calendar.sources {
        let color = parse_hex_color(&source.color).unwrap_or(palette.blue);
        source_chips = source_chips.push(source_chip(&source.label, color, palette));
    }

    let events: Element<'_, Message> = if state.calendar.events.is_empty() {
        calendar_empty(palette)
    } else {
        let mut list = Column::new().spacing(10);
        for event in &state.calendar.events {
            let source = event
                .source_id
                .as_deref()
                .and_then(|id| source_by_id.get(id).copied());
            list = list.push(calendar_event(event, source, palette));
        }
        scrollable(list).height(Fill).into()
    };

    container(
        column![
            row![
                column![
                    text("Shared display account").size(15).color(palette.muted),
                    text("Today and upcoming").size(38).color(palette.text),
                ]
                .spacing(3),
                Space::new().width(Fill),
                source_chips,
            ]
            .align_y(Alignment::End),
            events,
        ]
        .spacing(18),
    )
    .height(Fill)
    .width(Fill)
    .padding(24)
    .style(move |_| card_shell_style(palette))
    .into()
}

fn source_chip<'a>(label: &'a str, color: Color, palette: Palette) -> Element<'a, Message> {
    container(text(label).size(15).color(palette.text))
        .padding([8, 12])
        .style(move |_| {
            container::Style::default()
                .background(palette.nav_bg)
                .border(Border::default().rounded(999).width(1).color(color))
        })
        .into()
}

fn calendar_event<'a>(
    event: &'a CalendarEvent,
    source: Option<&'a CalendarSource>,
    palette: Palette,
) -> Element<'a, Message> {
    let color = event
        .color
        .as_deref()
        .or_else(|| source.map(|source| source.color.as_str()))
        .and_then(parse_hex_color)
        .unwrap_or(palette.blue);
    let source_label = source
        .map(|source| source.label.as_str())
        .or(event.source_id.as_deref())
        .unwrap_or("Calendar");

    container(
        row![
            text(event.start.as_deref().unwrap_or("All day"))
                .size(24)
                .color(palette.muted)
                .width(Length::FillPortion(1)),
            column![
                text(event.title.as_deref().unwrap_or("Untitled event"))
                    .size(32)
                    .color(palette.text),
                text(source_label).size(18).color(palette.muted),
            ]
            .spacing(4)
            .width(Length::FillPortion(4)),
        ]
        .spacing(16)
        .align_y(Alignment::Center),
    )
    .padding([14, 16])
    .style(move |_| {
        container::Style::default()
            .background(palette.nav_bg)
            .border(Border::default().rounded(8).width(1).color(color))
    })
    .into()
}

fn calendar_empty(palette: Palette) -> Element<'static, Message> {
    container(
        column![
            text("Calendar source ready")
                .size(34)
                .color(palette.text),
            text("Connect a display Google account, then write normalized events to data/calendar-events.json or replace this loader with Calendar API events.list.")
                .size(20)
                .color(palette.muted),
        ]
        .spacing(8),
    )
    .height(Fill)
    .center_y(Fill)
    .padding(42)
    .style(move |_| {
        container::Style::default()
            .background(palette.nav_bg)
            .border(Border::default().rounded(8).width(1).color(palette.line))
    })
    .into()
}

fn settings_screen(state: &Dashboard, palette: Palette) -> Element<'_, Message> {
    let theme_buttons = row![
        theme_button(ThemeMode::Light, state.draft_theme, palette),
        theme_button(ThemeMode::Dark, state.draft_theme, palette),
        theme_button(ThemeMode::Auto, state.draft_theme, palette),
    ]
    .spacing(6);

    let actions = row![
        button(text("Save").size(22))
            .padding([14, 22])
            .style(move |_, _| button_style(palette, true))
            .on_press(Message::SaveSettings),
        button(text("Reset").size(22))
            .padding([14, 22])
            .style(move |_, _| button_style(palette, false))
            .on_press(Message::ResetSettings),
    ]
    .spacing(14);

    container(
        column![
            row![
                column![
                    text("Settings").size(62).color(palette.text),
                    text("Display rotation").size(28).color(palette.muted),
                ]
                .spacing(8),
                Space::new().width(Fill),
                checkbox(state.draft_auto_rotate)
                    .label("Auto rotate")
                    .text_size(22)
                    .size(34)
                    .on_toggle(Message::ToggleAutoRotate),
            ]
            .align_y(Alignment::Center),
            column![
                text("Rotation interval").size(28).color(palette.muted),
                text_input("45", &state.draft_seconds)
                    .on_input(Message::RotationSecondsChanged)
                    .size(54)
                    .padding(14)
                    .width(280),
            ]
            .spacing(14),
            column![text("Theme").size(28).color(palette.muted), theme_buttons,].spacing(14),
            actions,
        ]
        .spacing(30),
    )
    .height(Fill)
    .width(Length::FillPortion(1))
    .padding(52)
    .style(move |_| card_shell_style(palette))
    .into()
}

fn theme_button(
    theme: ThemeMode,
    active_theme: ThemeMode,
    palette: Palette,
) -> Element<'static, Message> {
    button(text(theme.label()).size(22))
        .padding([12, 28])
        .style(move |_, _| button_style(palette, theme == active_theme))
        .on_press(Message::SelectTheme(theme))
        .into()
}

fn empty_state(message: &'static str, palette: Palette) -> Element<'static, Message> {
    container(text(message).size(28).color(palette.muted))
        .width(Fill)
        .height(Fill)
        .center_x(Fill)
        .center_y(Fill)
        .style(move |_| card_shell_style(palette))
        .into()
}

#[derive(Debug, Clone)]
struct TrendChart {
    samples: Vec<TrendPoint>,
    color: Color,
}

impl TrendChart {
    fn new(samples: Vec<TrendPoint>, color: Color) -> Self {
        Self { samples, color }
    }

    fn view(self) -> Element<'static, Message> {
        canvas(self).width(Fill).height(76).into()
    }
}

impl<M> canvas::Program<M> for TrendChart {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: iced::mouse::Cursor,
    ) -> Vec<canvas::Geometry> {
        let mut frame = canvas::Frame::new(renderer, bounds.size());
        if self.samples.len() < 2 {
            return vec![frame.into_geometry()];
        }

        let pad_left = 34.0;
        let pad_right = 8.0;
        let pad_top = 8.0;
        let pad_bottom = 24.0;
        let chart_w = (bounds.width - pad_left - pad_right).max(1.0);
        let chart_h = (bounds.height - pad_top - pad_bottom).max(1.0);
        let min_temp = self
            .samples
            .iter()
            .map(|point| point.temperature_c)
            .min()
            .unwrap_or(0);
        let max_temp = self
            .samples
            .iter()
            .map(|point| point.temperature_c)
            .max()
            .unwrap_or(0);
        let range = (max_temp - min_temp).max(1) as f32;

        let axis_color = rgba_from(self.color, 0.35);
        let label_color = rgba_from(self.color, 0.7);
        let x0 = pad_left;
        let y0 = pad_top + chart_h;

        frame.stroke(
            &canvas::Path::line(Point::new(x0, pad_top), Point::new(x0, y0)),
            canvas::Stroke::default()
                .with_color(axis_color)
                .with_width(1.0),
        );
        frame.stroke(
            &canvas::Path::line(Point::new(x0, y0), Point::new(x0 + chart_w, y0)),
            canvas::Stroke::default()
                .with_color(axis_color)
                .with_width(1.0),
        );

        let line = canvas::Path::new(|builder| {
            for (index, point) in self.samples.iter().enumerate() {
                let x = x0 + index as f32 * chart_w / (self.samples.len() - 1) as f32;
                let y = pad_top + (max_temp - point.temperature_c) as f32 * chart_h / range;
                if index == 0 {
                    builder.move_to(Point::new(x, y));
                } else {
                    builder.line_to(Point::new(x, y));
                }
            }
        });
        frame.stroke(
            &line,
            canvas::Stroke::default()
                .with_color(self.color)
                .with_width(4.0)
                .with_line_cap(canvas::LineCap::Round)
                .with_line_join(canvas::LineJoin::Round),
        );

        let first = self.samples.first().unwrap();
        let middle = &self.samples[self.samples.len() / 2];
        let last = self.samples.last().unwrap();

        draw_canvas_text(
            &mut frame,
            format!("{max_temp}°"),
            Point::new(x0 - 6.0, pad_top + 4.0),
            label_color,
            12.0,
            Horizontal::Right,
        );
        draw_canvas_text(
            &mut frame,
            format!("{min_temp}°"),
            Point::new(x0 - 6.0, y0 + 4.0),
            label_color,
            12.0,
            Horizontal::Right,
        );
        draw_canvas_text(
            &mut frame,
            first.time.clone(),
            Point::new(x0, bounds.height - 2.0),
            label_color,
            11.0,
            Horizontal::Left,
        );
        draw_canvas_text(
            &mut frame,
            middle.time.clone(),
            Point::new(x0 + chart_w / 2.0, bounds.height - 2.0),
            label_color,
            11.0,
            Horizontal::Center,
        );
        draw_canvas_text(
            &mut frame,
            last.time.clone(),
            Point::new(x0 + chart_w, bounds.height - 2.0),
            label_color,
            11.0,
            Horizontal::Right,
        );

        vec![frame.into_geometry()]
    }
}

fn draw_canvas_text(
    frame: &mut canvas::Frame,
    content: String,
    position: Point,
    color: Color,
    size: f32,
    align_x: Horizontal,
) {
    frame.fill_text(canvas::Text {
        content,
        position,
        color,
        size: size.into(),
        align_x: align_x.into(),
        align_y: Vertical::Center,
        ..canvas::Text::default()
    });
}
