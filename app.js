/*
 * Adam's Astronaut Tracker — app logic
 *
 * Draws a cartoon equirectangular world map (360 x 180 units, where
 * x = longitude + 180 and y = 90 - latitude), estimates where each space
 * station is floating right now with a simple orbit model, and lets you tap
 * an astronaut to see where their home in the sky is passing over.
 *
 * None of this is precise tracking — it's a playful best-guess cartoon.
 */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const EARTH_ROTATION_MIN = 1436; // sidereal day-ish, minutes for 360° spin

  /* --- Coordinate helpers (lon/lat -> map units) --- */
  function lonToX(lon) { return lon + 180; }
  function latToY(lat) { return 90 - lat; }

  /*
   * Cartoon continents. Rough hand-drawn blobs in [lon, lat] pairs — not
   * geographically precise, just recognisable-ish shapes for a kid's map.
   */
  const CONTINENTS = [
    // North America
    [[-158,60],[-130,68],[-95,70],[-78,62],[-60,50],[-70,42],[-82,30],[-98,18],[-108,23],[-118,33],[-125,40],[-130,50],[-150,58]],
    // South America
    [[-80,10],[-62,8],[-50,0],[-38,-10],[-42,-24],[-58,-38],[-72,-52],[-75,-38],[-70,-20],[-78,-4]],
    // Africa
    [[-16,14],[-2,20],[12,30],[32,32],[44,12],[52,10],[48,-6],[38,-22],[26,-34],[18,-34],[10,-16],[-6,4]],
    // Europe
    [[-10,44],[0,52],[12,54],[28,58],[40,60],[30,46],[16,44],[2,40],[-8,38]],
    // Asia
    [[40,60],[70,70],[110,72],[150,68],[178,64],[160,52],[140,44],[122,32],[108,20],[92,22],[76,32],[54,40],[44,48]],
    // India nub
    [[68,28],[88,26],[84,10],[76,8],[70,18]],
    // Southeast Asia / Indonesia
    [[96,8],[118,6],[132,0],[122,-8],[104,-2],[98,2]],
    // Australia
    [[114,-18],[134,-14],[150,-20],[152,-34],[138,-38],[120,-34],[114,-24]],
    // Greenland
    [[-46,72],[-24,74],[-20,66],[-38,60],[-52,66]],
    // Antarctica strip
    [[-180,-78],[-120,-74],[-60,-76],[0,-74],[60,-76],[120,-74],[180,-78],[180,-90],[-180,-90]],
  ];

  /* Named regions for a friendly "flying over ___" label. Checked in order. */
  const REGIONS = [
    { name: "North America", lon: [-168, -52], lat: [15, 72] },
    { name: "South America", lon: [-82, -34], lat: [-56, 12] },
    { name: "Europe", lon: [-12, 40], lat: [36, 62] },
    { name: "Africa", lon: [-18, 52], lat: [-36, 34] },
    { name: "the Middle East", lon: [34, 60], lat: [12, 40] },
    { name: "Asia", lon: [60, 150], lat: [10, 74] },
    { name: "Australia", lon: [112, 154], lat: [-40, -10] },
    { name: "Antarctica", lon: [-180, 180], lat: [-90, -66] },
    { name: "the Arctic", lon: [-180, 180], lat: [66, 90] },
  ];

  const OCEANS = [
    { name: "the Pacific Ocean", lon: [-180, -80], lat: [-60, 60] },
    { name: "the Pacific Ocean", lon: [130, 180], lat: [-60, 60] },
    { name: "the Atlantic Ocean", lon: [-52, -10], lat: [-56, 60] },
    { name: "the Indian Ocean", lon: [52, 112], lat: [-56, 10] },
    { name: "the Southern Ocean", lon: [-180, 180], lat: [-66, -50] },
  ];

  function inBox(lon, lat, box) {
    return lon >= box.lon[0] && lon <= box.lon[1] && lat >= box.lat[0] && lat <= box.lat[1];
  }

  function describeLocation(lon, lat) {
    for (const r of REGIONS) if (inBox(lon, lat, r)) return "over " + r.name;
    for (const o of OCEANS) if (inBox(lon, lat, o)) return "over " + o.name;
    return "over the open ocean";
  }

  /*
   * Estimate the sub-satellite point (the spot on Earth directly below the
   * station) at a given time. Latitude follows a sine wave bounded by the
   * orbital inclination; longitude sweeps eastward each orbit while the Earth
   * rotates beneath, producing the classic westward-drifting ground track.
   */
  function estimatePosition(station, date) {
    const minutes = date.getTime() / 60000;
    const orbits = minutes / station.periodMin;
    const phase = orbits * 2 * Math.PI + station.phase;

    const lat = station.inclination * Math.sin(phase);

    const inertialLon = orbits * 360;
    const earthSpin = (minutes / EARTH_ROTATION_MIN) * 360;
    let lon = ((station.phase * 57.3) + inertialLon - earthSpin) % 360;
    lon = ((lon + 180) % 360 + 360) % 360 - 180; // normalise to [-180, 180]

    return { lat, lon };
  }

  /* --- Rendering --- */
  const map = document.getElementById("worldMap");
  const landG = document.getElementById("land");
  const tracksG = document.getElementById("tracks");
  const stationsG = document.getElementById("stations");

  function drawContinents() {
    for (const poly of CONTINENTS) {
      const pts = poly.map(([lon, lat]) => `${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`).join(" ");
      const el = document.createElementNS(SVGNS, "polygon");
      el.setAttribute("points", pts);
      landG.appendChild(el);
    }
  }

  function drawTrack(station) {
    // Sample a chunk of the ground track around "now" for a dashed orbit line.
    const now = new Date();
    const segs = [[]];
    for (let dm = -46; dm <= 46; dm += 2) {
      const p = estimatePosition(station, new Date(now.getTime() + dm * 60000));
      const cur = segs[segs.length - 1];
      // Break the polyline when it wraps across the date line to avoid streaks.
      if (cur.length) {
        const prevLon = cur[cur.length - 1].lon;
        if (Math.abs(p.lon - prevLon) > 180) segs.push([]);
      }
      segs[segs.length - 1].push(p);
    }
    for (const seg of segs) {
      if (seg.length < 2) continue;
      const line = document.createElementNS(SVGNS, "polyline");
      line.setAttribute("points", seg.map((p) => `${lonToX(p.lon).toFixed(1)},${latToY(p.lat).toFixed(1)}`).join(" "));
      line.setAttribute("stroke", station.color);
      tracksG.appendChild(line);
    }
  }

  function drawStationMarker(station, pos) {
    const x = lonToX(pos.lon);
    const y = latToY(pos.lat);
    const g = document.createElementNS(SVGNS, "g");
    g.dataset.station = station.id;

    const pulse = document.createElementNS(SVGNS, "circle");
    pulse.setAttribute("cx", x);
    pulse.setAttribute("cy", y);
    pulse.setAttribute("r", 3);
    pulse.setAttribute("fill", station.color);
    pulse.setAttribute("class", "station-pulse");
    pulse.setAttribute("opacity", "0.6");

    const dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 3.4);
    dot.setAttribute("fill", station.color);
    dot.setAttribute("stroke", "#0d1330");
    dot.setAttribute("stroke-width", "1");
    dot.setAttribute("class", "station-dot");

    const label = document.createElementNS(SVGNS, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y - 6);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "7");
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", "#fff");
    label.setAttribute("stroke", "#0d1330");
    label.setAttribute("stroke-width", "0.5");
    label.setAttribute("paint-order", "stroke");
    label.textContent = station.short;

    g.appendChild(pulse);
    g.appendChild(dot);
    g.appendChild(label);
    stationsG.appendChild(g);
  }

  function crewCount(stationId) {
    return CREW.filter((c) => c.station === stationId).length;
  }

  function buildLegend() {
    const legend = document.getElementById("mapLegend");
    legend.innerHTML = "";
    for (const id of Object.keys(STATIONS)) {
      const s = STATIONS[id];
      const item = document.createElement("div");
      item.className = "legend-item";
      const sw = document.createElement("span");
      sw.className = "legend-swatch";
      sw.style.background = s.color;
      const txt = document.createElement("span");
      txt.textContent = `${s.emoji} ${s.short} · ${crewCount(id)} aboard`;
      item.appendChild(sw);
      item.appendChild(txt);
      legend.appendChild(item);
    }
  }

  /* --- Roster --- */
  function buildRoster() {
    const list = document.getElementById("astronautList");
    list.innerHTML = "";

    for (const id of Object.keys(STATIONS)) {
      const station = STATIONS[id];
      const members = CREW.filter((c) => c.station === id);
      if (!members.length) continue;

      const header = document.createElement("li");
      header.className = "group-header";
      header.innerHTML = `<span>${station.emoji} ${station.name}</span><span class="badge">${members.length} crew</span>`;
      list.appendChild(header);

      members.forEach((c) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "astro-card";
        btn.type = "button";
        btn.innerHTML = `
          <span class="astro-avatar">${c.avatar}</span>
          <span class="astro-info">
            <span class="astro-name">${c.flag} ${escapeHtml(c.name)}</span>
            <span class="astro-meta">${escapeHtml(c.role)} · ${escapeHtml(c.agency)}</span>
          </span>
          <span class="astro-station-tag" style="background:${station.color}22;color:${station.color};border:1px solid ${station.color}55;">${station.short}</span>
          <span class="chevron">›</span>`;
        btn.addEventListener("click", () => openSheet(c));
        li.appendChild(btn);
        list.appendChild(li);
      });
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  /* --- Detail sheet --- */
  const backdrop = document.getElementById("sheetBackdrop");
  const sheet = document.getElementById("detailSheet");
  const sheetBody = document.getElementById("sheetBody");

  function openSheet(c) {
    const station = STATIONS[c.station];
    const pos = estimatePosition(station, new Date());
    const where = describeLocation(pos.lon, pos.lat);
    const latStr = `${Math.abs(pos.lat).toFixed(1)}°${pos.lat >= 0 ? "N" : "S"}`;
    const lonStr = `${Math.abs(pos.lon).toFixed(1)}°${pos.lon >= 0 ? "E" : "W"}`;

    sheetBody.innerHTML = `
      <div class="sheet-hero">
        <span class="sheet-avatar">${c.avatar}</span>
        <div>
          <h3 id="sheetName">${c.flag} ${escapeHtml(c.name)}</h3>
          <div class="sub">${escapeHtml(c.role)} · ${escapeHtml(c.agency)}</div>
        </div>
      </div>
      <div class="sheet-stats">
        <div class="stat-tile"><div class="big">${station.emoji}</div><div class="lbl">${escapeHtml(station.short)}</div></div>
        <div class="stat-tile"><div class="big">${c.days}</div><div class="lbl">days in space</div></div>
        <div class="stat-tile"><div class="big">${station.altitudeKm}<span style="font-size:12px"> km</span></div><div class="lbl">altitude</div></div>
        <div class="stat-tile"><div class="big">~28,000<span style="font-size:12px"> km/h</span></div><div class="lbl">speed</div></div>
      </div>
      <p class="sheet-blurb">${escapeHtml(station.blurb)}</p>
      <div class="sheet-loc">
        📍 Right now, ${escapeHtml(c.name.split(" ")[0])} is estimated to be flying <b>${where}</b>,
        near <b>${latStr}, ${lonStr}</b> — moving too fast to wave back!
      </div>`;

    backdrop.hidden = false;
    sheet.hidden = false;
  }

  function closeSheet() {
    backdrop.hidden = true;
    sheet.hidden = true;
  }
  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  /* --- Live-ish updates --- */
  function refreshStations() {
    stationsG.innerHTML = "";
    tracksG.innerHTML = "";
    const now = new Date();
    for (const id of Object.keys(STATIONS)) {
      const station = STATIONS[id];
      drawTrack(station);
      drawStationMarker(station, estimatePosition(station, now));
    }
  }

  function updateTimestamp() {
    const el = document.getElementById("updatedAt");
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.textContent = `positions ~ ${time}`;
  }

  /* --- Init --- */
  function init() {
    document.getElementById("countNum").textContent = CREW.length;
    drawContinents();
    buildLegend();
    buildRoster();
    refreshStations();
    updateTimestamp();

    // Gently drift the stations every 20s so it feels alive.
    setInterval(() => {
      refreshStations();
      updateTimestamp();
    }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
