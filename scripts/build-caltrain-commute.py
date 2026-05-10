#!/usr/bin/env python3
import csv
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_GTFS_DIR = Path("/Users/arthurliu/Desktop/caltrain-ca-us")
OUTPUT_PATH = BASE_DIR / "public" / "data" / "caltrain-commute.csv"

AM_ORIGIN = "70221"  # Sunnyvale Caltrain Northbound
AM_DESTINATION = "70011"  # San Francisco Caltrain Northbound
PM_ORIGIN = "70012"  # San Francisco Caltrain Southbound
PM_DESTINATION = "70222"  # Sunnyvale Caltrain Southbound


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def minutes_from_time(value):
    hour, minute, _second = (int(part) for part in value.split(":"))
    return hour * 60 + minute


def format_duration(minutes):
    hours, remainder = divmod(minutes, 60)
    return f"{hours}h {remainder:02d}m" if hours else f"{remainder}m"


def weekday_service_ids(calendar_rows):
    return {
        row["service_id"]
        for row in calendar_rows
        if all(row[day] == "1" for day in ["monday", "tuesday", "wednesday", "thursday", "friday"])
        and row["saturday"] == "0"
        and row["sunday"] == "0"
    }


def route_label(route):
    label = route["route_short_name"].strip()
    return label.replace(" Weekday", "") if label else route["route_long_name"].strip()


def build_direction(label, origin, destination, start_minute, end_minute, stop_times_by_trip, trips, routes):
    rows = []
    for trip_id, stops in stop_times_by_trip.items():
        if origin not in stops or destination not in stops:
            continue

        origin_stop = stops[origin]
        destination_stop = stops[destination]
        if int(origin_stop["stop_sequence"]) >= int(destination_stop["stop_sequence"]):
            continue

        departure_minute = minutes_from_time(origin_stop["departure_time"])
        if departure_minute < start_minute or departure_minute > end_minute:
            continue

        trip = trips[trip_id]
        route = routes[trip["route_id"]]
        arrival_minute = minutes_from_time(destination_stop["arrival_time"])
        rows.append({
            "panel": label,
            "origin": "Sunnyvale" if origin == AM_ORIGIN else "San Francisco",
            "destination": "San Francisco" if destination == AM_DESTINATION else "Sunnyvale",
            "depart": origin_stop["departure_time"][:5],
            "arrive": destination_stop["arrival_time"][:5],
            "duration": format_duration(arrival_minute - departure_minute),
            "duration_minutes": str(arrival_minute - departure_minute),
            "train": trip["trip_short_name"],
            "service": route_label(route),
            "color": f"#{route['route_color']}",
            "text_color": f"#{route['route_text_color']}",
        })

    return sorted(rows, key=lambda row: row["depart"])


def main():
    gtfs_dir = Path(__import__("os").environ.get("CALTRAIN_GTFS_DIR", DEFAULT_GTFS_DIR))
    calendar_rows = read_csv(gtfs_dir / "calendar.txt")
    routes = {row["route_id"]: row for row in read_csv(gtfs_dir / "routes.txt")}
    active_services = weekday_service_ids(calendar_rows)
    trips = {
        row["trip_id"]: row
        for row in read_csv(gtfs_dir / "trips.txt")
        if row["service_id"] in active_services
    }

    target_stops = {AM_ORIGIN, AM_DESTINATION, PM_ORIGIN, PM_DESTINATION}
    stop_times_by_trip = {}
    for row in read_csv(gtfs_dir / "stop_times.txt"):
        if row["trip_id"] in trips and row["stop_id"] in target_stops:
            stop_times_by_trip.setdefault(row["trip_id"], {})[row["stop_id"]] = row

    output_rows = []
    output_rows.extend(build_direction(
        "Morning northbound",
        AM_ORIGIN,
        AM_DESTINATION,
        5 * 60,
        10 * 60,
        stop_times_by_trip,
        trips,
        routes,
    ))
    output_rows.extend(build_direction(
        "Evening southbound",
        PM_ORIGIN,
        PM_DESTINATION,
        15 * 60,
        22 * 60,
        stop_times_by_trip,
        trips,
        routes,
    ))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=[
            "panel",
            "origin",
            "destination",
            "depart",
            "arrive",
            "duration",
            "duration_minutes",
            "train",
            "service",
            "color",
            "text_color",
        ])
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"Wrote {len(output_rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
