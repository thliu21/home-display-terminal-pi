const config = window.FAMILY_DISPLAY_CONFIG;

const weatherGrid = document.querySelector("#weather-grid");
const caltrainLayout = document.querySelector("#caltrain-layout");
const calendarLayout = document.querySelector("#calendar-layout");
const screenTitle = document.querySelector("#screen-title");
const todayLabel = document.querySelector("#today-label");
const statusLabel = document.querySelector("#connection-status");
const localTime = document.querySelector("#local-time");
const navButtons = [...document.querySelectorAll(".nav-button")];
const screens = [...document.querySelectorAll(".screen")];
const settingsForm = document.querySelector("#settings-form");
const autoRotateEnabled = document.querySelector("#auto-rotate-enabled");
const autoRotateSeconds = document.querySelector("#auto-rotate-seconds");
const resetSettingsButton = document.querySelector("#reset-settings");
const themeButtons = [...document.querySelectorAll("[data-theme-option]")];
const deviceIpLabel = document.querySelector("#device-ip");
const saveToast = document.querySelector("#save-toast");

const settingsStorageKey = "family-display-settings-v1";
const appViews = ["weather", "caltrain", "calendar", "settings"];
const rotationViews = ["weather", "caltrain", "calendar"];
const screenTitles = new Map([
  ["weather", "Weather"],
  ["caltrain", "Caltrain"],
  ["calendar", "Calendar"],
  ["settings", "Settings"]
]);

let activeView = getInitialView();
let activeThemeMode = getThemeSetting();
let autoThemeWindow = null;
let activeTheme = resolveTheme(activeThemeMode);
let rotateTimer = null;
let weatherTimer = null;
let themeTimer = null;
let toastTimer = null;
let caltrainStateTimer = null;
let viewTransitionTimer = null;

const weatherCodes = new Map([
  [0, ["Clear", "sun"]],
  [1, ["Mostly clear", "sun"]],
  [2, ["Partly cloudy", "cloud-sun"]],
  [3, ["Cloudy", "cloud"]],
  [45, ["Fog", "fog"]],
  [48, ["Rime fog", "fog"]],
  [51, ["Light drizzle", "drizzle"]],
  [53, ["Drizzle", "drizzle"]],
  [55, ["Heavy drizzle", "rain"]],
  [56, ["Freezing drizzle", "sleet"]],
  [57, ["Freezing drizzle", "sleet"]],
  [61, ["Light rain", "rain"]],
  [63, ["Rain", "rain"]],
  [65, ["Heavy rain", "rain"]],
  [66, ["Freezing rain", "sleet"]],
  [67, ["Freezing rain", "sleet"]],
  [71, ["Light snow", "snow"]],
  [73, ["Snow", "snow"]],
  [75, ["Heavy snow", "snow"]],
  [77, ["Snow grains", "snow"]],
  [80, ["Rain showers", "rain"]],
  [81, ["Rain showers", "rain"]],
  [82, ["Heavy showers", "rain"]],
  [85, ["Snow showers", "snow"]],
  [86, ["Snow showers", "snow"]],
  [95, ["Thunderstorm", "storm"]],
  [96, ["Thunderstorm hail", "storm"]],
  [99, ["Thunderstorm hail", "storm"]]
]);

const weatherIconFiles = new Map([
  ["sun", "clear-day.svg"],
  ["cloud-sun", "cloudy-1-day.svg"],
  ["cloud", "cloudy.svg"],
  ["drizzle", "rainy-1.svg"],
  ["rain", "rainy-3.svg"],
  ["snow", "snowy-2.svg"],
  ["sleet", "rain-and-sleet-mix.svg"],
  ["storm", "thunderstorms.svg"],
  ["fog", "fog.svg"]
]);

