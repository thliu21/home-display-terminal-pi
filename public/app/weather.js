import { weatherCodes, weatherIconFiles } from "./constants.js";
import { isSameTimezone } from "./clock.js";
import { escapeHtml, formatShortTime } from "./utils.js";

export function createWeatherController({ config, elements, settings, clock }) {
  const { statusLabel, weatherGrid } = elements;
  let weatherTimer = null;

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
      settings.updateAutoThemeWindow(cards[0]);
      settings.applyThemeFromMode(settings.getThemeSetting());
      weatherGrid.innerHTML = cards.map(renderWeatherCard).join("");
      clock.updateClockTimes();
      statusLabel.textContent = `Updated ${formatShortTime(new Date())}`;
    } catch (error) {
      console.error(error);
      statusLabel.textContent = "Weather offline";
      if (!weatherGrid.children.length) {
        weatherGrid.innerHTML = `<div class="empty-state">Weather is unavailable. Check network access on the Pi.</div>`;
      }
    }
  }

  function startWeatherRefresh() {
    window.clearInterval(weatherTimer);
    weatherTimer = setInterval(loadWeather, (config.weatherRefreshMinutes || 20) * 60 * 1000);
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

  function renderWeatherCard({ location, data }) {
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
    const homeTimezone = config.weatherLocations?.[0]?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const shouldShowTime = location.timezone && !isSameTimezone(location.timezone, homeTimezone);
    const timeHiddenClass = shouldShowTime ? "" : " weather-card-time-hidden";

    return `
      <article class="weather-card ${weatherTone}${timeHiddenClass}" data-timezone="${escapeHtml(location.timezone)}" data-home-timezone="${escapeHtml(homeTimezone)}">
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
          <div class="weather-time-block"${shouldShowTime ? "" : " hidden"}>
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

  return { loadWeather, startWeatherRefresh };
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
  const height = 86;
  const padLeft = 30;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 26;
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

function getLocationLabel(location) {
  return location.displayName || location.name;
}
