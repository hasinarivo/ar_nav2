let scene, camera, renderer, xrSession = null;
let currentPosition = { lat: -18.8792, lon: 47.5079 }; // Antananarivo
let destination = null;
let navigationArrows = [];
let osmMeshes = [];

// ====================== ARButton + Session ======================
function createARButton(renderer) {
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
    if (!navigator.xr) return alert("WebXR non supporté");

    try {
      xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'hit-test'],
        optionalFeatures: ['dom-overlay']
      });

      renderer.xr.setSession(xrSession);
      document.getElementById('status').innerHTML = '✅ AR Activée !';
      button.style.display = 'none';
    } catch (err) {
      console.error(err);
      alert("Impossible de démarrer AR : " + err.message);
    }
  };

  document.body.appendChild(button);
  return button;
}

// ====================== INIT ======================
async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2));

  createARButton(renderer);
  setupUI();
  getCurrentPosition();

  renderer.setAnimationLoop(animate);
}

function animate() {
  renderer.render(scene, camera);
}

// ====================== GPS ======================
function getCurrentPosition() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      updateStatus(`📍 ${currentPosition.lat.toFixed(4)}, ${currentPosition.lon.toFixed(4)}`);
    });
  }
}

// ====================== FLÈCHES ======================
function createArrow() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.5, 16), 
    new THREE.MeshPhongMaterial({ color: 0xffdd00 }));
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 16), 
    new THREE.MeshPhongMaterial({ color: 0xffdd00 }));
  head.rotation.x = Math.PI / 2;
  head.position.z = 2.3;
  group.add(head);
  return group;
}

function updateNavigation() {
  if (!destination) return;
  const bearing = calculateBearing(currentPosition.lat, currentPosition.lon, destination.lat, destination.lon);
  const angle = bearing * Math.PI / 180;

  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];

  for (let i = 1; i <= 6; i++) {
    const arrow = createArrow();
    arrow.rotation.y = angle;
    arrow.position.set(Math.sin(angle) * 2, 0.3, -i * 6);
    scene.add(arrow);
    navigationArrows.push(arrow);
  }
  updateStatus(`→ Direction ${bearing.toFixed(0)}°`);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const λ1 = lon1 * Math.PI / 180, λ2 = lon2 * Math.PI / 180;
  const y = Math.sin(λ2-λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// ====================== OSM BÂTIMENTS ======================
async function loadOSMBuildings() {
  updateStatus("Chargement bâtiments OSM...");
  // Code simplifié (à améliorer plus tard avec façades)
  const radius = 0.001;
  const query = `[out:json];way["building"](${currentPosition.lat-radius},${currentPosition.lon-radius},${currentPosition.lat+radius},${currentPosition.lon+radius});out geom;`;
  
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    // Supprimer anciens bâtiments
    osmMeshes.forEach(m => scene.remove(m));
    osmMeshes = [];

    data.elements.forEach(building => {
      if (!building.geometry) return;
      const points = building.geometry.map(p => 
        projectLatLon(p.lat, p.lon)
      );
      if (points.length < 3) return;

      const shape = new THREE.Shape(points);
      const extrude = new THREE.ExtrudeGeometry(shape, { depth: 8, bevelEnabled: false });
      const mesh = new THREE.Mesh(extrude, new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.75 }));
      mesh.position.y = 0;
      scene.add(mesh);
      osmMeshes.push(mesh);
    });

    updateStatus(`✅ ${osmMeshes.length} bâtiments chargés`);
  } catch (e) {
    updateStatus("❌ Erreur OSM");
  }
}

function projectLatLon(lat, lon) {
  const scale = 111300;
  const x = (lon - currentPosition.lon) * scale * Math.cos(currentPosition.lat * Math.PI / 180);
  const z = (currentPosition.lat - lat) * scale;
  return new THREE.Vector2(x, z);
}

// ====================== UI ======================
function setupUI() {
  const ui = document.getElementById('ui');

  const buttons = [
    { text: '🏢 Charger Bâtiments', fn: loadOSMBuildings },
    { text: '🎯 Définir Destination', fn: setDestination },
    { text: '🗑️ Effacer Flèches', fn: clearArrows }
  ];

  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    btn.onclick = b.fn;
    ui.appendChild(btn);
  });
}

function setDestination() {
  const lat = parseFloat(prompt("Latitude destination :", currentPosition.lat + 0.002));
  const lon = parseFloat(prompt("Longitude destination :", currentPosition.lon + 0.002));
  if (lat && lon) {
    destination = { lat, lon };
    updateNavigation();
  }
}

function clearArrows() {
  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];
}

// ====================== UTILS ======================
function updateStatus(text) {
  document.getElementById('status').innerHTML = text;
}

window.onload = init;