const iconSvg = {
  sun: `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="15" fill="currentColor"/><g stroke="currentColor" stroke-linecap="round" stroke-width="5"><path d="M40 8v10M40 62v10M8 40h10M62 40h10M17.4 17.4l7 7M55.6 55.6l7 7M62.6 17.4l-7 7M24.4 55.6l-7 7"/></g></svg>`,
  "cloud-sun": `<svg viewBox="0 0 96 80" aria-hidden="true"><circle cx="34" cy="28" r="14" fill="currentColor" opacity=".55"/><g stroke="currentColor" stroke-linecap="round" stroke-width="4" opacity=".55"><path d="M34 6v8M12 28h8M49.6 12.4l-5.7 5.7M18.4 12.4l5.7 5.7"/></g><path d="M32 62h39c9.4 0 17-7.3 17-16.4 0-8.8-7.1-15.9-16-16.4C67.8 20.3 58.9 14 48.5 14 36.1 14 26 24.1 26 36.5v.7A13.2 13.2 0 0 0 32 62Z" fill="currentColor"/></svg>`,
  cloud: `<svg viewBox="0 0 96 80" aria-hidden="true"><path d="M24 62h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 15.4 58.4 8.5 47 8.5 33.3 8.5 22.2 19.6 22.2 33.3v.9A14.6 14.6 0 0 0 24 62Z" fill="currentColor"/></svg>`,
  rain: `<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 54h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 7.4 58.4.5 47 .5 33.3.5 22.2 11.6 22.2 25.3v.9A14.6 14.6 0 0 0 24 54Z" fill="currentColor"/><g stroke="currentColor" stroke-linecap="round" stroke-width="6"><path d="m30 70-6 14M50 70l-6 14M70 70l-6 14"/></g></svg>`,
  drizzle: `<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 54h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 7.4 58.4.5 47 .5 33.3.5 22.2 11.6 22.2 25.3v.9A14.6 14.6 0 0 0 24 54Z" fill="currentColor"/><g stroke="currentColor" stroke-linecap="round" stroke-width="5"><path d="M30 72v10M48 68v10M66 72v10"/></g></svg>`,
  snow: `<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 54h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 7.4 58.4.5 47 .5 33.3.5 22.2 11.6 22.2 25.3v.9A14.6 14.6 0 0 0 24 54Z" fill="currentColor"/><g fill="currentColor"><circle cx="30" cy="77" r="4"/><circle cx="48" cy="83" r="4"/><circle cx="66" cy="77" r="4"/></g></svg>`,
  sleet: `<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 54h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 7.4 58.4.5 47 .5 33.3.5 22.2 11.6 22.2 25.3v.9A14.6 14.6 0 0 0 24 54Z" fill="currentColor"/><g stroke="currentColor" stroke-linecap="round" stroke-width="5"><path d="m32 70-6 12M66 70l-6 12"/></g><circle cx="48" cy="80" r="4" fill="currentColor"/></svg>`,
  storm: `<svg viewBox="0 0 96 96" aria-hidden="true"><path d="M24 54h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 7.4 58.4.5 47 .5 33.3.5 22.2 11.6 22.2 25.3v.9A14.6 14.6 0 0 0 24 54Z" fill="currentColor"/><path d="M47 62 34 88l18-12-3 18 16-28H51l4-4h-8Z" fill="currentColor"/></svg>`,
  fog: `<svg viewBox="0 0 96 86" aria-hidden="true"><path d="M24 48h48c10.5 0 19-8.2 19-18.4 0-10-8.1-18-18.2-18.4C68.1 1.4 58.4-5.5 47-5.5 33.3-5.5 22.2 5.6 22.2 19.3v.9A14.6 14.6 0 0 0 24 48Z" fill="currentColor" opacity=".75"/><g stroke="currentColor" stroke-linecap="round" stroke-width="6"><path d="M14 64h68M24 78h48"/></g></svg>`
};

function start() {
  document.title = config.title || "Family Display";
  applyThemeFromMode(activeThemeMode);
  updateDeviceIp();
  todayLabel.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());

  loadSettingsForm();
  updateClockTimes();
  loadWeather();
  loadCaltrain();
  loadCalendar();
  showView(activeView);

  setInterval(updateClockTimes, 1000);
  weatherTimer = setInterval(loadWeather, (config.weatherRefreshMinutes || 20) * 60 * 1000);
  caltrainStateTimer = setInterval(() => updateCaltrainState({ centerRunning: activeView === "caltrain" }), 30 * 1000);
  themeTimer = setInterval(() => applyThemeFromMode(getThemeSetting()), 60 * 1000);
  startRotation();

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.target);
      startRotation();
    });
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "e" || event.key === "ArrowLeft") {
      event.preventDefault();
      showPreviousView();
    }
    if (key === "f" || event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      showNextView();
    }
    if (key === "t") {
      event.preventDefault();
      toggleTheme();
    }
    startRotation();
  });

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRotationSettings();
    startRotation();
    showView("weather");
  });

  resetSettingsButton.addEventListener("click", () => {
    window.localStorage.removeItem(settingsStorageKey);
    loadSettingsForm();
    setTheme(config.theme || "auto", false);
    startRotation();
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeOption);
    });
  });
}

