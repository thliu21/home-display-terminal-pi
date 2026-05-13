import { createCalendarController } from "./app/calendar.js";
import { createCaltrainController } from "./app/caltrain.js";
import { createClockController } from "./app/clock.js";
import { createNavigationController, getInitialView } from "./app/navigation.js";
import { createSettingsController } from "./app/settings.js";
import { createToastController } from "./app/toast.js";
import { createWeatherController } from "./app/weather.js";

const config = window.FAMILY_DISPLAY_CONFIG || {};

const elements = {
  appToast: document.querySelector("#app-toast"),
  autoRotateEnabled: document.querySelector("#auto-rotate-enabled"),
  autoRotateSeconds: document.querySelector("#auto-rotate-seconds"),
  calendarLayout: document.querySelector("#calendar-layout"),
  caltrainLayout: document.querySelector("#caltrain-layout"),
  deviceIpLabel: document.querySelector("#device-ip"),
  localTime: document.querySelector("#local-time"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  resetSettingsButton: document.querySelector("#reset-settings"),
  screenTitle: document.querySelector("#screen-title"),
  screens: [...document.querySelectorAll(".screen")],
  settingsForm: document.querySelector("#settings-form"),
  statusLabel: document.querySelector("#connection-status"),
  themeButtons: [...document.querySelectorAll("[data-theme-option]")],
  todayLabel: document.querySelector("#today-label"),
  weatherGrid: document.querySelector("#weather-grid")
};

const toast = createToastController(elements);
const settings = createSettingsController({
  config,
  elements,
  showToast: toast.showToast
});
const clock = createClockController({ config, elements });

let navigation = null;
const caltrain = createCaltrainController({
  config,
  elements,
  getActiveView: () => navigation?.getActiveView() || "weather"
});
navigation = createNavigationController({
  elements,
  getRotationSettings: settings.getRotationSettings,
  onCaltrainActive: () => caltrain.updateCaltrainState({ centerRunning: true })
});

const weather = createWeatherController({
  clock,
  config,
  elements,
  settings
});
const calendar = createCalendarController({ config, elements });

function start() {
  document.title = config.title || "Family Display";
  settings.applyThemeFromMode(settings.getThemeSetting());
  settings.updateDeviceIp();
  elements.todayLabel.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());

  settings.loadSettingsForm();
  clock.updateClockTimes();
  weather.loadWeather();
  caltrain.loadCaltrain();
  calendar.loadCalendar();
  navigation.showView(getInitialView(config), { force: true });

  setInterval(clock.updateClockTimes, 1000);
  weather.startWeatherRefresh();
  caltrain.startStatusRefresh();
  setInterval(() => settings.applyThemeFromMode(settings.getThemeSetting()), 60 * 1000);
  navigation.startRotation();

  bindInteractions();
}

function bindInteractions() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      navigation.showView(button.dataset.target);
      navigation.startRotation();
    });
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "e" || event.key === "ArrowLeft") {
      event.preventDefault();
      navigation.showPreviousView();
    }
    if (key === "f" || event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      navigation.showNextView();
    }
    if (key === "d" || key === "t") {
      event.preventDefault();
      settings.toggleTheme();
    }
    navigation.startRotation();
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    settings.saveRotationSettings();
    navigation.startRotation();
    navigation.showView("weather");
  });

  elements.resetSettingsButton.addEventListener("click", () => {
    settings.resetStoredSettings();
    settings.loadSettingsForm();
    settings.setTheme(config.theme || "auto", false);
    navigation.startRotation();
  });

  elements.themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      settings.setTheme(button.dataset.themeOption);
    });
  });
}

start();
