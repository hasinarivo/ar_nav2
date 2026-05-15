let scene, camera, renderer, xrSession = null;
let currentPosition = { lat: -18.8792, lon: 47.5079 };
let destination = null;
let navigationArrows = [];
let osmMeshes = [];
let worldGroup = new THREE.Group(); // Groupe pour ancrer au monde réel

// ====================== INIT ======================
async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene.add(worldGroup);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2));

  createARButton();
  setupUI();
  getCurrentPosition();

  renderer.setAnimationLoop(animate);
}

function animate() {
  renderer.render(scene, camera);
}

// ====================== AR Button ======================
function createARButton() {
  const button = document.createElement('button');
  button.textContent = 'ENTRER EN AR';
  button.style.position = 'absolute';
  button.style.bottom = '40px';
  button.style.left = '50%';
  button.style.transform = 'translateX(-50%)';
  button.style.padding = '18px 40px';
  button.style.fontSize = '1.4em';
  button.style.zIndex = '1000';
  button.style.background = '#0066ff';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '8px';

  button.onclick = async () => {
    try {
      xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'hit-test'],
        optionalFeatures: ['dom-overlay']
      });
      renderer.xr.setSession(xrSession);
      updateStatus('✅ AR Activée - Essayez de bouger lentement');
      button.style.display = 'none';
    } catch (err) {
      alert("Erreur AR: " + err.message);
    }
  };
  document.body.appendChild(button);
}

// ====================== GPS + CARTE OSM ======================
function getCurrentPosition() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      updateStatus(`📍 Position mise à jour`);
    }, null, { enableHighAccuracy: true });
  }
}

// Carte OSM en bas
function addOSMMap() {
  const mapContainer = document.createElement('div');
  mapContainer.style.position = 'absolute';
  mapContainer.style.bottom = '10px';
  mapContainer.style.left = '10px';
  mapContainer.style.width = '280px';
  mapContainer.style.height = '200px';
  mapContainer.style.border = '3px solid white';
  mapContainer.style.borderRadius = '8px';
  mapContainer.style.zIndex = '200';
  mapContainer.style.overflow = 'hidden';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${currentPosition.lon-0.008},${currentPosition.lat-0.008},${currentPosition.lon+0.008},${currentPosition.lat+0.008}&layer=mapnik`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  mapContainer.appendChild(iframe);
  document.body.appendChild(mapContainer);

  // Cliquer sur la carte pour définir destination (simulation simple)
  mapContainer.onclick = () => {
    const lat = currentPosition.lat + (Math.random() - 0.5) * 0.003;
    const lon = currentPosition.lon + (Math.random() - 0.5) * 0.003;
    destination = { lat, lon };
    updateNavigation();
    updateStatus('Destination définie via carte !');
  };
}

// ====================== BÂTIMENTS (amélioré) ======================
async function loadOSMBuildings() {
  updateStatus("Chargement bâtiments OSM...");
  const query = `[out:json][timeout:10];way["building"](${currentPosition.lat-0.0015},${currentPosition.lon-0.0015},${currentPosition.lat+0.0015},${currentPosition.lon+0.0015});out geom;`;
  
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    osmMeshes.forEach(m => worldGroup.remove(m));
    osmMeshes = [];

    data.elements.forEach(building => {
      if (!building.geometry || building.geometry.length < 3) return;

      const points = building.geometry.map(p => projectLatLon(p.lat, p.lon));
      const shape = new THREE.Shape(points);
      const extrudeSettings = { depth: 12, bevelEnabled: false };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      const material = new THREE.MeshPhongMaterial({ 
        color: 0x00aaff, 
        transparent: true, 
        opacity: 0.65,
        side: THREE.DoubleSide 
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0;
      worldGroup.add(mesh);
      osmMeshes.push(mesh);
    });

    updateStatus(`✅ ${osmMeshes.length} bâtiments chargés`);
  } catch (e) {
    updateStatus("❌ Erreur chargement OSM");
  }
}

function projectLatLon(lat, lon) {
  const scale = 111300;
  const x = (lon - currentPosition.lon) * scale * Math.cos(currentPosition.lat * Math.PI / 180);
  const z = (currentPosition.lat - lat) * scale;
  return new THREE.Vector2(x * 0.8, z * 0.8); // Ajustement échelle
}

// ====================== FLÈCHES (mises à jour) ======================
function createArrow() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4, 16), new THREE.MeshPhongMaterial({color: 0xffff00}));
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 16), new THREE.MeshPhongMaterial({color: 0xffff00}));
  head.rotation.x = Math.PI / 2;
  head.position.z = 2.6;
  group.add(head);
  return group;
}

function updateNavigation() {
  if (!destination) return;
  const bearing = calculateBearing(currentPosition.lat, currentPosition.lon, destination.lat, destination.lon);
  const angle = bearing * Math.PI / 180;

  navigationArrows.forEach(a => worldGroup.remove(a));
  navigationArrows = [];

  for (let i = 1; i <= 5; i++) {
    const arrow = createArrow();
    arrow.rotation.y = angle;
    arrow.position.set(Math.sin(angle) * 1.5, 0.4, -i * 8);
    worldGroup.add(arrow);
    navigationArrows.push(arrow);
  }
  updateStatus(`→ Direction ${bearing.toFixed(0)}°`);
}

function calculateBearing(lat1, lon1, lat2, lon2) { /* même fonction que précédemment */ 
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const λ1 = lon1 * Math.PI / 180, λ2 = lon2 * Math.PI / 180;
  const y = Math.sin(λ2-λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// ====================== UI ======================
function setupUI() {
  const ui = document.getElementById('ui');
  addOSMMap();

  const btns = [
    { text: '🏢 Charger Bâtiments', fn: loadOSMBuildings },
    { text: '🎯 Définir Destination (aléatoire)', fn: () => {
      destination = { lat: currentPosition.lat + (Math.random()-0.5)*0.004, lon: currentPosition.lon + (Math.random()-0.5)*0.004 };
      updateNavigation();
    }},
    { text: '🗑️ Effacer Tout', fn: () => {
      navigationArrows.forEach(a => worldGroup.remove(a));
      navigationArrows = [];
    }}
  ];

  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    btn.onclick = b.fn;
    ui.appendChild(btn);
  });
}

function updateStatus(text) {
  document.getElementById('status').innerHTML = text;
}

window.onload = init;