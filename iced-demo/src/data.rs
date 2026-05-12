use chrono::{DateTime, Local, Timelike};
use serde::Deserialize;

use crate::constants::{CALENDAR_JSON, CALTRAIN_CSV};
use crate::util::{manifest_path, parse_minutes, public_relative_path};

#[derive(Debug, Clone, Default, Deserialize)]
pub(crate) struct CalendarData {
    #[serde(default)]
    pub(crate) events: Vec<CalendarEvent>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CalendarEvent {
    #[serde(default)]
    pub(crate) title: Option<String>,
    #[serde(default)]
    pub(crate) start: Option<String>,
    #[serde(default)]
    pub(crate) source_id: Option<String>,
    #[serde(default)]
    pub(crate) color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TrainRow {
    pub(crate) panel: String,
    pub(crate) depart: String,
    pub(crate) arrive: String,
    pub(crate) duration: String,
    pub(crate) train: String,
    pub(crate) service: String,
    pub(crate) color: String,
    pub(crate) text_color: String,
}

impl TrainRow {
    pub(crate) fn status(&self, now: DateTime<Local>) -> TrainStatus {
        let now_minutes = now.hour() as u16 * 60 + now.minute() as u16;
        let depart = parse_minutes(&self.depart).unwrap_or(0);
        let arrive = parse_minutes(&self.arrive).unwrap_or(depart);

        if now_minutes >= arrive {
            TrainStatus::Departed
        } else if now_minutes >= depart {
            TrainStatus::Running
        } else {
            TrainStatus::Upcoming
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TrainStatus {
    Departed,
    Running,
    Upcoming,
}

pub(crate) fn load_caltrain_rows() -> Result<Vec<TrainRow>, String> {
    let path = manifest_path().join(CALTRAIN_CSV);
    let mut reader =
        csv::Reader::from_path(&path).map_err(|err| format!("{} ({err})", path.display()))?;
    let mut rows = Vec::new();
    for row in reader.deserialize() {
        rows.push(row.map_err(|err| format!("{} ({err})", path.display()))?);
    }
    Ok(rows)
}

pub(crate) fn load_calendar(data_url: &str) -> Result<CalendarData, String> {
    let path = public_relative_path(data_url, CALENDAR_JSON);
    let contents =
        std::fs::read_to_string(&path).map_err(|err| format!("{} ({err})", path.display()))?;
    serde_json::from_str(&contents).map_err(|err| format!("{} ({err})", path.display()))
}
