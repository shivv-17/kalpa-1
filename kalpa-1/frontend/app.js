// ==========================================
// 1. 3D EARTH WITH QUATERNION ZOOM
// ==========================================
const canvas = document.getElementById('earth-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 4.3);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const starGeo = new THREE.BufferGeometry();
const starCount = 1900;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  starPos[i] = (Math.random() - 0.5) * 45;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.035, transparent: true, opacity: 0.85 })
);
scene.add(stars);

const earthGroup = new THREE.Group();
earthGroup.position.x = window.innerWidth > 900 ? 0.85 : 0;
scene.add(earthGroup);

const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin('anonymous');

const earthMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.45, 64, 64),
  new THREE.MeshPhongMaterial({
    map: texLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
    bumpMap: texLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    bumpScale: 0.03,
    specular: new THREE.Color(0x1e293b),
    shininess: 14
  })
);
earthGroup.add(earthMesh);

const atmoMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.51, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.BackSide })
);
earthGroup.add(atmoMesh);

const orbitTiltGroup = new THREE.Group();
orbitTiltGroup.rotation.z = 0.42;
orbitTiltGroup.rotation.x = 0.25;
earthGroup.add(orbitTiltGroup);

const orbitRingMat = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.14,
  side: THREE.DoubleSide
});
const orbitRing = new THREE.Mesh(new THREE.RingGeometry(1.88, 1.895, 96), orbitRingMat);
orbitRing.rotation.x = Math.PI / 2;
orbitTiltGroup.add(orbitRing);

const satelliteGroup = new THREE.Group();
const satBus = new THREE.Mesh(
  new THREE.BoxGeometry(0.055, 0.04, 0.04),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.25 })
);
const panelGeo = new THREE.BoxGeometry(0.11, 0.004, 0.032);
const panelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.3 });
const leftWing = new THREE.Mesh(panelGeo, panelMat);
leftWing.position.x = -0.095;
const rightWing = new THREE.Mesh(panelGeo, panelMat);
rightWing.position.x = 0.095;
satelliteGroup.add(satBus, leftWing, rightWing);
orbitTiltGroup.add(satelliteGroup);

function latLngToVector3(lat, lng, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 90);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}
const locationBeacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.038, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
locationBeacon.position.copy(latLngToVector3(22.5, 78.9, 1.475));
earthMesh.add(locationBeacon);

function computeTargetQuaternion(lat, lng) {
  const pointDir = latLngToVector3(lat, lng, 1).normalize();
  const cameraDir = new THREE.Vector3(0, 0, 1);
  return new THREE.Quaternion().setFromUnitVectors(pointDir, cameraDir);
}

let isScanMode = false;
let targetQuat = computeTargetQuaternion(22.5, 78.9);
let targetCameraZ = 4.3;
let manualQuat = new THREE.Quaternion();
let hasManualDrag = false;

function focusGlobeOnLocation(lat, lng, zoomZ = 2.55) {
  hasManualDrag = false;
  targetQuat = computeTargetQuaternion(lat, lng);
  targetCameraZ = zoomZ;
  locationBeacon.position.copy(latLngToVector3(lat, lng, 1.475));
}

function resetGlobeToIndia() {
  hasManualDrag = false;
  targetQuat = computeTargetQuaternion(22.5, 78.9);
  targetCameraZ = 4.3;
  locationBeacon.position.copy(latLngToVector3(22.5, 78.9, 1.475));
}

earthMesh.quaternion.copy(targetQuat);

scene.add(new THREE.AmbientLight(0x475569, 1.45));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.55);
sunLight.position.set(4, 2.5, 5);
scene.add(sunLight);

let isDragging = false;
let dragMoved = false;
let prevMouse = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragMoved = false;
  prevMouse = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', (e) => {
  if (isDragging && !dragMoved) {
    handleGlobeClick(e.clientX, e.clientY);
  }
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevMouse.x;
  const dy = e.clientY - prevMouse.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
    dragMoved = true;
    if (!hasManualDrag) {
      manualQuat.copy(earthMesh.quaternion);
      hasManualDrag = true;
    }
    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.006);
    const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.006);
    manualQuat.premultiply(qY).premultiply(qX).normalize();
  }
  prevMouse = { x: e.clientX, y: e.clientY };
});