function showView(view) {
  const nextView = appViews.includes(view) ? view : "weather";
  const previousView = activeView;
  if (nextView === previousView) return;

  activeView = nextView;
  window.clearTimeout(viewTransitionTimer);
  const previousScreen = screens.find((screen) => screen.dataset.screen === previousView);
  const nextScreen = screens.find((screen) => screen.dataset.screen === nextView);

  screens.forEach((screen) => screen.classList.remove("screen-entering", "screen-exiting", "screen-leaving"));
  previousScreen?.classList.add("screen-leaving");
  nextScreen?.classList.add("screen-entering");

  window.requestAnimationFrame(() => {
    previousScreen?.classList.remove("screen-active", "screen-leaving");
    previousScreen?.classList.add("screen-exiting");
    nextScreen?.classList.remove("screen-entering");
    nextScreen?.classList.add("screen-active");
  });
  viewTransitionTimer = window.setTimeout(() => {
    screens.forEach((screen) => screen.classList.remove("screen-exiting"));
  }, 280);
  navButtons.forEach((button) => {
    button.classList.toggle("nav-button-active", button.dataset.target === activeView);
  });
  screenTitle.textContent = screenTitles.get(activeView) || "Weather";
  if (activeView === "caltrain") {
    caltrainLayout.querySelectorAll(".train-table").forEach((table) => {
      delete table.dataset.centeredTrain;
    });
    updateCaltrainState({ centerRunning: true });
  }
}

function showNextView() {
  const visibleViews = activeView === "settings" ? appViews : rotationViews;
  const index = visibleViews.indexOf(activeView);
  showView(visibleViews[(index + 1) % visibleViews.length]);
}

function showPreviousView() {
  const visibleViews = activeView === "settings" ? appViews : rotationViews;
  const index = visibleViews.indexOf(activeView);
  showView(visibleViews[(index - 1 + visibleViews.length) % visibleViews.length]);
}

function startRotation() {
  window.clearInterval(rotateTimer);
  const rotation = getRotationSettings();
  if (!rotation.enabled || !rotation.seconds) return;
  rotateTimer = setInterval(() => {
    if (rotationViews.includes(activeView)) showNextView();
  }, rotation.seconds * 1000);
}

async function loadWeather() {
  const locations = (config.weatherLocations || []).slice(0, 4);
  weatherGrid.dataset.count = String(locations.length);
  if (!locations.length) {
    weatherGrid.innerHTML = `<div class="empty-state">Add weather locations in app-config.js</div>`;
    return;
  }

  statusLabel.textContent = "Updating weather";

  try {
    const cards = await Promise.all(locations.map(fetchWeather));
    updateAutoThemeWindow(cards[0]);
    applyThemeFromMode(getThemeSetting());
    weatherGrid.innerHTML = cards.map(renderWeatherCard).join("");
    updateClockTimes();
    statusLabel.textContent = `Updated ${formatShortTime(new Date())}`;
  } catch (error) {
    console.error(error);
    statusLabel.textContent = "Weather offline";
    if (!weatherGrid.children.length) {
      weatherGrid.innerHTML = `<div class="empty-state">Weather is unavailable. Check network access on the Pi.</div>`;
    }
  }
}

async function fetchWeather(location, index) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    hourly: "temperature_2m",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "inch",
    timezone: location.timezone || "auto",
    forecast_days: "2"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const data = await response.json();
  return { location, data, index };
}

