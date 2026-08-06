/*
 * Adam's Astronaut Tracker — app logic
 *
 * A cartoon "you are in orbit" scene you can fly a camera through: zoom all
 * the way out to see the whole round Earth with the stations as tiny specks,
 * or zoom right in to watch the astronauts spacewalking on tethers just
 * outside the International Space Station.
 *
 * It also estimates where each station is currently passing over Earth with a
 * simple orbit model — a playful best guess, not precise tracking.
 */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const EARTH_ROTATION_MIN = 1436; // minutes for Earth to spin 360°
  const VB_W = 400, VB_H = 480;    // SVG viewBox size
  const EARTH = { cx: 200, cy: 900, r: 470 };

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
  const cloudsG = document.getElementById("clouds");
  const tetherLayer = document.getElementById("tetherLayer");
  const astroLayer = document.getElementById("astroLayer");
  const tiangongG = document.getElementById("tiangongG");

  function el(name, attrs) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function drawStars() {
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * VB_W;
      const y = Math.random() * VB_H;
      const r = Math.random() * 1.2 + 0.3;
      const s = el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1), fill: "#fff" });
      s.setAttribute("opacity", (Math.random() * 0.6 + 0.3).toFixed(2));
      if (Math.random() > 0.7) { s.setAttribute("class", "twinkle"); s.style.animationDelay = (Math.random() * 3).toFixed(1) + "s"; }
      starLayer.appendChild(s);
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

  // Cartoon continents scattered across the round planet (offsets are for a
  // 250px globe, then scaled to whatever radius the Earth actually is).
  function drawContinents() {
    const f = EARTH.r / 250;
    const land = [
      [-70, -120, 44, 28], [16, -150, 32, 20], [-128, -34, 40, 52], [-38, -46, 52, 60],
      [86, -74, 40, 34], [128, 6, 28, 40], [-92, 92, 44, 30], [4, 74, 56, 40],
      [78, 116, 40, 28], [156, -28, 22, 30],
    ];
    for (const [dx, dy, w, h] of land) {
      continents.appendChild(el("path", { d: blobPath(EARTH.cx + dx * f, EARTH.cy + dy * f, w * f, h * f) }));
    }
  }

  // Fluffy clouds that drift across the globe (clipped to the disc, so they
  // slip on and off the edge seamlessly).
  const clouds = [];
  function drawClouds() {
    const f = EARTH.r / 250;
    const specs = [
      { dy: -150, speed: 0.30, op: 0.5, k: 1.4 },
      { dy: -40, speed: 0.20, op: 0.4, k: 1.9 },
      { dy: 90, speed: 0.36, op: 0.45, k: 1.2 },
      { dy: -90, speed: 0.16, op: 0.35, k: 1.6 },
      { dy: 40, speed: 0.24, op: 0.4, k: 1.5 },
    ];
    specs.forEach((sp, i) => {
      const g = el("g", { opacity: sp.op });
      const k = sp.k * f;
      [[0, 0, 16 * k, 9 * k], [15 * k, 3 * k, 12 * k, 7 * k], [-15 * k, 3 * k, 12 * k, 7 * k], [7 * k, -5 * k, 10 * k, 6 * k]]
        .forEach(([dx, dy, rx, ry]) => g.appendChild(el("ellipse", { cx: dx, cy: dy, rx, ry })));
      const y = EARTH.cy + sp.dy * f;
      const x = EARTH.cx - EARTH.r * 0.8 + ((i * 210) % (EARTH.r * 1.7));
      clouds.push({ g, x, y, speed: sp.speed });
      g.setAttribute("transform", `translate(${x} ${y})`);
      cloudsG.appendChild(g);
    });
  }

  // A little cartoon Tiangong station off to one side.
  function drawTiangong() {
    const g = el("g", { transform: "translate(330 112) scale(0.5)" });
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

  /* Spacewalk spots hugging each station (offsets from the station core). */
  const EVA = {
    iss: {
      core: [200, 255], scale: 1, trussY: 250, trussX: [80, 320],
      spots: [[-150, -16], [150, -16], [-92, -48], [92, -48], [-92, 50], [92, 50], [0, -66], [0, 60], [-46, -10], [46, -10]],
    },
    tiangong: {
      core: [330, 112], scale: 0.62, trussY: 112, trussX: [312, 348],
      spots: [[-40, -6], [40, -6], [0, 26], [-24, -30], [24, -30]],
    },
  };

  function placeAstronauts() {
    for (const id of Object.keys(STATIONS)) {
      const eva = EVA[id];
      if (!eva) continue;
      const members = CREW.filter((c) => c.station === id);
      members.forEach((c, i) => {
        const off = eva.spots[i % eva.spots.length];
        const x = eva.core[0] + off[0];
        const y = eva.core[1] + off[1];

        // tether anchors onto the nearest bit of the station structure
        const ax = Math.max(eva.trussX[0], Math.min(eva.trussX[1], x));
        tetherLayer.appendChild(el("line", { x1: ax, y1: eva.trussY, x2: x.toFixed(1), y2: y.toFixed(1) }));

        // outer group = position (attribute transform); inner = float (CSS)
        const outer = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`, class: "astro-icon" });
        outer.setAttribute("tabindex", "0");
        outer.setAttribute("role", "button");
        outer.setAttribute("aria-label", `${c.name}, ${c.role} aboard ${STATIONS[id].short}`);

        const inner = el("g", { class: "eva eva-" + (i % 4) });
        inner.style.animationDelay = (i * 0.4).toFixed(2) + "s";
        const s = eva.scale;
        inner.appendChild(el("circle", { r: 14 * s, fill: "#ffffff", opacity: 0.16 }));
        const face = el("text", { x: 0, y: 0, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 20 * s });
        face.textContent = c.avatar;
        inner.appendChild(face);
        const label = el("text", { x: 0, y: 24 * s, "text-anchor": "middle", "font-size": 9, class: "astro-label" });
        label.textContent = c.name.split(" ")[0];
        inner.appendChild(label);

        outer.appendChild(inner);
        outer.addEventListener("click", () => { if (!dragMoved) openSheet(c); });
        outer.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(c); } });
        astroLayer.appendChild(outer);
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Camera: zoom (incl. below 1 = pull right back) & pan               *
   * ------------------------------------------------------------------ */
  const WORLD = { x0: -300, x1: 700, y0: 150, y1: 1400 };
  const MIN_S = Math.min(VB_W / (WORLD.x1 - WORLD.x0), VB_H / (WORLD.y1 - WORLD.y0)); // fits whole planet
  const MAX_S = 3.4;
  const HOME = { s: 1.2, cx: 200, cy: 250 }; // opening shot: the whole ISS with its crew
  const view = { s: HOME.s, tx: 0, ty: 0 };

  function clampAxis(t, viewLen, w0, w1, s) {
    if (viewLen / s >= (w1 - w0)) return (viewLen - (w0 + w1) * s) / 2; // world smaller than view → centre
    return Math.min(-w0 * s, Math.max(viewLen - w1 * s, t));
  }
  function applyView() {
    view.tx = clampAxis(view.tx, VB_W, WORLD.x0, WORLD.x1, view.s);
    view.ty = clampAxis(view.ty, VB_H, WORLD.y0, WORLD.y1, view.s);
    sceneG.setAttribute("transform", `translate(${view.tx.toFixed(2)} ${view.ty.toFixed(2)}) scale(${view.s.toFixed(3)})`);
    scene.classList.toggle("zoomed", view.s > 1.7);
  }
  function centerOn(cx, cy, s) {
    view.s = Math.min(MAX_S, Math.max(MIN_S, s));
    view.tx = VB_W / 2 - view.s * cx;
    view.ty = VB_H / 2 - view.s * cy;
    applyView();
  }
  function zoomAround(factor, fx, fy) {
    const newS = Math.min(MAX_S, Math.max(MIN_S, view.s * factor));
    view.tx = fx - (newS / view.s) * (fx - view.tx);
    view.ty = fy - (newS / view.s) * (fy - view.ty);
    view.s = newS;
    applyView();
  }
  function toVB(clientX, clientY) {
    const r = scene.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * VB_W, y: ((clientY - r.top) / r.height) * VB_H };
  }
  const vbPerPx = () => VB_W / scene.getBoundingClientRect().width;

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
  function endPointer(e) { pointers.delete(e.pointerId); if (pointers.size < 2) lastPinch = null; }
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

  document.getElementById("zoomIn").addEventListener("click", () => zoomAround(1.5, VB_W / 2, VB_H / 2));
  document.getElementById("zoomOut").addEventListener("click", () => zoomAround(1 / 1.5, VB_W / 2, VB_H / 2));
  document.getElementById("zoomReset").addEventListener("click", () => centerOn(HOME.cx, HOME.cy, HOME.s));

  /* ------------------------------------------------------------------ *
   * Caption, legend, roster, detail sheet                               *
   * ------------------------------------------------------------------ */
  const crewCount = (id) => CREW.filter((c) => c.station === id).length;

  function updateCaption() {
    const pos = estimatePosition(STATIONS.iss, new Date());
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

  /* Drift the clouds so the planet feels alive. */
  function animateGlobe() {
    const edge = EARTH.r + 60;
    for (const c of clouds) {
      c.x -= c.speed;
      if (c.x < EARTH.cx - edge) c.x = EARTH.cx + edge;
      c.g.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y})`);
    }
  }

  /* ------------------------------------------------------------------ *
   * Init                                                                *
   * ------------------------------------------------------------------ */
  function init() {
    document.getElementById("countNum").textContent = CREW.length;
    document.getElementById("updatedAt").textContent = "crew as of " + (window.ROSTER_UPDATED || "");
    const ver = "v" + (window.APP_VERSION || "?") + (window.APP_BUILD ? " · built " + window.APP_BUILD : "");
    document.getElementById("appVersion").textContent = ver;
    console.log("Adam's Astronaut Tracker — " + ver);
    drawStars();
    drawContinents();
    drawClouds();
    drawTiangong();
    placeAstronauts();
    buildLegend();
    buildRoster();
    updateCaption();
    centerOn(HOME.cx, HOME.cy, HOME.s);

    setInterval(animateGlobe, 60);        // drifting clouds
    setInterval(updateCaption, 20000);    // refresh "currently over…"
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
