# 🚀 Adam's Astronaut Tracker

A playful, cartoon-style **mobile web app** that shows where the astronauts
currently living in space are floating right now — a friendly best-estimate,
not exact real-time tracking.

![Astronauts in space](https://img.shields.io/badge/humans%20in%20space-tracked-ffd34d)

## What it does

- 🗺️ A cartoon world map with the space stations (ISS & Tiangong) drifting
  along their orbit ground tracks.
- 👩‍🚀 A roster of every astronaut currently in orbit, grouped by their station.
- 📍 Tap any astronaut to see a card with their mission stats and an estimate
  of where they're flying over *right now*.
- 📱 Mobile-first, installable as a home-screen app (PWA), works offline once
  loaded — it's all static files, no server or API needed.

## How the location estimate works

Positions are a simple orbital cartoon, not a precise ephemeris:

- **Latitude** swings like a sine wave, bounded by each station's orbital
  inclination (51.6° for the ISS, 41.5° for Tiangong).
- **Longitude** sweeps eastward each ~92-minute orbit while the Earth rotates
  beneath, giving the familiar westward-drifting ground track.

It's meant to *feel* right and look fun, not to guide a docking maneuver. 😄

## Running it

It's just static files — open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000 on your phone or desktop
```

## Keeping the crew up to date

When a mission launches or a crew comes home, edit the `CREW` and `STATIONS`
arrays in [`data.js`](./data.js) and bump `ROSTER_UPDATED`. That's the only
file you need to touch to refresh who's up there.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | Cartoon space styling (mobile first) |
| `app.js` | Map drawing, orbit estimate, interactions |
| `data.js` | The astronaut roster & station data (edit this) |
| `manifest.webmanifest` | PWA install metadata |

---

Made for Adam · Keep looking up 🌙