async function handleGlobeClick(clientX, clientY) {
  pointerNDC.x = (clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObject(earthMesh, false);
  if (!hits.length) return;

  const localPoint = earthMesh.worldToLocal(hits[0].point.clone()).normalize();
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, localPoint.y))) * 180) / Math.PI;
  let lng = (Math.atan2(localPoint.z, -localPoint.x) * 180) / Math.PI - 180;
  if (lng < -180) lng += 360;

  if (lat < 6.0 || lat > 37.5 || lng < 68.0 || lng > 97.5) {
    openAudit();
    showAuditError("Clicked outside India's main region. Click on India or search an Indian city/locality.");
    return;
  }

  openAudit();
  let placeLabel = `${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`;
  try {
    const rev = await fetch(`/api/reverse-geocode?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`);
    if (rev.ok) {
      const d = await rev.json();
      placeLabel = d.display_name.split(',').slice(0, 2).join(', ') || placeLabel;
    }
  } catch (_) {}

  document.getElementById('cityInput').value = placeLabel;
  runAnalysis(lat, lng, placeLabel);
}

let scrollProgress = 0;
window.addEventListener('scroll', () => {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  document.getElementById('scrollProgress').style.width = `${(scrollProgress * 100).toFixed(1)}%`;
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('active');
  });
}, { threshold: 0.16 });
document.querySelectorAll('.reveal-3d').forEach(el => observer.observe(el));

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  let desiredX = 0;
  if (window.innerWidth > 900) {
    desiredX = isScanMode ? -1.18 : (0.85 - scrollProgress * 1.35);
  }

  const desiredZ = isScanMode ? targetCameraZ : (4.3 - Math.sin(scrollProgress * Math.PI) * 0.65);

  earthGroup.position.x += (desiredX - earthGroup.position.x) * 0.075;
  camera.position.z += (desiredZ - camera.position.z) * 0.075;

  if (hasManualDrag) {
    earthMesh.quaternion.slerp(manualQuat, 0.14);
  } else {
    const scrollSpin = isScanMode ? 0 : (-scrollProgress * 0.35 + Math.sin(t * 0.25) * 0.03);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), scrollSpin);
    const combinedTarget = targetQuat.clone().premultiply(spinQuat);
    earthMesh.quaternion.slerp(combinedTarget, 0.08);
  }

  const satAngle = t * 0.55;
  satelliteGroup.position.set(Math.cos(satAngle) * 1.89, 0, Math.sin(satAngle) * 1.89);
  satelliteGroup.rotation.y = -satAngle;
  const inOrbitSection = !isScanMode && scrollProgress > 0.15 && scrollProgress < 0.45;
  orbitRingMat.opacity += ((inOrbitSection ? 0.34 : 0.13) - orbitRingMat.opacity) * 0.08;

  const pulse = 1 + Math.sin(t * 4) * 0.35;
  locationBeacon.scale.set(pulse, pulse, pulse);
  stars.rotation.y = t * 0.01;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 2. HOME INTERACTIONS & SCAN MODE TOGGLES
// ==========================================
const pillarNotes = {
  elevation: "Detects whether a plot sits lower than neighboring ground (-m delta) or on a steep slope, which shapes runoff and plinth height.",
  waterbody: "Checks archival land-use patterns for historical wetlands, tanks, or drainage corridors that can retain water.",
  groundwater: "Summarizes regional aquifer depth/type and soil profile so borewell and recharge planning match local geology.",
  climate: "Estimates seasonal rainfall harvest potential and rooftop solar generation based on local irradiance and plot size."
};

function selectPillar(key) {
  ['elevation', 'waterbody', 'groundwater', 'climate'].forEach(id => {
    const btn = document.getElementById(`pillar-${id}`);
    btn.className = id === key
      ? "p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-left transition"
      : "p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-left transition";
  });
  document.getElementById('pillarDetailText').innerText = pillarNotes[key];
}

