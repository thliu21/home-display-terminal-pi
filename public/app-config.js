window.FAMILY_DISPLAY_CONFIG = {
  title: "Home Display",
  autoRotate: {
    enabled: true,
    seconds: 60
  },
  weatherRefreshMinutes: 20,
  caltrainDataUrl: "./data/caltrain-commute.csv",
  defaultView: "weather",
  theme: "auto",
  calendar: {
    dataUrl: "./data/calendar-events.json",
    sources: [
      {
        id: "home",
        label: "Home",
        color: "#8fd6b1"
      },
      {
        id: "work",
        label: "Work",
        color: "#8fbce6"
      }
    ]
  },
  weatherLocations: [
    {
      name: "Sunnyvale",
      displayName: "Home",
      latitude: 37.3688,
      longitude: -122.0363,
      timezone: "America/Los_Angeles"
    },
    {
      name: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      timezone: "America/Los_Angeles"
    },
    {
      name: "New York",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York"
    },
    {
      name: "Honolulu",
      latitude: 21.3099,
      longitude: -157.8581,
      timezone: "Pacific/Honolulu"
    }
  ]
};