function renderWeatherCard({ location, data, index }) {
  const current = data.current || {};
  const daily = data.daily || {};
  const [condition, icon] = weatherCodes.get(current.weather_code) || ["Weather", "cloud"];
  const max = Math.round(daily.temperature_2m_max?.[0] ?? current.temperature_2m);
  const min = Math.round(daily.temperature_2m_min?.[0] ?? current.temperature_2m);
  const temp = Math.round(current.temperature_2m);
  const feels = Math.round(current.apparent_temperature);
  const humidity = Math.round(current.relative_humidity_2m);
  const wind = Math.round(current.wind_speed_10m);
  const iconFile = weatherIconFiles.get(icon) || "cloudy.svg";
  const weatherTone = `weather-kind-${icon}`;
  const trend = renderWeatherTrend(data);

  return `
    <article class="weather-card ${weatherTone}" data-timezone="${escapeHtml(location.timezone)}">
      <section class="weather-card-hero">
        <div class="weather-visual">
          <img class="weather-icon" alt="" aria-hidden="true" src="./assets/weather-icons/static/${escapeHtml(iconFile)}">
        </div>
        <div class="weather-temp-block">
          <p class="condition">${condition}</p>
          <div class="temperature">${temp}&deg;</div>
        </div>
        ${trend}
        <div class="weather-location-block">
          <h2 class="location-name">${escapeHtml(getLocationLabel(location))}</h2>
        </div>
        <div class="weather-time-block">
          <span class="weather-time">--:--</span>
          <span class="weather-day-offset" hidden></span>
        </div>
      </section>
      <footer class="weather-meta">
        <div class="meta-item">
          <span class="meta-label">Wind</span>
          <span class="meta-value">${wind} km/h</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Humidity</span>
          <span class="meta-value">${humidity}%</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Feels</span>
          <span class="meta-value">${feels}&deg;C</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">High / Low</span>
          <span class="meta-value">${max}&deg; / ${min}&deg;</span>
        </div>
      </footer>
    </article>
  `;
}