function openAboutModal() {
  const m = document.getElementById('aboutModal');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

function closeAboutModal() {
  const m = document.getElementById('aboutModal');
  m.classList.add('hidden');
  m.classList.remove('flex');
}

function openAudit() {
  isScanMode = true;
  document.body.classList.add('scan-mode');
  document.getElementById('navSectionLinks').classList.add('opacity-0', 'pointer-events-none');
  const d = document.getElementById('auditDrawer');
  d.classList.remove('hidden');
  d.classList.add('flex');
  if (leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 160);
  }
}

function closeAudit() {
  isScanMode = false;
  document.body.classList.remove('scan-mode');
  document.getElementById('navSectionLinks').classList.remove('opacity-0', 'pointer-events-none');
  document.getElementById('stateFocusPill').classList.add('hidden');
  resetGlobeToIndia();
  const d = document.getElementById('auditDrawer');
  d.classList.add('hidden');
  d.classList.remove('flex');
}

function switchReportTab(tab) {
  ['overview', 'hazards', 'market'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (t === tab) {
      btn.className = "flex-1 py-2 rounded-lg bg-sky-400 text-slate-950 font-semibold transition";
      panel.classList.remove('hidden');
    } else {
      btn.className = "flex-1 py-2 rounded-lg text-slate-300 hover:text-white transition";
      panel.classList.add('hidden');
    }
  });
  if (tab === 'overview' && leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 120);
  }
}

// ==========================================
// 3. ANALYZER, SCENARIO COMPARISON & HISTORY
// ==========================================
const KALPA_MAP_KEY = "6uThLpTqLiysDtP6vAfE";
let verdicts = { en: '', hi: '' };
let lastAuditSummary = '';
let currentData = null;
let searchHistory = [];
let leafletMap = null;
let leafletMarker = null;

function selectScenario(mode) {
  ['basic', 'engineered', 'resilient'].forEach(m => {
    const btn = document.getElementById(`scen-${m}`);
    btn.className = m === mode
      ? "px-2.5 py-1 rounded-lg bg-sky-400 text-slate-950 font-semibold text-[11px] transition"
      : "px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px] transition";
  });

  const titleEl = document.getElementById('scenarioTitle');
  const outEl = document.getElementById('scenarioOutcome');
  const rainYield = currentData?.metrics?.rainwater_yield || "monsoon harvest";
  const solarYield = currentData?.metrics?.solar_yield || "rooftop solar";

  if (mode === 'basic') {
    titleEl.innerText = "Standard Plinth Only";
    outEl.innerText = "Handles light showers on level ground, but may face dampness or edge runoff in heavy bursts or low-lying pockets.";
  } else if (mode === 'engineered') {
    titleEl.innerText = "Raised Plinth + Perimeter Drain";
    outEl.innerText = currentData?.plinth_comparison?.recommended || "Raised plinth and storm drainage channel cut waterlogging risk significantly.";
  } else {
    titleEl.innerText = "Full Water & Solar Setup";
    outEl.innerText = `Combines raised grading with ~${rainYield} rainwater recharge and ~${solarYield} solar backup for lower utility & monsoon stress.`;
  }
}

function getPlotAreaSqm() {
  const raw = parseFloat(document.getElementById('plotSizeInput').value) || 1600;
  const unit = document.getElementById('plotUnitSelect').value;
  return unit === 'sqft' ? raw * 0.092903 : raw;
}

function showAuditError(msg) {
  const el = document.getElementById('auditError');
  el.innerText = msg;
  el.classList.remove('hidden');
}

function hideAuditError() {
  document.getElementById('auditError').classList.add('hidden');
}

function switchVerdict(lang) {
  document.getElementById('resVerdict').innerText = verdicts[lang];
  document.getElementById('langEn').className = lang === 'en'
    ? 'px-2 py-0.5 text-[11px] rounded bg-sky-400 text-slate-950 font-bold'
    : 'px-2 py-0.5 text-[11px] rounded text-slate-300';
  document.getElementById('langHi').className = lang === 'hi'
    ? 'px-2 py-0.5 text-[11px] rounded bg-sky-400 text-slate-950 font-bold'
    : 'px-2 py-0.5 text-[11px] rounded text-slate-300';
}

