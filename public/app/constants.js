export const settingsStorageKey = "family-display-settings-v1";

export const appViews = ["weather", "caltrain", "calendar", "settings"];

export const rotationViews = ["weather", "caltrain", "calendar"];

export const screenTitles = new Map([
  ["weather", "Weather"],
  ["caltrain", "Caltrain"],
  ["calendar", "Calendar"],
  ["settings", "Settings"]
]);

export const weatherCodes = new Map([
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

export const weatherIconFiles = new Map([
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
