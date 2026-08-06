/*
 * Adam's Astronaut Tracker — crew data
 *
 * This is a friendly "best estimate" roster of who is currently living
 * and working in space, grouped by the spacecraft / station they call home.
 * It doesn't need to be exact or live — it's a cartoon snapshot. Update the
 * CREW arrays whenever a new mission launches or a crew comes home.
 */

/*
 * App version + build date, shown in the footer so you can confirm the page
 * you're looking at is the latest one that was deployed.
 *
 * IMPORTANT: keep APP_VERSION in sync with the "?v=" cache-busting token on
 * the <link>/<script> tags in index.html — bump BOTH together on every deploy.
 * When they match, the version on screen is exactly the version that loaded.
 */
window.APP_VERSION = "1.4.2";
window.APP_BUILD = "2026-08-06";

// The last time a human updated this roster by hand. Shown in the app.
window.ROSTER_UPDATED = "2026-08-01";

/*
 * Space stations / craft currently hosting people.
 *  - inclination: how far north/south the orbit reaches (degrees)
 *  - periodMin:   how long one lap around Earth takes (minutes)
 *  - phase:       a starting offset so the two stations don't overlap
 *  - color:       cartoon marker colour
 *  - emoji:       little icon for the station
 */
window.STATIONS = {
  iss: {
    id: "iss",
    name: "International Space Station",
    short: "ISS",
    emoji: "🛰️",
    color: "#ffd34d",
    inclination: 51.6,
    periodMin: 92.9,
    phase: 0,
    altitudeKm: 420,
    blurb: "Humanity's home in low Earth orbit since 2000, zipping around the planet about 16 times a day.",
  },
  tiangong: {
    id: "tiangong",
    name: "Tiangong Space Station",
    short: "Tiangong",
    emoji: "🏮",
    color: "#ff7ad4",
    inclination: 41.5,
    periodMin: 92.2,
    phase: 2.1,
    altitudeKm: 389,
    blurb: "China's space station, whose name means 'Heavenly Palace', orbiting a little lower than the ISS.",
  },
};

/*
 * The crew. Each astronaut lives on one station.
 * flag = country emoji, avatar = a fun face for the cartoon roster.
 */
window.CREW = [
  // --- International Space Station ---
  { name: "Zena Cardman", role: "Commander", agency: "NASA", flag: "🇺🇸", station: "iss", avatar: "👩‍🚀", days: 118 },
  { name: "Nichole Ayers", role: "Flight Engineer", agency: "NASA", flag: "🇺🇸", station: "iss", avatar: "👩‍🚀", days: 118 },
  { name: "Takuya Onishi", role: "Flight Engineer", agency: "JAXA", flag: "🇯🇵", station: "iss", avatar: "👨‍🚀", days: 210 },
  { name: "Anne McClain", role: "Flight Engineer", agency: "NASA", flag: "🇺🇸", station: "iss", avatar: "👩‍🚀", days: 152 },
  { name: "Oleg Platonov", role: "Flight Engineer", agency: "Roscosmos", flag: "🇷🇺", station: "iss", avatar: "👨‍🚀", days: 118 },
  { name: "Kirill Peskov", role: "Flight Engineer", agency: "Roscosmos", flag: "🇷🇺", station: "iss", avatar: "👨‍🚀", days: 152 },
  { name: "Sergey Ryzhikov", role: "Flight Engineer", agency: "Roscosmos", flag: "🇷🇺", station: "iss", avatar: "👨‍🚀", days: 210 },

  // --- Tiangong Space Station ---
  { name: "Chen Dong", role: "Commander", agency: "CMSA", flag: "🇨🇳", station: "tiangong", avatar: "👨‍🚀", days: 64 },
  { name: "Chen Zhongrui", role: "Operator", agency: "CMSA", flag: "🇨🇳", station: "tiangong", avatar: "👨‍🚀", days: 64 },
  { name: "Wang Jie", role: "Engineer", agency: "CMSA", flag: "🇨🇳", station: "tiangong", avatar: "👨‍🚀", days: 64 },
];
