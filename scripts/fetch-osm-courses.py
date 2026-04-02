#!/usr/bin/env python3
"""
Fetch disc golf courses in Norway from OpenStreetMap (Overpass API)
and output a summary of what the live data contains.

Usage:
  python3 scripts/fetch-osm-courses.py

This script queries the Overpass API for all features tagged as
leisure=disc_golf_course in Norway and prints a JSON array of courses.
Useful for comparing against the curated dataset in js/courses.js.

Requirements: Python 3.6+ (no external packages needed)
"""

import json
import sys
import urllib.request
import urllib.parse

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OVERPASS_QUERY = """
[out:json][timeout:60];
area["ISO3166-1"="NO"]->.searchArea;
(
  node["leisure"="disc_golf_course"](area.searchArea);
  way["leisure"="disc_golf_course"](area.searchArea);
  relation["leisure"="disc_golf_course"](area.searchArea);
);
out center tags;
"""


def fetch_osm_courses():
    """Fetch disc golf courses from the Overpass API."""
    data = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "NorwayDiscGolfExplorer/1.0"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def parse_course(element):
    """Parse an OSM element into a course dict."""
    lat = element.get("lat") or (element.get("center", {}).get("lat"))
    lon = element.get("lon") or (element.get("center", {}).get("lon"))
    if not lat or not lon:
        return None

    tags = element.get("tags", {})
    name = tags.get("name") or tags.get("name:no") or tags.get("name:en") or ""
    holes = 0
    try:
        holes = int(tags.get("holes", 0))
    except (ValueError, TypeError):
        pass

    return {
        "name": name or "Unnamed course",
        "lat": round(lat, 4),
        "lng": round(lon, 4),
        "city": tags.get("addr:city", tags.get("addr:municipality", "")),
        "region": "",
        "holes": holes,
        "rating": 0,
        "reviews": 0,
        "difficulty": "",
        "description": "",
        "source": "osm",
        "osmId": f"{element['type']}/{element['id']}",
        "website": tags.get("website", tags.get("contact:website", ""))
    }


def main():
    print("Fetching disc golf courses from OpenStreetMap...", file=sys.stderr)
    result = fetch_osm_courses()
    elements = result.get("elements", [])
    print(f"Found {len(elements)} OSM elements.", file=sys.stderr)

    courses = []
    for el in elements:
        course = parse_course(el)
        if course:
            courses.append(course)

    named = [c for c in courses if c["name"] != "Unnamed course"]
    unnamed = [c for c in courses if c["name"] == "Unnamed course"]

    print(f"Parsed {len(courses)} courses ({len(named)} named, {len(unnamed)} unnamed).", file=sys.stderr)
    print(json.dumps(courses, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