function updateMapPreview(lat, lng, label) {
  if (!leafletMap) {
    leafletMap = L.map('locationPinMap', { zoomControl: true, attributionControl: false }).setView([lat, lng], 13);

    const primaryLayer = L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${KALPA_MAP_KEY}`,
      { maxZoom: 19 }
    );
    const fallbackLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );

    primaryLayer.addTo(leafletMap);
    primaryLayer.on('tileerror', () => {
      if (!leafletMap.hasLayer(fallbackLayer)) {
        leafletMap.removeLayer(primaryLayer);
        fallbackLayer.addTo(leafletMap);
      }
    });

    leafletMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.9
    }).addTo(leafletMap).bindPopup(label).openPopup();
  } else {
    leafletMap.setView([lat, lng], 13);
    leafletMarker.setLatLng([lat, lng]).bindPopup(label).openPopup();
  }
  setTimeout(() => leafletMap.invalidateSize(), 150);
}

function addToHistory(item) {
  searchHistory = [item, ...searchHistory.filter(h => h.label !== item.label)].slice(0, 6);
  const bar = document.getElementById('historyBar');
  const list = document.getElementById('historyList');
  bar.classList.remove('hidden');
  list.innerHTML = searchHistory.map((h, idx) => `
    <button type="button" onclick="reloadHistory(${idx})"
      class="px-2.5 py-1 rounded-full bg-white/10 hover:bg-sky-400/20 border border-white/10 text-slate-200 whitespace-nowrap transition">
      ${h.label} <span class="text-sky-300 font-mono">${h.score}</span>
    </button>
  `).join('');
}

function reloadHistory(idx) {
  const item = searchHistory[idx];
  if (!item) return;
  document.getElementById('cityInput').value = item.label;
  runAnalysis(item.lat, item.lng, item.label, false);
}

function copyAuditBrief() {
  if (!lastAuditSummary) return;
  navigator.clipboard.writeText(lastAuditSummary);
  const btn = document.getElementById('copyBriefBtn');
  btn.innerText = 'Copied ✓';
  setTimeout(() => { btn.innerText = 'Copy Summary'; }, 1800);
}

async function searchByPlace() {
  const q = document.getElementById('cityInput').value.trim();
  if (!q) return;
  hideAuditError();
  document.getElementById('auditEmptyState').classList.add('hidden');
  document.getElementById('auditLoader').classList.remove('hidden');
  document.getElementById('auditResult').classList.add('hidden');

  try {
    const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!geoRes.ok) throw new Error("Could not find that place in India. Try a city, town, or locality name.");
    const geo = await geoRes.json();
    const shortName = geo.display_name.split(',').slice(0, 2).join(', ');
    await runAnalysis(geo.lat, geo.lng, shortName);
  } catch (err) {
    document.getElementById('auditLoader').classList.add('hidden');
    showAuditError(err.message);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showAuditError("Browser location access is not supported here. Please type a city or locality.");
    return;
  }
  hideAuditError();
  document.getElementById('auditEmptyState').classList.add('hidden');
  document.getElementById('auditLoader').classList.remove('hidden');
  document.getElementById('auditResult').classList.add('hidden');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let label = `${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`;
      try {
        const rev = await fetch(`/api/reverse-geocode?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`);
        if (rev.ok) {
          const d = await rev.json();
          label = d.display_name.split(',').slice(0, 2).join(', ') || label;
        }
      } catch (_) {}
      document.getElementById('cityInput').value = label;
      await runAnalysis(lat, lng, label);
    },
    () => {
      document.getElementById('auditLoader').classList.add('hidden');
      showAuditError("Location permission was blocked or unavailable. Type a city or locality instead.");
    }
  );
}

async function runAnalysis(lat, lng, placeName, saveHistory = true) {
  hideAuditError();
  document.getElementById('auditEmptyState').classList.add('hidden');
  document.getElementById('auditLoader').classList.remove('hidden');
  document.getElementById('auditResult').classList.add('hidden');

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lng,
        place_name: placeName,
        plot_area_sqm: getPlotAreaSqm(),
        purpose: document.getElementById('purposeSelect').value
      })
    });
    if (!res.ok) throw new Error("Unable to fetch terrain telemetry right now.");
    const data = await res.json();
    currentData = data;

    focusGlobeOnLocation(data.coordinates.lat, data.coordinates.lng, 2.55);
    const statePill = document.getElementById('stateFocusPill');
    statePill.innerText = `State: ${data.state_focus.region}`;
    statePill.classList.remove('hidden');

    document.getElementById('resLocation').innerText = data.location_name;
    document.getElementById('resCoords').innerText = `${data.coordinates.lat}° N, ${data.coordinates.lng}° E`;
    document.getElementById('resMetaTag').innerText = `${data.purpose} • ${data.plot_area_sqm} m²`;

    const scoreEl = document.getElementById('resScore');
    const badgeEl = document.getElementById('resBadge');
    scoreEl.innerText = data.kalpa_score;
    badgeEl.innerText = data.status;

    if (data.tone === 'emerald') {
      scoreEl.className = "text-5xl font-bold tabular-nums text-emerald-400";
      badgeEl.className = "px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300";
    } else if (data.tone === 'amber') {
      scoreEl.className = "text-5xl font-bold tabular-nums text-amber-400";
      badgeEl.className = "px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300";
    } else {
      scoreEl.className = "text-5xl font-bold tabular-nums text-rose-400";
      badgeEl.className = "px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300";
    }

    const m = data.metrics;
    document.getElementById('resElev').innerText = `${m.elevation_asl} (${m.relative_elevation} • Slope ${m.slope})`;
    document.getElementById('resDrainage').innerText = m.drainage_status;
    document.getElementById('resRain').innerText = m.rainwater_yield;
    document.getElementById('resSolar').innerText = `${m.solar_yield} • 7d Rain: ${m.rain_7d}`;
    document.getElementById('resLulc').innerText = m.historical_lulc;
    document.getElementById('resGw').innerText = m.groundwater;
    document.getElementById('resSoil').innerText = `Soil: ${m.soil}`;

    const hz = data.hazards;
    document.getElementById('hazardList').innerHTML = `
      <div class="flex justify-between gap-3">
        <div><span class="font-semibold text-white">Flood &amp; Waterlogging:</span> <span class="text-slate-300">${hz.flood.detail}</span></div>
        <span class="shrink-0 px-2 py-0.5 rounded bg-white/10 text-white font-semibold h-fit">${hz.flood.level}</span>
      </div>
      <div class="flex justify-between gap-3">
        <div><span class="font-semibold text-white">Landslide &amp; Slope:</span> <span class="text-slate-300">${hz.landslide.detail}</span></div>
        <span class="shrink-0 px-2 py-0.5 rounded bg-white/10 text-white font-semibold h-fit">${hz.landslide.level}</span>
      </div>
      <div>
        <span class="font-semibold text-white">Regional Zone (${hz.regional.tag}):</span>
        <span class="text-slate-300">${hz.regional.detail}</span>
      </div>
    `;

    document.getElementById('plinthUnprepared').innerText = data.plinth_comparison.unprepared;
    selectScenario('engineered');

    document.getElementById('marketFactsList').innerHTML = data.market_facts.map((f, i) => `
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <p class="font-semibold text-white">${i + 1}. ${f.title}</p>
        <p class="text-slate-400 mt-1 leading-relaxed">${f.detail}</p>
      </div>
    `).join('');

    verdicts = { en: data.verdict_en, hi: data.verdict_hi };
    switchVerdict('en');

    document.getElementById('resChecklist').innerHTML = data.checklist
      .map(step => `<li>${step}</li>`)
      .join('');

    lastAuditSummary = `Kalpa Terrain Audit — ${data.location_name} (${data.coordinates.lat}°N, ${data.coordinates.lng}°E)\nScore: ${data.kalpa_score}/100 (${data.status})\nElevation: ${m.elevation_asl} (${m.relative_elevation}) | ${m.drainage_status}\nAdvisory: ${data.verdict_en}`;

    switchReportTab('overview');
    document.getElementById('auditResult').classList.remove('hidden');
    updateMapPreview(data.coordinates.lat, data.coordinates.lng, data.location_name);

    if (saveHistory) {
      addToHistory({
        label: data.location_name,
        lat: data.coordinates.lat,
        lng: data.coordinates.lng,
        score: data.kalpa_score
      });
    }
  } catch (err) {
    showAuditError(err.message);
  } finally {
    document.getElementById('auditLoader').classList.add('hidden');
  }
}