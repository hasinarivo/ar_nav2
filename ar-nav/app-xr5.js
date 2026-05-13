let scene, camera, renderer;
let currentPosition = { lat: -18.8792, lon: 47.5079 }; // Antananarivo
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

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2));

  // === CRÉATION DU BOUTON AR ===
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay']
  });
  
  arButton.style.position = 'absolute';
  arButton.style.bottom = '20px';
  arButton.style.left = '50%';
  arButton.style.transform = 'translateX(-50%)';
  arButton.style.zIndex = '1000';
  arButton.style.padding = '15px 30px';
  arButton.style.fontSize = '1.2em';
  
  document.body.appendChild(arButton);

  renderer.setAnimationLoop(animate);

  setupUI();

  // Position GPS
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      updateStatus(`📍 Position acquise (${currentPosition.lat.toFixed(4)})`);
    }, () => updateStatus("📍 Position par défaut"));
  } else {
    updateStatus("📍 Géolocalisation non supportée");
  }
}

function animate() {
  renderer.render(scene, camera);
}

function updateStatus(text) {
  document.getElementById('status').innerHTML = text;
}

// ====================== FLÈCHES & NAVIGATION (simplifiées) ======================
function createArrow() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 16), 
    new THREE.MeshPhongMaterial({ color: 0xffdd00 }));
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.3, 16), 
    new THREE.MeshPhongMaterial({ color: 0xffdd00 }));
  head.rotation.x = Math.PI / 2;
  head.position.z = 2.2;
  group.add(head);

  return group;
}

function updateNavigation() {
  if (!destination) return;
  const bearing = calculateBearing(currentPosition.lat, currentPosition.lon, destination.lat, destination.lon);
  const angleRad = bearing * Math.PI / 180;

  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];

  for (let i = 1; i <= 5; i++) {
    const arrow = createArrow();
    arrow.rotation.y = angleRad;
    arrow.position.set(Math.sin(angleRad) * 1.5, 0.3, -i * 7);
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

// ====================== UI ======================
function setupUI() {
  const ui = document.getElementById('ui');

  const buttons = [
    { text: '🏢 Charger Bâtiments OSM', action: loadOSMBuildings },
    { text: '🎯 Définir Destination', action: setDestination },
    { text: '🗑️ Effacer Flèches', action: clearArrows }
  ];

  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.textContent = btn.text;
    b.onclick = btn.action;
    ui.appendChild(b);
  });
}

async function loadOSMBuildings() {
  updateStatus("Chargement des bâtiments OSM...");
  // TODO: Ajouter le vrai code Overpass ici plus tard
  setTimeout(() => updateStatus("✅ Bâtiments chargés (simulation)"), 1000);
}

function setDestination() {
  const lat = parseFloat(prompt("Latitude de destination :", currentPosition.lat + 0.003));
  const lon = parseFloat(prompt("Longitude de destination :", currentPosition.lon + 0.003));
  if (!isNaN(lat) && !isNaN(lon)) {
    destination = { lat, lon };
    updateNavigation();
  }
}

function clearArrows() {
  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];
  updateStatus("Flèches effacées");
}

// ====================== LANCEMENT ======================
window.onload = init;