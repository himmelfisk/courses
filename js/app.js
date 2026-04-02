/**
 * Main application logic for Norway Disc Golf Explorer.
 */

(() => {
  "use strict";

  // ---- Map setup ----
  const map = L.map("map", {
    center: [64.5, 12.0], // Center of Norway
    zoom: 5,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Disc golf data from community sources',
    maxZoom: 18
  }).addTo(map);

  // ---- State ----
  let allMarkers = [];
  let markerLayer = L.layerGroup().addTo(map);
  let routeLayer = null;
  let routeMarkersLayer = null;
  let currentRoute = null;

  // ---- Color helpers ----
  function getMarkerColor(rating) {
    if (rating >= 4.5) return "#059669"; // green - excellent
    if (rating >= 4.0) return "#2563eb"; // blue - great
    if (rating >= 3.5) return "#d97706"; // amber - good
    return "#64748b"; // gray - average
  }

  function getDifficultyBadge(difficulty) {
    const cls = difficulty.toLowerCase().replace(" ", "-");
    return `<span class="badge badge-${cls}">${difficulty}</span>`;
  }

  function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.3;
    let stars = "⭐".repeat(full);
    if (half) stars += "½";
    return stars;
  }

  // ---- Create marker icon ----
  function createIcon(course) {
    const color = getMarkerColor(course.rating);
    return L.divIcon({
      html: `<div class="custom-marker" style="background:${color}"><span>🥏</span></div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -28]
    });
  }

  // ---- Create popup content ----
  function createPopup(course) {
    let html = `
      <div class="popup-title">${escapeHtml(course.name)}</div>
      <div class="popup-meta">
        📍 ${escapeHtml(course.city)}, ${escapeHtml(course.region)}<br>
        ⭐ ${course.rating}/5 (${course.reviews} reviews)<br>
        🕳️ ${course.holes} holes &nbsp; ${getDifficultyBadge(course.difficulty)}
      </div>
      <div class="popup-description">${escapeHtml(course.description)}</div>
    `;
    if (course.udisc) {
      html += `<a class="popup-link" href="${escapeHtml(course.udisc)}" target="_blank" rel="noopener">View on UDisc →</a>`;
    }
    if (course.distanceFromRoute !== undefined) {
      const label = course.isDetour ? "Detour" : "From route";
      const cls = course.isDetour ? "distance-detour" : "distance-on-route";
      html += `<br><span class="course-distance ${cls}">${label}: ${course.distanceFromRoute.toFixed(1)} km</span>`;
    }
    return html;
  }

  // ---- Course card HTML ----
  function createCourseCard(course, index) {
    const distHtml = course.distanceFromRoute !== undefined
      ? `<span class="course-distance ${course.isDetour ? "distance-detour" : "distance-on-route"}">${course.isDetour ? "🔄 Detour" : "📍 Route"}: ${course.distanceFromRoute.toFixed(1)} km</span>`
      : "";

    return `
      <div class="course-card" data-index="${index}" data-lat="${course.lat}" data-lng="${course.lng}">
        <div class="course-card-header">
          <div class="course-name">${escapeHtml(course.name)}</div>
          <div class="course-rating">⭐ ${course.rating}</div>
        </div>
        <div class="course-meta">
          <span>📍 ${escapeHtml(course.city)}</span>
          <span>🕳️ ${course.holes}h</span>
          <span>${getDifficultyBadge(course.difficulty)}</span>
        </div>
        <div class="course-description">${escapeHtml(course.description)}</div>
        ${distHtml}
      </div>
    `;
  }

  // ---- Render all course markers ----
  function renderMarkers(courses) {
    markerLayer.clearLayers();
    allMarkers = [];

    courses.forEach((course, i) => {
      const marker = L.marker([course.lat, course.lng], { icon: createIcon(course) })
        .bindPopup(createPopup(course));
      marker.courseData = course;
      markerLayer.addLayer(marker);
      allMarkers.push(marker);
    });
  }

  // ---- Render course list in sidebar ----
  function renderCourseList(courses, containerId) {
    const container = document.getElementById(containerId);
    if (courses.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; padding: 12px;">No courses found matching your criteria.</p>';
    } else {
      container.innerHTML = courses.map((c, i) => createCourseCard(c, i)).join("");
    }

    // Update count
    const countEl = document.getElementById("course-count");
    if (countEl && containerId === "course-list") {
      countEl.textContent = courses.length;
    }

    // Add click handlers
    container.querySelectorAll(".course-card").forEach(card => {
      card.addEventListener("click", () => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        map.setView([lat, lng], 13);

        // Open the popup
        allMarkers.forEach(m => {
          if (m.courseData && m.courseData.lat === lat && m.courseData.lng === lng) {
            m.openPopup();
          }
        });
      });
    });
  }

  // ---- Filtering ----
  function getFilteredCourses() {
    const search = document.getElementById("search-input").value.toLowerCase();
    const minRating = parseFloat(document.getElementById("filter-rating").value);
    const difficulty = document.getElementById("filter-difficulty").value;
    const minHoles = parseInt(document.getElementById("filter-holes").value);

    return COURSES.filter(c => {
      if (search && !c.name.toLowerCase().includes(search) &&
          !c.city.toLowerCase().includes(search) &&
          !c.region.toLowerCase().includes(search)) return false;
      if (c.rating < minRating) return false;
      if (difficulty && c.difficulty !== difficulty) return false;
      if (c.holes < minHoles) return false;
      return true;
    });
  }

  function applyFilters() {
    const filtered = getFilteredCourses();
    renderMarkers(filtered);
    renderCourseList(filtered, "course-list");
  }

  // ---- Tab switching ----
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // ---- Filter event listeners ----
  document.getElementById("search-input").addEventListener("input", applyFilters);
  document.getElementById("filter-rating").addEventListener("change", applyFilters);
  document.getElementById("filter-difficulty").addEventListener("change", applyFilters);
  document.getElementById("filter-holes").addEventListener("change", applyFilters);

  // ---- Route planning ----
  document.getElementById("plan-route").addEventListener("click", async () => {
    const fromName = document.getElementById("route-from").value.trim();
    const toName = document.getElementById("route-to").value.trim();

    if (!fromName || !toName) {
      showError("Please enter both a start and end location.");
      return;
    }

    const maxDist = parseInt(document.getElementById("route-distance").value);
    const detourDist = parseInt(document.getElementById("detour-distance").value);
    const detourMinRating = parseFloat(document.getElementById("detour-min-rating").value);

    showLoading(true);

    try {
      // Geocode both locations
      const [fromGeo, toGeo] = await Promise.all([
        Routing.geocode(fromName),
        Routing.geocode(toName)
      ]);

      // Get driving route
      const route = await Routing.getRoute(fromGeo, toGeo);
      currentRoute = route;

      // Find courses near route
      const nearRoute = Routing.findCoursesNearRoute(COURSES, route.coordinates, maxDist);
      const detours = Routing.findDetourCourses(COURSES, route.coordinates, maxDist, detourDist, detourMinRating);

      // Render route on map
      renderRoute(route, fromGeo, toGeo, nearRoute, detours);

      // Show results
      showRouteResults(route, fromGeo, toGeo, nearRoute, detours);

    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  });

  // ---- Clear route ----
  document.getElementById("clear-route").addEventListener("click", () => {
    clearRoute();
    document.getElementById("route-results").style.display = "none";
    document.getElementById("clear-route").style.display = "none";
    applyFilters(); // Restore all markers
    map.setView([64.5, 12.0], 5);
  });

  // ---- Render route on map ----
  function renderRoute(route, from, to, nearCourses, detourCourses) {
    clearRoute();

    // Draw route line
    routeLayer = L.polyline(route.coordinates, {
      color: "#2563eb",
      weight: 4,
      opacity: 0.8
    }).addTo(map);

    // Add start/end markers
    routeMarkersLayer = L.layerGroup().addTo(map);

    const startIcon = L.divIcon({
      html: '<div style="background:#059669;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">A</div>',
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const endIcon = L.divIcon({
      html: '<div style="background:#dc2626;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.3);">B</div>',
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([from.lat, from.lng], { icon: startIcon })
      .bindPopup(`<strong>Start:</strong> ${escapeHtml(from.displayName)}`)
      .addTo(routeMarkersLayer);

    L.marker([to.lat, to.lng], { icon: endIcon })
      .bindPopup(`<strong>End:</strong> ${escapeHtml(to.displayName)}`)
      .addTo(routeMarkersLayer);

    // Show course markers (on-route + detours)
    markerLayer.clearLayers();
    allMarkers = [];

    const allCourses = [...nearCourses, ...detourCourses];
    allCourses.forEach(course => {
      const marker = L.marker([course.lat, course.lng], { icon: createIcon(course) })
        .bindPopup(createPopup(course));
      marker.courseData = course;
      markerLayer.addLayer(marker);
      allMarkers.push(marker);

      // Draw detour line for detour courses
      if (course.isDetour) {
        const detourLine = L.polyline(
          [[course.lat, course.lng], findClosestRoutePoint(course, route.coordinates)],
          { color: "#d97706", weight: 2, opacity: 0.5, dashArray: "6 4" }
        ).addTo(routeMarkersLayer);
      }
    });

    // Fit map to show entire route with padding
    const bounds = routeLayer.getBounds();
    allCourses.forEach(c => bounds.extend([c.lat, c.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  function findClosestRoutePoint(course, routeCoords) {
    let minDist = Infinity;
    let closest = routeCoords[0];
    const step = Math.max(1, Math.floor(routeCoords.length / 200));

    for (let i = 0; i < routeCoords.length; i += step) {
      const d = Routing.haversine(course.lat, course.lng, routeCoords[i][0], routeCoords[i][1]);
      if (d < minDist) {
        minDist = d;
        closest = routeCoords[i];
      }
    }
    return closest;
  }

  function clearRoute() {
    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }
    if (routeMarkersLayer) {
      map.removeLayer(routeMarkersLayer);
      routeMarkersLayer = null;
    }
    currentRoute = null;
  }

  // ---- Show route results in sidebar ----
  function showRouteResults(route, from, to, nearCourses, detourCourses) {
    document.getElementById("route-results").style.display = "block";
    document.getElementById("clear-route").style.display = "block";

    // Route info
    document.getElementById("route-info").innerHTML = `
      <strong>🚗 ${escapeHtml(from.displayName.split(",")[0])} → ${escapeHtml(to.displayName.split(",")[0])}</strong><br>
      📏 Distance: ${Routing.formatDistance(route.distance)}<br>
      ⏱️ Driving time: ${Routing.formatDuration(route.duration)}<br>
      🥏 ${nearCourses.length} courses along route, ${detourCourses.length} detour suggestions
    `;

    // Near-route courses
    const routeCoursesEl = document.getElementById("route-courses");
    if (nearCourses.length > 0) {
      routeCoursesEl.innerHTML = nearCourses.map((c, i) => createCourseCard(c, i)).join("");
    } else {
      routeCoursesEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No courses found near this route. Try increasing the max distance.</p>';
    }

    // Detour courses
    const detourSection = document.getElementById("detour-section");
    const detourCoursesEl = document.getElementById("detour-courses");
    if (detourCourses.length > 0) {
      detourSection.style.display = "block";
      detourCoursesEl.innerHTML = detourCourses.map((c, i) => createCourseCard(c, i)).join("");
    } else {
      detourSection.style.display = "none";
    }

    // Add click handlers to course cards in route results
    [routeCoursesEl, detourCoursesEl].forEach(container => {
      container.querySelectorAll(".course-card").forEach(card => {
        card.addEventListener("click", () => {
          const lat = parseFloat(card.dataset.lat);
          const lng = parseFloat(card.dataset.lng);
          map.setView([lat, lng], 13);
          allMarkers.forEach(m => {
            if (m.courseData && m.courseData.lat === lat && m.courseData.lng === lng) {
              m.openPopup();
            }
          });
        });
      });
    });
  }

  // ---- Utility functions ----
  function showLoading(show) {
    document.getElementById("loading").style.display = show ? "flex" : "none";
  }

  function showError(message) {
    // Simple alert for now
    alert(message);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ---- Initialize ----
  renderMarkers(COURSES);
  renderCourseList(COURSES, "course-list");

})();
