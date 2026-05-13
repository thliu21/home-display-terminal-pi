import { formatShortTime } from "./utils.js";

export function createClockController({ config, elements }) {
  const { localTime } = elements;

  function updateClockTimes() {
    const now = new Date();
    localTime.textContent = formatShortTime(now);
    const homeTimezone = config.weatherLocations?.[0]?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    [...document.querySelectorAll(".weather-card")].forEach((card) => {
      const timezone = card.dataset.timezone;
      const cardHomeTimezone = card.dataset.homeTimezone || homeTimezone;
      const shouldShowTime = timezone && !isSameTimezone(timezone, cardHomeTimezone);
      const timeLabel = card.querySelector(".weather-time");
      const offsetLabel = card.querySelector(".weather-day-offset");

      card.classList.toggle("weather-card-time-hidden", !shouldShowTime);
      card.querySelector(".weather-time-block").hidden = !shouldShowTime;
      if (!shouldShowTime) return;

      timeLabel.textContent = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone
      }).format(now);
      const dayOffset = getTimezoneDayKey(now, timezone) - getTimezoneDayKey(now, cardHomeTimezone);
      offsetLabel.textContent = dayOffset > 0 ? `+${dayOffset}` : String(dayOffset);
      offsetLabel.hidden = dayOffset === 0;
    });
  }

  return { updateClockTimes };
}

export function isSameTimezone(timezone, homeTimezone) {
  if (timezone === homeTimezone) return true;
  try {
    const now = new Date();
    return getTimezoneDayKey(now, timezone) === getTimezoneDayKey(now, homeTimezone)
      && new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(now)
        === new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: homeTimezone }).format(now);
  } catch {
    return false;
  }
}

export function getTimezoneDayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) / 86400000;
}
