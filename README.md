# Home Display Terminal Pi

A lightweight Raspberry Pi kiosk display for weather, Caltrain commute times, and calendar views.

The app intentionally avoids a Node build step. The Pi serves static files with Python, and the browser fetches live weather from Open-Meteo.

## Features

- 2x2 weather dashboard with local time, weather-specific themes, and 12-hour temperature trend charts
- Caltrain commute page generated from GTFS data
- Calendar page shell for display-account Google Calendar integration
- Six-key keyboard navigation support
- Raspberry Pi kiosk scripts and systemd service

## Configure

Edit `public/app-config.js`:

- `weatherLocations`: display cards for weather locations
- `caltrainDataUrl`: static commute CSV generated from Caltrain GTFS
- `calendar`: display-account calendar source metadata
- `autoRotate.seconds`: screen rotation interval

## Local Run

```bash
cd family-display/public
python3 -m http.server 3000
```

Open `http://localhost:3000`.

From the `family-display` folder, regenerate the Caltrain commute CSV after updating the GTFS folder:

```bash
python3 scripts/build-caltrain-commute.py
```

## Pi Deploy

```bash
./scripts/deploy-restart.sh
```

This stops the Pi service and Chromium kiosk, syncs files, restarts the service, and relaunches Chromium.

## Controls

- `F`, `Space`, or right arrow: next screen
- `E` or left arrow: previous screen