function renderWeatherTrend(data) {
  const hourly = data.hourly || {};
  const times = hourly.time || [];
  const temperatures = hourly.temperature_2m || [];
  if (!times.length || !temperatures.length) return `<div class="weather-trend" aria-hidden="true"></div>`;

  const currentHour = data.current?.time?.slice(0, 13);
  const matchingIndex = currentHour ? times.findIndex((time) => time.slice(0, 13) >= currentHour) : 0;
  const startIndex = matchingIndex >= 0 ? matchingIndex : Math.max(0, times.length - 13);
  const samples = times
    .slice(startIndex, startIndex + 13)
    .map((time, index) => ({
      time,
      temp: Number(temperatures[startIndex + index])
    }))
    .filter((sample) => Number.isFinite(sample.temp));

  if (samples.length < 2) return `<div class="weather-trend" aria-hidden="true"></div>`;

  const width = 240;
  const height = 72;
  const padLeft = 30;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 22;
  const minTemp = Math.min(...samples.map((sample) => sample.temp));
  const maxTemp = Math.max(...samples.map((sample) => sample.temp));
  const range = maxTemp - minTemp || 1;
  const points = samples.map((sample, index) => {
    const x = padLeft + (index * (width - padLeft - padRight)) / (samples.length - 1);
    const y = padTop + ((maxTemp - sample.temp) * (height - padTop - padBottom)) / range;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const midIndex = Math.floor((samples.length - 1) / 2);
  const xLabelY = height - 3;
  const maxTempLabel = `${Math.round(maxTemp)}°`;
  const minTempLabel = `${Math.round(minTemp)}°`;
  const timeLabels = [
    { index: 0, anchor: "start" },
    { index: midIndex, anchor: "middle" },
    { index: samples.length - 1, anchor: "end" }
  ].map(({ index, anchor }) => ({
    anchor,
    label: formatTrendHour(samples[index].time),
    x: padLeft + (index * (width - padLeft - padRight)) / (samples.length - 1)
  }));

  return `
    <div class="weather-trend" aria-label="Next 12 hours temperature trend">
      <svg class="weather-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
        <line class="weather-trend-axis" x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}"></line>
        <line class="weather-trend-axis" x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}"></line>
        <text class="weather-trend-label weather-trend-y-label" x="${padLeft - 6}" y="${padTop + 4}" text-anchor="end">${maxTempLabel}</text>
        <text class="weather-trend-label weather-trend-y-label" x="${padLeft - 6}" y="${height - padBottom + 4}" text-anchor="end">${minTempLabel}</text>
        ${timeLabels.map(({ anchor, label, x }) => `<text class="weather-trend-label weather-trend-x-label" x="${x.toFixed(1)}" y="${xLabelY}" text-anchor="${anchor}">${label}</text>`).join("")}
        <polyline class="weather-trend-line" points="${points.join(" ")}"></polyline>
      </svg>
    </div>
  `;
}

function formatTrendHour(time) {
  const hour = Number(time?.slice(11, 13));
  if (!Number.isFinite(hour)) return "";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${hour < 12 ? "a" : "p"}`;
}

function updateClockTimes() {
  const now = new Date();
  localTime.textContent = formatShortTime(now);
  const homeTimezone = config.weatherLocations?.[0]?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const homeDayKey = getTimezoneDayKey(now, homeTimezone);

  [...document.querySelectorAll(".weather-card")].forEach((card) => {
    const timezone = card.dataset.timezone;
    card.querySelector(".weather-time").textContent = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone
    }).format(now);
    const dayOffset = getTimezoneDayKey(now, timezone) - homeDayKey;
    const offsetLabel = card.querySelector(".weather-day-offset");
    offsetLabel.textContent = dayOffset > 0 ? `+${dayOffset}` : String(dayOffset);
    offsetLabel.hidden = dayOffset === 0;
  });
}

function getTimezoneDayKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) / 86400000;
}

async function loadCaltrain() {
  if (!caltrainLayout) return;
  caltrainLayout.innerHTML = `<div class="empty-state">Loading Caltrain schedule</div>`;

  try {
    const response = await fetch(config.caltrainDataUrl || "./data/caltrain-commute.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`Caltrain schedule request failed: ${response.status}`);
    const rows = parseCsv(await response.text());
    renderCaltrain(rows);
  } catch (error) {
    console.error(error);
    caltrainLayout.innerHTML = `<div class="empty-state">Caltrain schedule is unavailable. Check data/caltrain-commute.csv.</div>`;
  }
}

function renderCaltrain(rows) {
  const panels = [
    {
      name: "Morning northbound",
      title: "Sunnyvale to San Francisco",
      subtitle: "Weekday commute, 5:00-10:00 AM"
    },
    {
      name: "Evening southbound",
      title: "San Francisco to Sunnyvale",
      subtitle: "Weekday commute, 3:00-10:00 PM"
    }
  ];

  caltrainLayout.innerHTML = panels.map((panel, panelIndex) => {
    const trains = rows.filter((row) => row.panel === panel.name);
    if (!trains.length) {
      return `
        <section class="caltrain-panel">
          <header class="caltrain-panel-header">
            <div>
              <p>${escapeHtml(panel.subtitle)}</p>
              <h2>${escapeHtml(panel.title)}</h2>
            </div>
          </header>
          <div class="empty-state">No weekday trains found for this window.</div>
        </section>
      `;
    }

    return `
      <section class="caltrain-panel">
        <header class="caltrain-panel-header">
          <div>
            <p>${escapeHtml(panel.subtitle)}</p>
            <h2>${escapeHtml(panel.title)}</h2>
          </div>
          <span>${trains.length} trains</span>
        </header>
        <div class="train-table" data-panel-index="${panelIndex}">
          ${trains.map(renderTrainRow).join("")}
        </div>
      </section>
    `;
  }).join("");
  updateCaltrainState({ centerRunning: activeView === "caltrain" });
}

function renderTrainRow(row) {
  const style = `--train-color: ${escapeHtml(row.color)}; --train-text: ${escapeHtml(row.text_color)};`;
  return `
    <article class="train-row" data-depart="${escapeHtml(row.depart)}" data-arrive="${escapeHtml(row.arrive)}" data-train="${escapeHtml(row.train)}" style="${style}">
      <div class="train-time">
        <strong>${escapeHtml(row.depart)}</strong>
        <span class="train-time-arrow">→</span>
        <span>${escapeHtml(row.arrive)}</span>
      </div>
      <div class="train-route">
        <span class="train-pill">${escapeHtml(row.service)}</span>
        <strong>#${escapeHtml(row.train)}</strong>
      </div>
      <div class="train-duration">${escapeHtml(row.duration)}</div>
    </article>
  `;
}

function updateCaltrainState({ centerRunning = false } = {}) {
  if (!caltrainLayout) return;
  const nowMinutes = getCurrentLocalMinutes();
  const runningRows = [];

  [...caltrainLayout.querySelectorAll(".train-row")].forEach((row) => {
    const departMinutes = parseScheduleMinutes(row.dataset.depart);
    const arriveMinutes = parseScheduleMinutes(row.dataset.arrive);
    const isRunning = nowMinutes >= departMinutes && nowMinutes < arriveMinutes;
    const isDeparted = nowMinutes >= arriveMinutes;

    row.classList.toggle("train-row-running", isRunning);
    row.classList.toggle("train-row-departed", isDeparted);
    row.classList.toggle("train-row-upcoming", !isRunning && !isDeparted);
    row.dataset.status = isRunning ? "running" : isDeparted ? "departed" : "upcoming";
    if (isRunning) runningRows.push(row);
  });

  if (centerRunning) {
    window.requestAnimationFrame(() => centerRunningRows(runningRows));
  }
}

function centerRunningRows(rows) {
  rows.forEach((row) => {
    const table = row.closest(".train-table");
    if (!table) return;
    const currentKey = row.dataset.train || row.dataset.depart;
    if (table.dataset.centeredTrain === currentKey) return;
    table.dataset.centeredTrain = currentKey;
    table.scrollTo({
      top: Math.max(0, row.offsetTop - table.clientHeight / 2 + row.clientHeight / 2),
      behavior: "smooth"
    });
  });
}

function getCurrentLocalMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseScheduleMinutes(value) {
  const [hour = "0", minute = "0"] = String(value).split(":");
  return Number(hour) * 60 + Number(minute);
}

async function loadCalendar() {
  if (!calendarLayout) return;

  try {
    const response = await fetch(config.calendar?.dataUrl || "./data/calendar-events.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Calendar request failed: ${response.status}`);
    renderCalendar(await response.json());
  } catch (error) {
    renderCalendar({ events: [] });
  }
}

