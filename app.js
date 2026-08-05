/*
 * Adam's Astronaut Tracker — app logic
 *
 * Draws a cartoon "you are in orbit" scene: the International Space Station up
 * close as the star of the show, the curved edge of Earth peeking in below,
 * and astronaut icons floating at their spots around each station. The whole
 * scene can be pinched / scrolled / dragged to zoom in for a closer look.
 *
 * It also estimates where each station is currently passing over Earth with a
 * simple orbit model — a playful best guess, not precise tracking.
 */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const EARTH_ROTATION_MIN = 1436; // minutes for Earth to spin 360°
  const VB_W = 400, VB_H = 480;    // SVG viewBox size

  /* ------------------------------------------------------------------ *
   * Orbit estimate (used for the "currently over…" caption & the sheet) *
   * ------------------------------------------------------------------ */
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
  const inBox = (lon, lat, b) => lon >= b.lon[0] && lon <= b.lon[1] && lat >= b.lat[0] && lat <= b.lat[1];
  function describeLocation(lon, lat) {
    for (const r of REGIONS) if (inBox(lon, lat, r)) return "over " + r.name;
    for (const o of OCEANS) if (inBox(lon, lat, o)) return "over " + o.name;
    return "over the open ocean";
  }
  function estimatePosition(station, date) {
    const minutes = date.getTime() / 60000;
    const orbits = minutes / station.periodMin;
    const phase = orbits * 2 * Math.PI + station.phase;
    const lat = station.inclination * Math.sin(phase);
    const inertialLon = orbits * 360;
    const earthSpin = (minutes / EARTH_ROTATION_MIN) * 360;
    let lon = ((station.phase * 57.3) + inertialLon - earthSpin) % 360;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return { lat, lon };
  }

  /* ------------------------------------------------------------------ *
   * Scene building                                                      *
   * ------------------------------------------------------------------ */
  const scene = document.getElementById("spaceScene");
  const sceneG = document.getElementById("sceneG");
  const starLayer = document.getElementById("starLayer");
  const continents = document.getElementById("continents");
  const tetherLayer = document.getElementById("tetherLayer");
  const astroLayer = document.getElementById("astroLayer");
  const tiangongG = document.getElementById("tiangongG");

  function el(name, attrs) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawStars() {
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * VB_W;
      const y = Math.random() * (VB_H * 0.62); // keep stars in the sky, not on Earth
      const r = Math.random() * 1.2 + 0.3;
      const s = el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1), fill: "#fff" });
      s.setAttribute("opacity", (Math.random() * 0.6 + 0.3).toFixed(2));
      if (Math.random() > 0.7) { s.setAttribute("class", "twinkle"); s.style.animationDelay = (Math.random() * 3).toFixed(1) + "s"; }
      starLayer.appendChild(s);
    }
  }

  // A ring of cartoon landmass blobs sitting just inside Earth's visible edge.
  function drawContinents() {
    const cx = 200, cy = 1120, r = 748; // just inside the Earth body radius
    const blobs = [
      { a: -128, w: 46, h: 30 }, { a: -96, w: 30, h: 22 }, { a: -70, w: 40, h: 26 },
      { a: -40, w: 28, h: 20 }, { a: -8, w: 44, h: 30 }, { a: 24, w: 26, h: 18 },
    ];
    for (const b of blobs) {
      const rad = (b.a * Math.PI) / 180;
      const x = cx + r * Math.sin(rad);
      const y = cy - r * Math.cos(rad);
      const blob = el("path", { d: blobPath(x, y, b.w, b.h) });
      continents.appendChild(blob);
    }
  }
  // A lumpy rounded blob centred on (x,y).
  function blobPath(x, y, w, h) {
    return `M ${x - w},${y}
      C ${x - w},${y - h} ${x - w * 0.3},${y - h * 1.2} ${x},${y - h}
      C ${x + w * 0.5},${y - h * 0.8} ${x + w},${y - h * 0.5} ${x + w},${y}
      C ${x + w},${y + h * 0.8} ${x + w * 0.3},${y + h * 1.1} ${x},${y + h * 0.7}
      C ${x - w * 0.5},${y + h} ${x - w},${y + h * 0.6} ${x - w},${y} Z`;
  }

  // A little cartoon Tiangong station near the horizon.
  function drawTiangong() {
    const g = el("g", { transform: "translate(322 300) scale(0.5)" });
    const parts = [
      el("rect", { x: -70, y: -6, width: 140, height: 12, rx: 5, fill: "url(#metal)", stroke: "#33406b", "stroke-width": 3 }),
      el("rect", { x: -74, y: -34, width: 30, height: 24, rx: 3, fill: "url(#panel)", stroke: "#22346b", "stroke-width": 3 }),
      el("rect", { x: 44, y: -34, width: 30, height: 24, rx: 3, fill: "url(#panel)", stroke: "#22346b", "stroke-width": 3 }),
      el("rect", { x: -74, y: 10, width: 30, height: 24, rx: 3, fill: "url(#panel)", stroke: "#22346b", "stroke-width": 3 }),
      el("rect", { x: 44, y: 10, width: 30, height: 24, rx: 3, fill: "url(#panel)", stroke: "#22346b", "stroke-width": 3 }),
      el("rect", { x: -22, y: -20, width: 44, height: 40, rx: 16, fill: "url(#metal)", stroke: "#2b3766", "stroke-width": 3.5 }),
      el("circle", { cx: 0, cy: 0, r: 5, fill: "#ff9ad9", stroke: "#2b3766", "stroke-width": 2 }),
    ];
    parts.forEach((p) => g.appendChild(p));
    const flag = el("g", {});
    flag.appendChild(el("rect", { x: 24, y: -60, width: 78, height: 30, rx: 15, fill: "#ff7ad4" }));
    const t = el("text", { x: 63, y: -39, "text-anchor": "middle", "font-size": 20, "font-weight": 800, fill: "#4a0033" });
    t.textContent = "Tiangong";
    flag.appendChild(t);
    g.appendChild(flag);
    tiangongG.appendChild(g);
  }

  /* Where each station's crew floats in the scene. */
  const ANCHORS = {
    iss: { cx: 200, cy: 175, rx: 122, ry: 96, iconScale: 1, core: [200, 178] },
    tiangong: { cx: 322, cy: 300, rx: 42, ry: 34, iconScale: 0.62, core: [322, 300] },
  };

  function placeAstronauts() {
    for (const id of Object.keys(STATIONS)) {
      const anchor = ANCHORS[id];
      if (!anchor) continue;
      const members = CREW.filter((c) => c.station === id);
      const n = members.length;
      members.forEach((c, i) => {
        const ang = (-90 + (360 / n) * i) * (Math.PI / 180);
        const x = anchor.cx + anchor.rx * Math.cos(ang);
        const y = anchor.cy + anchor.ry * Math.sin(ang);

        // tether from the station core to the astronaut
        tetherLayer.appendChild(el("line", { x1: anchor.core[0], y1: anchor.core[1], x2: x.toFixed(1), y2: y.toFixed(1) }));

        // outer group = position (attribute transform), inner = gentle bob (CSS)
        const outer = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, class: "astro-icon" });
        outer.setAttribute("tabindex", "0");
        outer.setAttribute("role", "button");
        outer.setAttribute("aria-label", `${c.name}, ${c.role} aboard ${STATIONS[id].short}`);

        const bob = el("g", { class: "bob" });
        bob.style.animationDelay = (i * 0.35).toFixed(2) + "s";
        const s = anchor.iconScale;
        bob.appendChild(el("circle", { r: 15 * s, fill: "#ffffff", opacity: 0.16 }));
        bob.appendChild(el("circle", { r: 12 * s, fill: "url(#helmet)", stroke: "#2b3766", "stroke-width": 2 * s }));
        const face = el("text", { x: 0, y: 0, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 15 * s });
        face.textContent = c.avatar;
        bob.appendChild(face);

        const label = el("text", { x: 0, y: 24 * s, "text-anchor": "middle", "font-size": 9, class: "astro-label" });
        label.textContent = c.name.split(" ")[0];
        bob.appendChild(label);

        outer.appendChild(bob);
        // tap (not drag) opens the detail sheet
        outer.addEventListener("click", () => { if (!dragMoved) openSheet(c); });
        outer.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(c); } });
        astroLayer.appendChild(outer);
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Zoom & pan                                                          *
   * ------------------------------------------------------------------ */
  const view = { s: 1, tx: 0, ty: 0 };
  const MIN_S = 1, MAX_S = 5;

  function clampPan() {
    view.tx = Math.min(0, Math.max(VB_W - VB_W * view.s, view.tx));
    view.ty = Math.min(0, Math.max(VB_H - VB_H * view.s, view.ty));
  }
  function applyView() {
    clampPan();
    sceneG.setAttribute("transform", `translate(${view.tx.toFixed(2)} ${view.ty.toFixed(2)}) scale(${view.s.toFixed(3)})`);
    scene.classList.toggle("zoomed", view.s > 1.6);
  }
  // Zoom by `factor` keeping the point (fx,fy) [in viewBox coords] fixed.
  function zoomAround(factor, fx, fy) {
    const newS = Math.min(MAX_S, Math.max(MIN_S, view.s * factor));
    const px = (fx - view.tx) / view.s;
    const py = (fy - view.ty) / view.s;
    view.tx = fx - newS * px;
    view.ty = fy - newS * py;
    view.s = newS;
    applyView();
  }
  // Convert a client (screen) point to viewBox coords.
  function toVB(clientX, clientY) {
    const r = scene.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * VB_W, y: ((clientY - r.top) / r.height) * VB_H };
  }
  const vbPerPx = () => VB_W / scene.getBoundingClientRect().width;

  // Pointer handling: 1 pointer = pan, 2 pointers = pinch zoom.
  const pointers = new Map();
  let lastPinch = null, dragMoved = false;

  scene.addEventListener("pointerdown", (e) => {
    scene.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = false;
    if (pointers.size === 2) lastPinch = pinchState();
  });
  scene.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const now = pinchState();
      if (lastPinch) {
        const mid = toVB(now.mx, now.my);
        zoomAround(now.dist / lastPinch.dist, mid.x, mid.y);
        view.tx += (now.mx - lastPinch.mx) * vbPerPx();
        view.ty += (now.my - lastPinch.my) * vbPerPx();
        applyView();
      }
      lastPinch = now;
      dragMoved = true;
    } else if (pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      view.tx += dx * vbPerPx();
      view.ty += dy * vbPerPx();
      applyView();
    }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = null;
  }
  scene.addEventListener("pointerup", endPointer);
  scene.addEventListener("pointercancel", endPointer);

  function pinchState() {
    const pts = [...pointers.values()];
    const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
    return { dist: Math.hypot(dx, dy) || 1, mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
  }

  scene.addEventListener("wheel", (e) => {
    e.preventDefault();
    const f = toVB(e.clientX, e.clientY);
    zoomAround(e.deltaY < 0 ? 1.12 : 0.89, f.x, f.y);
  }, { passive: false });

  document.getElementById("zoomIn").addEventListener("click", () => zoomAround(1.4, VB_W / 2, 190));
  document.getElementById("zoomOut").addEventListener("click", () => zoomAround(1 / 1.4, VB_W / 2, 190));
  document.getElementById("zoomReset").addEventListener("click", () => { view.s = 1; view.tx = 0; view.ty = 0; applyView(); });

  /* ------------------------------------------------------------------ *
   * Caption, legend, roster, detail sheet                               *
   * ------------------------------------------------------------------ */
  const crewCount = (id) => CREW.filter((c) => c.station === id).length;

  function updateCaption() {
    const iss = STATIONS.iss;
    const pos = estimatePosition(iss, new Date());
    document.getElementById("sceneCaption").innerHTML =
      `🛰️ Right now the <b>ISS</b> is cruising <b>${describeLocation(pos.lon, pos.lat)}</b> with ${crewCount("iss")} crew aboard.`;
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
      item.append(sw, txt);
      legend.appendChild(item);
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

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
  function closeSheet() { backdrop.hidden = true; sheet.hidden = true; }
  document.getElementById("sheetClose").addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  /* Slowly spin Earth's continents so the globe feels alive. */
  let spin = 0;
  function spinEarth() {
    spin = (spin + 0.25) % 360;
    continents.setAttribute("transform", `rotate(${spin.toFixed(2)} 200 1120)`);
  }

  /* ------------------------------------------------------------------ *
   * Init                                                                *
   * ------------------------------------------------------------------ */
  function init() {
    document.getElementById("countNum").textContent = CREW.length;
    document.getElementById("updatedAt").textContent = "crew as of " + (window.ROSTER_UPDATED || "");
    drawStars();
    drawContinents();
    drawTiangong();
    placeAstronauts();
    buildLegend();
    buildRoster();
    updateCaption();
    applyView();

    setInterval(spinEarth, 120);          // gentle Earth spin
    setInterval(updateCaption, 20000);    // refresh "currently over…"
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
