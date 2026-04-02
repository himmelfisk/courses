# 🥏 Norway Disc Golf Explorer

An interactive web application that shows all disc golf courses in Norway on a map, with route planning to find courses along your driving route.

![Map Overview](https://img.shields.io/badge/Courses-96-green) ![License](https://img.shields.io/badge/license-MIT-blue)

🌐 **Live site:** [https://himmelfisk.github.io/courses/](https://himmelfisk.github.io/courses/)

## Features

- **Interactive Map** — Browse 96 disc golf courses across Norway on an OpenStreetMap-powered map
- **Course Details** — View ratings, number of holes, difficulty, and descriptions for each course
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

Course data is curated from multiple community sources:

- [UDisc](https://udisc.com/places/norway) — The world's largest disc golf platform
- [PDGA Course Directory](https://www.pdga.com/course-directory) — Professional Disc Golf Association
- [Disc Golf Scene](https://www.discgolfscene.com/courses/Norway) — Community course database

> **Note:** UDisc does not offer a public API. Course data is manually curated and may not reflect the latest changes. Ratings are approximate. Contributions welcome!

## Technology

- **[Leaflet.js](https://leafletjs.com/)** — Open-source interactive maps
- **[OpenStreetMap](https://www.openstreetmap.org/)** — Free map tiles
- **[OSRM](https://project-osrm.org/)** — Open Source Routing Machine for driving directions
- **[Nominatim](https://nominatim.org/)** — OpenStreetMap geocoding service
- **Vanilla HTML/CSS/JS** — No frameworks, no build tools, just open and go

## Project Structure

```
├── index.html          # Main HTML page
├── css/
│   └── style.css       # All styles
├── js/
│   ├── courses.js      # Course dataset (96 courses)
│   ├── routing.js      # Routing & geocoding utilities
│   └── app.js          # Main application logic
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