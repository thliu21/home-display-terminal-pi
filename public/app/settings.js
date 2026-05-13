import { settingsStorageKey } from "./constants.js";
import { capitalize } from "./utils.js";

export function createSettingsController({ config, elements, showToast }) {
  const { autoRotateEnabled, autoRotateSeconds, deviceIpLabel, themeButtons } = elements;
  let autoThemeWindow = null;
  let activeThemeMode = getThemeSetting();
  let activeTheme = resolveTheme(activeThemeMode);

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

  function resetStoredSettings() {
    window.localStorage.removeItem(settingsStorageKey);
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
    showToast(`Switched: ${capitalize(nextTheme)}`);
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

  return {
    applyThemeFromMode,
    getRotationSettings,
    getThemeSetting,
    loadSettingsForm,
    resetStoredSettings,
    saveRotationSettings,
    setTheme,
    toggleTheme,
    updateAutoThemeWindow,
    updateDeviceIp
  };
}
