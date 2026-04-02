# 🥏 Norway Disc Golf Explorer

An interactive web application that shows disc golf courses in Norway on a map, with route planning to find courses along your driving route.

![Map Overview](https://img.shields.io/badge/Curated_Courses-96-green) ![OSM](https://img.shields.io/badge/OSM_Courses-800+-blue) ![License](https://img.shields.io/badge/license-MIT-blue)

🌐 **Live site:** [https://himmelfisk.github.io/courses/](https://himmelfisk.github.io/courses/)

## Features

- **Interactive Map** — Browse hundreds of disc golf courses across Norway on an OpenStreetMap-powered map
- **Live Course Data** — Automatically fetches additional courses from OpenStreetMap to supplement the curated dataset
- **Course Details** — View ratings, number of holes, difficulty, and descriptions for curated courses
- **Search & Filter** — Find courses by name, city, region, minimum rating, difficulty, or hole count
- **Route Planner** — Plan a driving route between any two Norwegian cities
- **Courses Along Route** — Discover disc golf courses near your planned driving route
- **Detour Suggestions** — Get suggestions for highly-rated courses worth a small detour
- **Responsive Design** — Works on desktop and mobile devices

## How to Use

### Quick Start

Simply open `index.html` in a web browser. No build step or server required!

```bash
# Clone the repository
git clone https://github.com/himmelfisk/courses.git
cd courses

# Open in browser
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or serve it locally:

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Then visit `http://localhost:8000`.

### Exploring Courses

1. Browse the map — courses are color-coded by rating (green = excellent, blue = great, amber = good)
2. Click any marker to see course details
3. Use the sidebar search and filters to narrow down courses
4. Click a course card in the sidebar to zoom to it on the map

### Planning a Route

1. Click the **Route Planner** tab
2. Enter your start location (e.g., "Ålesund") and destination (e.g., "Oslo")
3. Adjust the maximum distance from route and detour settings
4. Click **Plan Route**
5. The map shows your driving route with nearby courses highlighted
6. Courses along the route appear in the sidebar, plus detour suggestions for great courses slightly further away

## Data Sources

The app combines two types of course data:

### Curated Courses (96 courses)
Hand-curated courses with detailed info (ratings, descriptions, difficulty, hole count) from:
- [UDisc](https://udisc.com/places/norway) — The world's largest disc golf platform
- [PDGA Course Directory](https://www.pdga.com/course-directory) — Professional Disc Golf Association
- [Disc Golf Scene](https://www.discgolfscene.com/courses/Norway) — Community course database

### OpenStreetMap Courses (800+ courses)
The app automatically fetches additional courses from [OpenStreetMap](https://www.openstreetmap.org/) via the [Overpass API](https://overpass-api.de/) at runtime. These courses are tagged with `leisure=disc_golf_course` by the OSM community. OSM-sourced courses show a purple "OSM" badge and may have less detail (no ratings or descriptions).

Norway has approximately **850 disc golf courses** — the curated dataset covers the most popular ones, while OSM data fills in the rest.

> **Note:** UDisc does not offer a public API. The PDGA API developer program is currently closed. Curated course data is manually maintained and may not reflect the latest changes. Contributions welcome!

## Technology

- **[Leaflet.js](https://leafletjs.com/)** — Open-source interactive maps
- **[OpenStreetMap](https://www.openstreetmap.org/)** — Free map tiles
- **[OSRM](https://project-osrm.org/)** — Open Source Routing Machine for driving directions
- **[Nominatim](https://nominatim.org/)** — OpenStreetMap geocoding service
- **Vanilla HTML/CSS/JS** — No frameworks, no build tools, just open and go

## Project Structure

```
├── index.html              # Main HTML page
├── css/
│   └── style.css           # All styles
├── js/
│   ├── courses.js          # Curated course dataset (96 courses)
│   ├── osm-fetch.js        # OpenStreetMap Overpass API fetcher
│   ├── i18n.js             # Internationalization (Norwegian/English)
│   ├── routing.js          # Routing & geocoding utilities
│   └── app.js              # Main application logic
├── scripts/
│   └── fetch-osm-courses.py  # Script to fetch OSM courses (for maintainers)
└── README.md
```

## Contributing

Want to add or update course data? Edit `js/courses.js` and submit a pull request. Each course entry includes:

```javascript
{
  name: "Course Name",
  lat: 60.0000,           // GPS latitude
  lng: 10.0000,           // GPS longitude
  city: "City",
  region: "Region",
  holes: 18,
  rating: 4.0,            // Out of 5
  reviews: 100,
  difficulty: "Moderate",  // Easy, Moderate, Hard, Very Hard
  description: "Short description of the course.",
  udisc: "https://udisc.com/courses/..." // Optional
}
```

## License

MIT