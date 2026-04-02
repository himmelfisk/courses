/**
 * OpenStreetMap course fetcher.
 * Fetches disc golf courses from the Overpass API (OpenStreetMap data)
 * to supplement the curated course dataset.
 *
 * The Overpass API is free, public, and requires no authentication.
 * OSM data is licensed under ODbL (Open Database License).
 */
const OsmFetch = (() => {
  "use strict";

  // Primary and fallback Overpass API endpoints
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
  ];

  /**
   * Overpass QL query to fetch all disc golf courses in Norway.
   * Searches for nodes, ways, and relations tagged as leisure=disc_golf_course.
   * Uses "out center" so ways/relations return a center coordinate.
   */
  const OVERPASS_QUERY = `
    [out:json][timeout:30];
    area["ISO3166-1"="NO"]->.searchArea;
    (
      node["leisure"="disc_golf_course"](area.searchArea);
      way["leisure"="disc_golf_course"](area.searchArea);
      relation["leisure"="disc_golf_course"](area.searchArea);
    );
    out center tags;
  `;

  /**
   * Try fetching from an Overpass endpoint with a timeout.
   */
  async function fetchWithTimeout(url, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(body),
        signal: controller.signal
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetch disc golf courses from the Overpass API.
   * Tries multiple endpoints with fallback.
   * @returns {Promise<Array>} Array of course objects in app format
   */
  async function fetchCourses() {
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const data = await fetchWithTimeout(endpoint, OVERPASS_QUERY, 20000);
        if (data && data.elements) {
          return data.elements
            .map(parseCourse)
            .filter(c => c !== null);
        }
      } catch (err) {
        lastError = err;
        // Try next endpoint
      }
    }

    console.warn("OsmFetch: All Overpass endpoints failed.", lastError);
    return [];
  }

  /**
   * Parse an OSM element into the app's course format.
   * @param {Object} element - An OSM element from the Overpass API
   * @returns {Object|null} A course object, or null if missing coordinates
   */
  function parseCourse(element) {
    const lat = element.lat || (element.center && element.center.lat);
    const lon = element.lon || (element.center && element.center.lon);

    if (!lat || !lon) return null;

    const tags = element.tags || {};
    const name = tags.name || tags["name:no"] || tags["name:en"] || "";
    const holes = parseInt(tags.holes, 10) || 0;

    return {
      name: name || "Unnamed course",
      lat: lat,
      lng: lon,
      city: tags["addr:city"] || tags["addr:municipality"] || "",
      region: "",
      holes: holes,
      rating: 0,
      reviews: 0,
      difficulty: "",
      description: "",
      source: "osm",
      osmId: element.type + "/" + element.id,
      website: tags.website || tags["contact:website"] || ""
    };
  }

  /**
   * Merge OSM courses with curated courses.
   * Curated courses take priority. OSM courses within a threshold
   * distance of a curated course are considered duplicates.
   *
   * @param {Array} curatedCourses - The curated course dataset
   * @param {Array} osmCourses - Courses fetched from OSM
   * @param {number} [thresholdKm=0.3] - Distance threshold for deduplication
   * @returns {Array} Merged course array
   */
  function mergeCourses(curatedCourses, osmCourses, thresholdKm) {
    if (typeof thresholdKm === "undefined") thresholdKm = 0.3;

    // Mark curated courses
    const marked = curatedCourses.map(function (c) {
      if (!c.source) c.source = "curated";
      return c;
    });

    // Filter out OSM courses that are duplicates of curated ones
    const newCourses = osmCourses.filter(function (osm) {
      return !marked.some(function (curated) {
        return haversine(osm.lat, osm.lng, curated.lat, curated.lng) < thresholdKm;
      });
    });

    return marked.concat(newCourses);
  }

  /**
   * Haversine distance between two points in km.
   */
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  return {
    fetchCourses: fetchCourses,
    mergeCourses: mergeCourses
  };
})();
