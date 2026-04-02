/**
 * Internationalization (i18n) module.
 * Norwegian (no) is the default language; English (en) is also supported.
 */
const I18n = (() => {
  let currentLang = "no";

  const translations = {
    no: {
      title: "🥏 Frisbeegolf i Norge",
      subtitle: "Utforsk alle frisbeegolfbaner i Norge",
      tabExplore: "Utforsk",
      tabRoute: "Ruteplanlegger",
      searchPlaceholder: "Søk etter baner...",
      filterRating: "Min vurdering",
      filterDifficulty: "Vanskelighetsgrad",
      filterHoles: "Min hull",
      allRatings: "Alle vurderinger",
      all: "Alle",
      diffEasy: "Lett",
      diffModerate: "Moderat",
      diffHard: "Vanskelig",
      diffVeryHard: "Veldig vanskelig",
      coursesShown: "baner vist",
      from: "Fra",
      to: "Til",
      fromPlaceholder: "f.eks. Ålesund",
      toPlaceholder: "f.eks. Oslo",
      maxDistRoute: "Maks avstand fra rute",
      maxDetour: "Maks omvei for gode baner",
      minRatingDetour: "Min vurdering for omveiforslag",
      planRoute: "Planlegg rute",
      clearRoute: "Fjern rute",
      coursesAlongRoute: "Baner langs ruten",
      suggestedDetours: "Foreslåtte omveier",
      detourHint: "Disse høyt vurderte banene er verdt en liten omvei!",
      noCourses: "Ingen baner funnet som matcher kriteriene.",
      noCoursesRoute: "Ingen baner funnet langs denne ruten.",
      tryIncreaseDistance: "Prøv å øke maks avstand.",
      loading: "Planlegger ruten din...",
      enterBothLocations: "Vennligst skriv inn både start- og sluttsted.",
      reviews: "anmeldelser",
      holes: "hull",
      viewUdisc: "Se på UDisc →",
      visitWebsite: "Besøk nettside →",
      detour: "Omvei",
      fromRoute: "Fra rute",
      distance: "Avstand",
      drivingTime: "Kjøretid",
      coursesAlongRouteCount: "baner langs ruten",
      detourSuggestions: "omveiforslag",
      start: "Start",
      end: "Slutt",
      unknownCity: "Ukjent sted",
      osmSource: "📡 Fra OpenStreetMap",
      difficultyMap: {
        "Easy": "Lett",
        "Moderate": "Moderat",
        "Hard": "Vanskelig",
        "Very Hard": "Veldig vanskelig"
      }
    },
    en: {
      title: "🥏 Norway Disc Golf",
      subtitle: "Explore all disc golf courses in Norway",
      tabExplore: "Explore",
      tabRoute: "Route Planner",
      searchPlaceholder: "Search courses...",
      filterRating: "Min Rating",
      filterDifficulty: "Difficulty",
      filterHoles: "Min Holes",
      allRatings: "All ratings",
      all: "All",
      diffEasy: "Easy",
      diffModerate: "Moderate",
      diffHard: "Hard",
      diffVeryHard: "Very Hard",
      coursesShown: "courses shown",
      from: "From",
      to: "To",
      fromPlaceholder: "e.g. Ålesund",
      toPlaceholder: "e.g. Oslo",
      maxDistRoute: "Max distance from route",
      maxDetour: "Max detour for great courses",
      minRatingDetour: "Min rating for detour suggestion",
      planRoute: "Plan Route",
      clearRoute: "Clear Route",
      coursesAlongRoute: "Courses Along Route",
      suggestedDetours: "Suggested Detours",
      detourHint: "These highly-rated courses are worth a small detour!",
      noCourses: "No courses found matching your criteria.",
      noCoursesRoute: "No courses found near this route.",
      tryIncreaseDistance: "Try increasing the max distance.",
      loading: "Planning your route...",
      enterBothLocations: "Please enter both a start and end location.",
      reviews: "reviews",
      holes: "holes",
      viewUdisc: "View on UDisc →",
      visitWebsite: "Visit website →",
      detour: "Detour",
      fromRoute: "From route",
      distance: "Distance",
      drivingTime: "Driving time",
      coursesAlongRouteCount: "courses along route",
      detourSuggestions: "detour suggestions",
      start: "Start",
      end: "End",
      unknownCity: "Unknown location",
      osmSource: "📡 From OpenStreetMap",
      difficultyMap: {
        "Easy": "Easy",
        "Moderate": "Moderate",
        "Hard": "Hard",
        "Very Hard": "Very Hard"
      }
    }
  };

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
  }

  function difficulty(value) {
    const map = translations[currentLang] && translations[currentLang].difficultyMap;
    return (map && map[value]) || value;
  }

  function getLang() {
    return currentLang;
  }

  function setLang(lang) {
    if (translations[lang]) {
      currentLang = lang;
      document.documentElement.lang = lang;
    }
  }

  return { t, difficulty, getLang, setLang };
})();