function renderCalendar(data) {
  const sources = config.calendar?.sources || [];
  const events = Array.isArray(data.events) ? data.events : [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  calendarLayout.innerHTML = `
    <section class="calendar-panel">
      <header class="calendar-header">
        <div>
          <p>Shared display account</p>
          <h2>Today and upcoming</h2>
        </div>
        <div class="calendar-source-list">
          ${sources.map((source) => `<span style="--source-color: ${escapeHtml(source.color)}">${escapeHtml(source.label)}</span>`).join("")}
        </div>
      </header>
      <div class="calendar-events">
        ${events.length ? events.map((event) => renderCalendarEvent(event, sourceById)).join("") : renderCalendarEmptyState()}
      </div>
    </section>
  `;
}

function renderCalendarEvent(event, sourceById) {
  const source = sourceById.get(event.sourceId) || {};
  const color = source.color || event.color || "#8fbce6";
  return `
    <article class="calendar-event" style="--source-color: ${escapeHtml(color)}">
      <time>${escapeHtml(event.start || "All day")}</time>
      <div>
        <strong>${escapeHtml(event.title || "Untitled event")}</strong>
        <span>${escapeHtml(source.label || event.sourceId || "Calendar")}</span>
      </div>
    </article>
  `;
}

function renderCalendarEmptyState() {
  return `
    <div class="calendar-empty">
      <strong>Calendar source ready</strong>
      <span>Connect a display Google account, then write normalized events to data/calendar-events.json or replace this loader with Calendar API events.list.</span>
    </div>
  `;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] || ""])));
}

function formatShortTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitialView() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (requestedView === "clocks") return "weather";
  if (appViews.includes(requestedView)) return requestedView;
  return appViews.includes(config.defaultView) ? config.defaultView : "weather";
}

