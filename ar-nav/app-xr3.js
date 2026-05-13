let scene, camera, renderer;
let currentPosition = { lat: 48.8566, lon: 2.3522 }; // Paris par défaut
let destination = null;
let navigationArrows = [];
let osmBuildings = [];

// ====================== INITIALISATION ======================
function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2);
  scene.add(light);

  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay']
  });
  document.getElementById('startAR').replaceWith(arButton);

  renderer.setAnimationLoop(animate);
}

function animate() {
  renderer.render(scene, camera);
}

// ====================== FLÈCHES DE NAVIGATION ======================
function createArrow() {
  const group = new THREE.Group();

  // Corps de la flèche (cylindre)
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 2.5, 16),
    new THREE.MeshPhongMaterial({ color: 0xffee00 })
  );
  cylinder.rotation.x = Math.PI / 2;
  group.add(cylinder);

  // Pointe de la flèche (cone)
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.2, 16),
    new THREE.MeshPhongMaterial({ color: 0xffee00 })
  );
  cone.rotation.x = Math.PI / 2;
  cone.position.z = 1.8;
  group.add(cone);

  group.userData = { type: 'navigationArrow' };
  return group;
}

function addNavigationArrow(directionAngle) {
  const arrow = createArrow();
  
  // Rotation vers la direction (en radians)
  arrow.rotation.y = directionAngle;
  
  // Position légèrement au-dessus du sol
  arrow.position.set(0, 0.3, -3); // 3 mètres devant l'utilisateur
  
  scene.add(arrow);
  navigationArrows.push(arrow);
  
  return arrow;
}

// Mise à jour des flèches selon la direction actuelle
async function updateNavigation() {
  if (!destination) return;

  const bearing = calculateBearing(currentPosition.lat, currentPosition.lon, destination.lat, destination.lon);
  const angleRad = (bearing * Math.PI) / 180;

  // Supprimer anciennes flèches
  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];

  // Créer plusieurs flèches le long du chemin
  for (let i = 1; i <= 5; i++) {
    const arrow = createArrow();
    arrow.rotation.y = angleRad;
    arrow.position.set(
      Math.sin(angleRad) * i * 4,   // écart latéral
      0.3,
      -i * 5                        // distance devant
    );
    scene.add(arrow);
    navigationArrows.push(arrow);
  }

  document.getElementById('status').textContent = `Direction : ${bearing.toFixed(0)}° → Destination`;
}

// Calcul du bearing (azimut) entre deux points GPS
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const λ1 = lon1 * Math.PI / 180;
  const λ2 = lon2 * Math.PI / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// ====================== OSM & POSITION ======================
async function getCurrentPosition() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      };
      resolve(currentPosition);
    }, () => resolve(currentPosition)); // fallback
  });
}

async function loadOSMBuildings() { /* ... même code que précédemment ... */ 
  // (Je peux le remettre complet si besoin)
}

function projectLatLonToLocal(lat, lon, refLat, refLon) { /* ... même fonction ... */ }

// ====================== BOUTONS ======================
document.getElementById('fetchOSM').addEventListener('click', async () => {
  await getCurrentPosition();
  await loadOSMBuildings();
});

document.getElementById('setDestination').addEventListener('click', async () => {
  const destLat = parseFloat(prompt("Latitude destination :", "48.8606"));
  const destLon = parseFloat(prompt("Longitude destination :", "2.3376"));

  if (destLat && destLon) {
    destination = { lat: destLat, lon: destLon };
    document.getElementById('status').textContent = "Destination définie !";
    updateNavigation();
  }
});

document.getElementById('clearArrows').addEventListener('click', () => {
  navigationArrows.forEach(a => scene.remove(a));
  navigationArrows = [];
});

// Mise à jour GPS périodique
setInterval(async () => {
  if (renderer.xr.isPresenting && destination) {
    await getCurrentPosition();
    updateNavigation();
  }
}, 5000);

// ====================== DÉMARRAGE ======================
window.onload = () => {
  initThree();
  getCurrentPosition().then(pos => {
    document.getElementById('status').textContent = `Position : ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`;
  });
};