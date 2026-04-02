/**
 * Routing utilities for the disc golf explorer.
 * Uses OSRM (Open Source Routing Machine) free API for route planning,
 * and Nominatim (OpenStreetMap) for geocoding city names.
 */

const Routing = (() => {

  const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
  const OSRM_BASE = "https://router.project-osrm.org";

  /**
   * Geocode a place name to coordinates, biased towards Norway.
   * @param {string} placeName - The place to geocode
   * @returns {Promise<{lat: number, lng: number, displayName: string}>}
   */
  async function geocode(placeName) {
    const params = new URLSearchParams({
      q: placeName,
      format: "json",
      countrycodes: "no",
      limit: "1",
      addressdetails: "1"
    });

    const lang = typeof I18n !== "undefined" ? I18n.getLang() : "en";
    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { "Accept-Language": lang }
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed for "${placeName}"`);
    }

    const results = await response.json();
    if (results.length === 0) {
      throw new Error(`Could not find location: "${placeName}". Try a different spelling or city name.`);
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name
    };
  }

  /**
   * Search for places using Nominatim, returning up to 5 results.
   * Used for autocomplete suggestions.
   * @param {string} query - Search text
   * @returns {Promise<Array<{displayName: string, lat: number, lng: number}>>}
   */
  async function searchPlaces(query) {
    if (!query || query.length < 2) return [];

    const params = new URLSearchParams({
      q: query,
      format: "json",
      countrycodes: "no",
      limit: "5",
      addressdetails: "1"
    });

    const lang = typeof I18n !== "undefined" ? I18n.getLang() : "en";
    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { "Accept-Language": lang }
    });

    if (!response.ok) return [];

    const results = await response.json();
    return results.map(r => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon)
    }));
  }

  /**
   * Get a driving route between two points using OSRM.
   * @param {Object} from - {lat, lng}
   * @param {Object} to - {lat, lng}
   * @returns {Promise<{coordinates: Array, distance: number, duration: number}>}
   */
  async function getRoute(from, to) {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const params = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false"
    });

    const response = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?${params}`);

    if (!response.ok) {
      throw new Error("Route planning failed. Please try again.");
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No driving route found between these locations.");
    }

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]), // [lat, lng]
      distance: route.distance, // meters
      duration: route.duration  // seconds
    };
  }

  /**
   * Calculate the minimum distance from a point to a polyline (route).
   * Uses perpendicular distance to each segment.
   * @param {Object} point - {lat, lng}
   * @param {Array} routeCoords - Array of [lat, lng] pairs
   * @returns {number} Distance in kilometers
   */
  function distanceToRoute(point, routeCoords) {
    let minDist = Infinity;

    // Sample every Nth point for performance (routes can have thousands of points)
    const step = Math.max(1, Math.floor(routeCoords.length / 500));

    for (let i = 0; i < routeCoords.length - 1; i += step) {
      const end = Math.min(i + step, routeCoords.length - 1);
      const dist = distanceToSegment(
        point.lat, point.lng,
        routeCoords[i][0], routeCoords[i][1],
        routeCoords[end][0], routeCoords[end][1]
      );
      if (dist < minDist) minDist = dist;
    }

    // Also check non-sampled points near the best found
    // (do a finer pass near the minimum)
    if (step > 1) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < routeCoords.length - 1; i += step) {
        const end = Math.min(i + step, routeCoords.length - 1);
        const dist = distanceToSegment(
          point.lat, point.lng,
          routeCoords[i][0], routeCoords[i][1],
          routeCoords[end][0], routeCoords[end][1]
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      const start = Math.max(0, bestIdx - step);
      const end2 = Math.min(routeCoords.length - 1, bestIdx + 2 * step);
      for (let i = start; i < end2; i++) {
        const dist = distanceToSegment(
          point.lat, point.lng,
          routeCoords[i][0], routeCoords[i][1],
          routeCoords[i + 1][0], routeCoords[i + 1][1]
        );
        if (dist < minDist) minDist = dist;
      }
    }

    return minDist;
  }

  /**
   * Find the index of the closest route coordinate to a given point.
   * Used to determine projected position along the route.
   * @param {Object} point - {lat, lng}
   * @param {Array} routeCoords - Array of [lat, lng] pairs
   * @returns {number} Index of closest coordinate
   */
  function closestRoutePointIndex(point, routeCoords) {
    let minDist = Infinity;
    let bestIdx = 0;
    // Sample ~500 points for a fast coarse pass over potentially thousands of route coords
    const step = Math.max(1, Math.floor(routeCoords.length / 500));

    // Coarse pass
    for (let i = 0; i < routeCoords.length; i += step) {
      const d = haversine(point.lat, point.lng, routeCoords[i][0], routeCoords[i][1]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }

    // Fine pass around the best coarse index
    const lo = Math.max(0, bestIdx - step);
    const hi = Math.min(routeCoords.length - 1, bestIdx + step);
    for (let i = lo; i <= hi; i++) {
      const d = haversine(point.lat, point.lng, routeCoords[i][0], routeCoords[i][1]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  /**
   * Distance from a point to a line segment (Haversine-based).
   */
  function distanceToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
    const d_ap = haversine(aLat, aLng, pLat, pLng);
    const d_bp = haversine(bLat, bLng, pLat, pLng);
    const d_ab = haversine(aLat, aLng, bLat, bLng);

    if (d_ab === 0) return d_ap;

    // Project point onto segment using dot product approximation
    const t = Math.max(0, Math.min(1, ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) /
      ((bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng))));

    const projLat = aLat + t * (bLat - aLat);
    const projLng = aLng + t * (bLng - aLng);

    return haversine(pLat, pLng, projLat, projLng);
  }

  /**
   * Haversine distance between two points in km.
   */
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg) {
    return deg * Math.PI / 180;
  }

  /**
   * Find courses near a route, sorted by position along route (start → end).
   * @param {Array} courses - All courses
   * @param {Array} routeCoords - Route coordinates [[lat,lng], ...]
   * @param {number} maxDistKm - Maximum distance from route in km
   * @returns {Array} Courses with distance and route position info
   */
  function findCoursesNearRoute(courses, routeCoords, maxDistKm) {
    const results = [];

    for (const course of courses) {
      const dist = distanceToRoute(course, routeCoords);
      if (dist <= maxDistKm) {
        const routePosition = closestRoutePointIndex(course, routeCoords);
        results.push({ ...course, distanceFromRoute: dist, routePosition });
      }
    }

    return results.sort((a, b) => a.routePosition - b.routePosition);
  }

  /**
   * Find detour-worthy courses, sorted by position along route (start → end).
   * @param {Array} courses - All courses
   * @param {Array} routeCoords - Route coordinates
   * @param {number} maxDistKm - Max distance for "on route" (courses already found)
   * @param {number} detourMaxKm - Max detour distance
   * @param {number} minRating - Minimum rating for detour suggestion
   * @returns {Array} Detour-worthy courses sorted by route position
   */
  function findDetourCourses(courses, routeCoords, maxDistKm, detourMaxKm, minRating) {
    const results = [];

    for (const course of courses) {
      if (course.rating < minRating) continue;

      const dist = distanceToRoute(course, routeCoords);
      // Must be outside the "on route" distance but within detour distance
      if (dist > maxDistKm && dist <= detourMaxKm) {
        const routePosition = closestRoutePointIndex(course, routeCoords);
        results.push({ ...course, distanceFromRoute: dist, isDetour: true, routePosition });
      }
    }

    return results.sort((a, b) => a.routePosition - b.routePosition);
  }

  /**
   * Format distance in km.
   */
  function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Format duration in hours/minutes.
   */
  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${minutes}min`;
  }

  return {
    geocode,
    searchPlaces,
    getRoute,
    findCoursesNearRoute,
    findDetourCourses,
    distanceToRoute,
    haversine,
    formatDistance,
    formatDuration
  };
})();
