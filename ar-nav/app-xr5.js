let scene, camera, renderer;
let currentPosition = { lat: -18.8792, lon: 47.5079 }; // Antananarivo par défaut
let destination = null;
let navigationArrows = [];

// ====================== INIT ======================
async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lumière
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2));

  // Bouton AR officiel (recommandé)
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay']
  });
  document.body.appendChild(arButton);

  renderer.setAnimationLoop(animate);

  // Attacher les boutons UI
  setupUI();

  // Position GPS
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      document.getElementById('status').innerHTML = `📍 Position acquise`;
    }, () => {
      document.getElementById('status').innerHTML = `📍 Position par défaut (Antananarivo)`;
    });
  }
}

function animate() {
  renderer.render(scene, camera);
}

// ====================== FLÈCHES ======================
function createArrow() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3, 16),
    new THREE.MeshPhongMaterial({ color: 0xffdd00 })
  );
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.2, 16),
    new THREE.MeshPhongMaterial({ color: 0xffdd00 })
  );
  head.rotation.x = Math.PI / 2;
  head.position.z = 2.1;
  group.add(head);

  return group;
}

function updateNavigation() {
  if (!destination) return;

  const bearing = calculateBearing(currentPosition.lat, currentPosition.lon, destination.lat, destination.lon);
  const angleRad = (bearing * Math.PI) / 180;

  // Nettoyer anciennes flèches
  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];

  for (let i = 1; i <= 6; i++) {
    const arrow = createArrow();
    arrow.rotation.y = angleRad;
    arrow.position.set(
      Math.sin(angleRad) * 2,
      0.2,
      -i * 6
    );
    scene.add(arrow);
    navigationArrows.push(arrow);
  }

  document.getElementById('status').innerHTML = `→ Direction ${bearing.toFixed(0)}°`;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const λ1 = lon1 * Math.PI / 180;
  const λ2 = lon2 * Math.PI / 180;
  const y = Math.sin(λ2-λ1) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// ====================== UI ======================
function setupUI() {
  const ui = document.getElementById('ui');

  // Bouton Charger Bâtiments
  const btnOSM = document.createElement('button');
  btnOSM.textContent = '🏢 Charger Bâtiments OSM';
  btnOSM.onclick = loadOSMBuildings;
  ui.appendChild(btnOSM);

  // Bouton Destination
  const btnDest = document.createElement('button');
  btnDest.textContent = '🎯 Définir Destination';
  btnDest.onclick = setDestination;
  ui.appendChild(btnDest);

  // Effacer flèches
  const btnClear = document.createElement('button');
  btnClear.textContent = '🗑️ Effacer Flèches';
  btnClear.onclick = () => {
    navigationArrows.forEach(a => scene.remove(a));
    navigationArrows = [];
  };
  ui.appendChild(btnClear);
}

// ====================== OSM (simplifié) ======================
async function loadOSMBuildings() {
  document.getElementById('status').textContent = "Chargement OSM...";
  // À compléter avec ton code précédent de chargement Overpass + extrude
  // Pour le moment on met juste un message
  setTimeout(() => {
    document.getElementById('status').innerHTML += "<br>✅ Bâtiments chargés (simulation)";
  }, 800);
}

function setDestination() {
  const lat = parseFloat(prompt("Latitude destination :", currentPosition.lat + 0.002));
  const lon = parseFloat(prompt("Longitude destination :", currentPosition.lon + 0.002));
  
  if (lat && lon) {
    destination = { lat, lon };
    updateNavigation();
  }
}

// ====================== LANCEMENT ======================
window.onload = init;