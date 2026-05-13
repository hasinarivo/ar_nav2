let scene, camera, renderer;
let xrSession = null;
let currentPosition = { lat: 0, lon: 0 };
let osmBuildings = [];

// Initialisation Three.js + WebXR
function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 200);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lumière
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Bouton WebXR
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'hit-test'], // hit-test pour ancrage au sol
    optionalFeatures: ['dom-overlay']
  });
  document.getElementById('startAR').replaceWith(arButton);

  renderer.setAnimationLoop(animate);
}

// Animation loop
function animate(timestamp, frame) {
  if (renderer.xr.isPresenting) {
    // Mise à jour éventuelle des objets selon la pose
  }
  renderer.render(scene, camera);
}

// Récupération position GPS
async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      resolve(currentPosition);
    }, reject);
  });
}

// Récupérer et créer bâtiments 3D depuis OSM
async function loadOSMBuildings() {
  const status = document.getElementById('status');
  status.textContent = "Chargement OSM...";

  const radius = 100; // mètres
  const query = `[out:json][timeout:15];
    (
      way["building"](${currentPosition.lat-0.001},${currentPosition.lon-0.001},${currentPosition.lat+0.001},${currentPosition.lon+0.001});
    );
    out geom;`;

  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    osmBuildings = [];
    scene.clear(); // Supprimer anciens objets (garder lumières)

    data.elements.forEach(building => {
      if (!building.geometry) return;

      const points = building.geometry.map(p => 
        projectLatLonToLocal(p.lat, p.lon, currentPosition.lat, currentPosition.lon)
      );

      const shape = new THREE.Shape(points);
      const extrudeSettings = { depth: building.tags?.height ? parseFloat(building.tags.height) * 0.3 : 8, bevelEnabled: false };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x4488ff, 
        transparent: true, 
        opacity: 0.85,
        side: THREE.DoubleSide 
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0; // ancré au sol
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      scene.add(mesh);
      osmBuildings.push(mesh);
    });

    status.textContent = `${osmBuildings.length} bâtiments chargés en 3D`;
    console.log("Bâtiments OSM projetés en AR");
  } catch (e) {
    status.textContent = "Erreur OSM";
    console.error(e);
  }
}

// Projection simple : Mercator approximative (suffisante pour <200m)
function projectLatLonToLocal(lat, lon, refLat, refLon) {
  const scale = 111300; // mètres par degré
  const x = (lon - refLon) * scale * Math.cos(refLat * Math.PI / 180);
  const z = (refLat - lat) * scale;   // Z inversé selon convention Three.js
  return new THREE.Vector2(x, z);
}

// Gestion session WebXR
renderer.xr.addEventListener('sessionstart', () => {
  console.log("WebXR AR Session démarrée");
  document.getElementById('status').textContent = "AR active - Déplacez-vous";
});

renderer.xr.addEventListener('sessionend', () => {
  console.log("Session terminée");
});

// Redimensionnement
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Boutons
document.getElementById('fetchOSM').addEventListener('click', async () => {
  if (!currentPosition.lat) {
    await getCurrentPosition();
  }
  await loadOSMBuildings();
});

// Démarrage
window.onload = () => {
  initThree();
  getCurrentPosition().then(() => {
    document.getElementById('status').textContent = `Position : ${currentPosition.lat.toFixed(5)}, ${currentPosition.lon.toFixed(5)}`;
  });
};