function getLocationLabel(location) {
  return location.displayName || location.name;
}

function getRotationSettings() {
  const defaults = {
    enabled: config.autoRotate?.enabled ?? Boolean(config.autoRotateSeconds),
    seconds: config.autoRotate?.seconds ?? config.autoRotateSeconds ?? 60
  };
  const settings = getStoredSettings();
  return {
    enabled: settings.enabled ?? defaults.enabled,
    seconds: settings.seconds ?? defaults.seconds
  };
}

function getStoredSettings() {
  try {
    return JSON.parse(window.localStorage.getItem(settingsStorageKey) || "{}");
  } catch {
    return {};
  }
}

function loadSettingsForm() {
  const rotation = getRotationSettings();
  autoRotateEnabled.checked = Boolean(rotation.enabled);
  autoRotateSeconds.value = String(rotation.seconds || 60);
  applyThemeFromMode(getThemeSetting());
}

function saveRotationSettings() {
  const seconds = Math.max(10, Math.min(600, Number(autoRotateSeconds.value) || 60));
  saveStoredSettings({
    enabled: autoRotateEnabled.checked,
    seconds
  });
  autoRotateSeconds.value = String(seconds);
  showToast("Settings saved");
}

function saveStoredSettings(patch) {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify({
    ...getStoredSettings(),
    ...patch
  }));
}

function getThemeSetting() {
  const theme = getStoredSettings().theme || config.theme || "auto";
  return ["light", "dark", "auto"].includes(theme) ? theme : "auto";
}

function resolveTheme(themeMode) {
  if (themeMode === "light" || themeMode === "dark") return themeMode;
  return isWithinAutoLightWindow(new Date()) ? "light" : "dark";
}

function applyThemeFromMode(themeMode) {
  activeThemeMode = ["light", "dark", "auto"].includes(themeMode) ? themeMode : "auto";
  activeTheme = resolveTheme(activeThemeMode);
  document.documentElement.dataset.theme = activeTheme;
  themeButtons.forEach((button) => {
    button.classList.toggle("segment-button-active", button.dataset.themeOption === activeThemeMode);
  });
}

function setTheme(theme, persist = true) {
  activeThemeMode = ["light", "dark", "auto"].includes(theme) ? theme : "auto";
  applyThemeFromMode(activeThemeMode);
  if (persist) saveStoredSettings({ theme: activeThemeMode });
}

function toggleTheme() {
  const nextTheme = activeThemeMode === "light" ? "dark" : activeThemeMode === "dark" ? "auto" : "light";
  setTheme(nextTheme);
}

function updateAutoThemeWindow(weatherCard) {
  const daily = weatherCard?.data?.daily || {};
  const sunrise = daily.sunrise?.[0];
  const sunset = daily.sunset?.[0];
  const sunriseAt = sunrise ? new Date(sunrise) : null;
  const sunsetAt = sunset ? new Date(sunset) : null;

  if (sunriseAt && sunsetAt && !Number.isNaN(sunriseAt.getTime()) && !Number.isNaN(sunsetAt.getTime())) {
    autoThemeWindow = { sunriseAt, sunsetAt };
  }
}

function isWithinAutoLightWindow(date) {
  if (autoThemeWindow) {
    return date >= autoThemeWindow.sunriseAt && date < autoThemeWindow.sunsetAt;
  }

  const hour = date.getHours();
  return hour >= 7 && hour < 19;
}

function updateDeviceIp() {
  if (!deviceIpLabel) return;
  const deviceInfo = window.FAMILY_DISPLAY_DEVICE || {};
  const hostname = window.location.hostname;
  const browserHost = hostname && !["localhost", "127.0.0.1", "::1"].includes(hostname) ? hostname : "";
  const ipAddress = deviceInfo.ipAddress || browserHost;
  deviceIpLabel.textContent = ipAddress ? `IP ${ipAddress}` : "IP unavailable";
}

function showToast(message) {
  if (!saveToast) return;
  window.clearTimeout(toastTimer);
  saveToast.textContent = message;
  saveToast.hidden = false;
  toastTimer = window.setTimeout(() => {
    saveToast.hidden = true;
  }, 1800);
}

start();
