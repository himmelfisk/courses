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
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Course data from community sources &amp; <a href="https://wiki.openstreetmap.org/wiki/Tag:leisure%3Ddisc_golf_course">OSM</a>',
    maxZoom: 18
  }).addTo(map);

  // ---- State ----
  let allMarkers = [];
  let markerLayer = L.layerGroup().addTo(map);
  let routeLayer = null;
  let routeMarkersLayer = null;
  let currentRoute = null;
  let allCourses = [...COURSES]; // Start with curated courses, extended by OSM data

  // Stored coordinates from autocomplete selections
  let storedFromCoords = null;
  let storedToCoords = null;

  // ---- i18n helper ----
  const t = I18n.t;

  function updateUIText() {
    document.title = t("title");
    document.getElementById("app-title").textContent = t("title");
    document.getElementById("app-subtitle").textContent = t("subtitle");
    document.getElementById("tab-btn-explore").textContent = t("tabExplore");
    document.getElementById("tab-btn-route").textContent = t("tabRoute");
    document.getElementById("search-input").placeholder = t("searchPlaceholder");
    document.getElementById("label-rating").textContent = t("filterRating");
    document.getElementById("label-difficulty").textContent = t("filterDifficulty");
    document.getElementById("label-holes").textContent = t("filterHoles");
    document.getElementById("opt-all-ratings").textContent = t("allRatings");
    document.getElementById("opt-diff-all").textContent = t("all");
    document.getElementById("opt-diff-easy").textContent = t("diffEasy");
    document.getElementById("opt-diff-moderate").textContent = t("diffModerate");
    document.getElementById("opt-diff-hard").textContent = t("diffHard");
    document.getElementById("opt-diff-veryhard").textContent = t("diffVeryHard");
    document.getElementById("opt-holes-all").textContent = t("all");
    document.getElementById("courses-shown-label").textContent = t("coursesShown");
    document.getElementById("label-from").textContent = t("from");
    document.getElementById("label-to").textContent = t("to");
    document.getElementById("route-from").placeholder = t("fromPlaceholder");
    document.getElementById("route-to").placeholder = t("toPlaceholder");
    document.getElementById("label-max-dist").textContent = t("maxDistRoute");
    document.getElementById("label-max-detour").textContent = t("maxDetour");
    document.getElementById("label-min-rating-detour").textContent = t("minRatingDetour");
    document.getElementById("plan-route").textContent = t("planRoute");
    document.getElementById("clear-route").textContent = t("clearRoute");
    document.getElementById("heading-courses-along").textContent = "📍 " + t("coursesAlongRoute");
    document.getElementById("heading-detours").textContent = "🔄 " + t("suggestedDetours");
    document.getElementById("detour-hint-text").textContent = t("detourHint");
    document.getElementById("loading-text").textContent = t("loading");

    // Update the language toggle button label
    const langBtn = document.getElementById("lang-toggle");
    langBtn.textContent = I18n.getLang() === "no" ? "EN" : "NO";
  }

  // ---- Language toggle ----
  document.getElementById("lang-toggle").addEventListener("click", () => {
    const newLang = I18n.getLang() === "no" ? "en" : "no";
    I18n.setLang(newLang);
    updateUIText();
    applyFilters(); // Re-render course list with new language
  });

  // ---- Mobile sidebar toggle ----
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  function isMobile() {
    return window.innerWidth < 769;
  }

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarToggle.classList.add("hidden");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarToggle.classList.remove("hidden");
  }

  sidebarToggle.addEventListener("click", () => {
    openSidebar();
  });

  // Swipe-down to close on mobile
  let touchStartY = 0;
  let touchCurrentY = 0;
  let isSwiping = false;

  sidebar.addEventListener("touchstart", (e) => {
    if (!isMobile()) return;
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    touchCurrentY = touch.clientY;
    isSwiping = true;
  }, { passive: true });

  sidebar.addEventListener("touchmove", (e) => {
    if (!isSwiping || !isMobile()) return;
    touchCurrentY = e.touches[0].clientY;
    const diff = touchCurrentY - touchStartY;
    if (diff > 0) {
      sidebar.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  sidebar.addEventListener("touchend", () => {
    if (!isSwiping || !isMobile()) return;
    isSwiping = false;
    const diff = touchCurrentY - touchStartY;
    sidebar.style.transform = "";
    if (diff > 80) {
      closeSidebar();
    }
  }, { passive: true });

  // On desktop, sidebar is always visible
  function handleResize() {
    if (!isMobile()) {
      sidebar.classList.remove("open");
      sidebarToggle.classList.add("hidden");
    } else if (!sidebar.classList.contains("open")) {
      sidebarToggle.classList.remove("hidden");
    }
  }
  window.addEventListener("resize", handleResize);
  handleResize();

  // ---- Color helpers ----
  function getMarkerColor(rating) {
    if (rating >= 4.5) return "#059669"; // green - excellent
    if (rating >= 4.0) return "#2563eb"; // blue - great
    if (rating >= 3.5) return "#d97706"; // amber - good
    return "#64748b"; // gray - average
  }

  function getDifficultyBadge(difficulty) {
    const cls = difficulty.toLowerCase().replace(" ", "-");
    return `<span class="badge badge-${cls}">${escapeHtml(I18n.difficulty(difficulty))}</span>`;
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
    const isOsm = course.source === "osm";
    let html = `
      <div class="popup-title">${escapeHtml(course.name)}</div>
      <div class="popup-meta">
        📍 ${escapeHtml(course.city || t("unknownCity"))}${course.region ? ", " + escapeHtml(course.region) : ""}<br>
    `;
    if (!isOsm) {
      html += `⭐ ${course.rating}/5 (${course.reviews} ${t("reviews")})<br>`;
    }
    if (course.holes > 0) {
      html += `🕳️ ${course.holes} ${t("holes")}`;
    }
    if (course.difficulty) {
      html += ` &nbsp; ${getDifficultyBadge(course.difficulty)}`;
    }
    html += `</div>`;

    if (course.description) {
      html += `<div class="popup-description">${escapeHtml(course.description)}</div>`;
    }
    if (isOsm) {
      html += `<div class="popup-source">${t("osmSource")}</div>`;
    }
    if (course.udisc) {
      html += `<a class="popup-link" href="${escapeHtml(course.udisc)}" target="_blank" rel="noopener">${t("viewUdisc")}</a>`;
    }
    if (course.website && !course.udisc) {
      html += `<a class="popup-link" href="${escapeHtml(course.website)}" target="_blank" rel="noopener">${t("visitWebsite")}</a>`;
    }
    if (course.distanceFromRoute !== undefined) {
      const label = course.isDetour ? t("detour") : t("fromRoute");
      const cls = course.isDetour ? "distance-detour" : "distance-on-route";
      html += `<br><span class="course-distance ${cls}">${escapeHtml(label)}: ${course.distanceFromRoute.toFixed(1)} km</span>`;
    }
    return html;
  }

  // ---- Course card HTML ----
  function createCourseCard(course, index) {
    const isOsm = course.source === "osm";
    const distLabel = course.isDetour ? ("🔄 " + t("detour")) : ("📍 " + t("fromRoute"));
    const distHtml = course.distanceFromRoute !== undefined
      ? `<span class="course-distance ${course.isDetour ? "distance-detour" : "distance-on-route"}">${distLabel}: ${course.distanceFromRoute.toFixed(1)} km</span>`
      : "";

    const ratingHtml = isOsm ? "" : `<div class="course-rating">⭐ ${course.rating}</div>`;
    const locationText = course.city ? escapeHtml(course.city) : escapeHtml(t("unknownCity"));
    const holesText = course.holes > 0 ? `<span>🕳️ ${course.holes}h</span>` : "";
    const difficultyText = course.difficulty ? `<span>${getDifficultyBadge(course.difficulty)}</span>` : "";
    const descriptionHtml = course.description
      ? `<div class="course-description">${escapeHtml(course.description)}</div>`
      : "";
    const osmBadge = isOsm ? `<span class="badge badge-osm">OSM</span>` : "";

    return `
      <div class="course-card${isOsm ? " course-card-osm" : ""}" data-index="${index}" data-lat="${course.lat}" data-lng="${course.lng}">
        <div class="course-card-header">
          <div class="course-name">${escapeHtml(course.name)} ${osmBadge}</div>
          ${ratingHtml}
        </div>
        <div class="course-meta">
          <span>📍 ${locationText}</span>
          ${holesText}
          ${difficultyText}
        </div>
        ${descriptionHtml}
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
      container.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.85rem; padding: 12px;">${escapeHtml(t("noCourses"))}</p>`;
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

    return allCourses.filter(c => {
      if (search && !c.name.toLowerCase().includes(search) &&
          !c.city.toLowerCase().includes(search) &&
          !(c.region && c.region.toLowerCase().includes(search))) return false;
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

  // ---- Autocomplete for route inputs ----
  let autocompleteTimeout = null;

  function setupAutocomplete(inputId, dropdownId, coordSetter) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    input.addEventListener("input", () => {
      coordSetter(null); // Clear stored coords when user types
      clearTimeout(autocompleteTimeout);
      const query = input.value.trim();
      if (query.length < 2) {
        dropdown.classList.remove("visible");
        dropdown.innerHTML = "";
        return;
      }
      autocompleteTimeout = setTimeout(async () => {
        const results = await Routing.searchPlaces(query);
        if (results.length === 0 || input.value.trim() !== query) {
          dropdown.classList.remove("visible");
          dropdown.innerHTML = "";
          return;
        }
        dropdown.innerHTML = results.map((r, i) =>
          `<div class="autocomplete-item" data-idx="${i}">${escapeHtml(r.displayName)}</div>`
        ).join("");
        dropdown.classList.add("visible");

        dropdown.querySelectorAll(".autocomplete-item").forEach((item, idx) => {
          item.addEventListener("click", () => {
            input.value = results[idx].displayName.split(",")[0];
            coordSetter({ lat: results[idx].lat, lng: results[idx].lng, displayName: results[idx].displayName });
            dropdown.classList.remove("visible");
            dropdown.innerHTML = "";
          });
        });
      }, 300);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("visible");
      }
    });
  }

  setupAutocomplete("route-from", "autocomplete-from", (coords) => { storedFromCoords = coords; });
  setupAutocomplete("route-to", "autocomplete-to", (coords) => { storedToCoords = coords; });

  // ---- Route planning ----
  document.getElementById("plan-route").addEventListener("click", async () => {
    const fromName = document.getElementById("route-from").value.trim();
    const toName = document.getElementById("route-to").value.trim();

    if (!fromName || !toName) {
      showError(t("enterBothLocations"));
      return;
    }

    const maxDist = parseInt(document.getElementById("route-distance").value);
    const detourDist = parseInt(document.getElementById("detour-distance").value);
    const detourMinRating = parseFloat(document.getElementById("detour-min-rating").value);

    showLoading(true);

    try {
      // Use stored coordinates from autocomplete if available, otherwise geocode
      const [fromGeo, toGeo] = await Promise.all([
        storedFromCoords ? Promise.resolve(storedFromCoords) : Routing.geocode(fromName),
        storedToCoords ? Promise.resolve(storedToCoords) : Routing.geocode(toName)
      ]);

      // Get driving route
      const route = await Routing.getRoute(fromGeo, toGeo);
      currentRoute = route;

      // Find courses near route
      const nearRoute = Routing.findCoursesNearRoute(allCourses, route.coordinates, maxDist);
      const detours = Routing.findDetourCourses(allCourses, route.coordinates, maxDist, detourDist, detourMinRating);

      // Render route on map
      renderRoute(route, fromGeo, toGeo, nearRoute, detours);

      // Show results
      showRouteResults(route, fromGeo, toGeo, nearRoute, detours);

      // Close sidebar on mobile so user can see the route on the map
      if (isMobile()) {
        closeSidebar();
      }

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
    storedFromCoords = null;
    storedToCoords = null;
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
      .bindPopup(`<strong>${escapeHtml(t("start"))}:</strong> ${escapeHtml(from.displayName)}`)
      .addTo(routeMarkersLayer);

    L.marker([to.lat, to.lng], { icon: endIcon })
      .bindPopup(`<strong>${escapeHtml(t("end"))}:</strong> ${escapeHtml(to.displayName)}`)
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
        L.polyline(
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
      📏 ${t("distance")}: ${Routing.formatDistance(route.distance)}<br>
      ⏱️ ${t("drivingTime")}: ${Routing.formatDuration(route.duration)}<br>
      🥏 ${nearCourses.length} ${t("coursesAlongRouteCount")}, ${detourCourses.length} ${t("detourSuggestions")}
    `;

    // Near-route courses
    const routeCoursesEl = document.getElementById("route-courses");
    if (nearCourses.length > 0) {
      routeCoursesEl.innerHTML = nearCourses.map((c, i) => createCourseCard(c, i)).join("");
    } else {
      routeCoursesEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(t("noCoursesRoute"))} ${escapeHtml(t("tryIncreaseDistance"))}</p>`;
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
    alert(message);
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ---- Initialize ----
  updateUIText();
  renderMarkers(allCourses);
  renderCourseList(allCourses, "course-list");

  // Fetch additional courses from OpenStreetMap in the background
  (async () => {
    try {
      const osmCourses = await OsmFetch.fetchCourses();
      if (osmCourses.length > 0) {
        allCourses = OsmFetch.mergeCourses(COURSES, osmCourses);
        applyFilters();
        console.log(`Loaded ${osmCourses.length} courses from OpenStreetMap (${allCourses.length - COURSES.length} new).`);
      }
    } catch (err) {
      console.warn("Could not load OSM courses:", err.message);
    }
  })();

})();
