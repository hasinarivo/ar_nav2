let scene, camera, renderer, xrSession = null;
let currentPosition = { lat: -18.8792, lon: 47.5079 };
let worldGroup = new THREE.Group();
let osmMeshes = [];
let rotationY = 0;      // Calibration rotation
let scaleFactor = 1.0;  // Calibration échelle
let heightOffset = 0;   // Hauteur

async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 500);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene.add(worldGroup);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.4));

  createARButton();
  setupUI();
  getCurrentPosition();

  renderer.setAnimationLoop(animate);
}

function animate() {
  renderer.render(scene, camera);
}

// AR Button
function createARButton() {
  const btn = document.createElement('button');
  btn.textContent = 'ENTRER EN AR';
  btn.style.cssText = 'position:absolute; bottom:40px; left:50%; transform:translateX(-50%); padding:18px 40px; font-size:1.4em; background:#0066ff; color:white; border:none; border-radius:8px; z-index:1000;';
  btn.onclick = async () => {
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor', 'hit-test']
    });
    renderer.xr.setSession(xrSession);
    btn.style.display = 'none';
  };
  document.body.appendChild(btn);
}

// ====================== CALIBRATION ======================
function applyCalibration() {
  worldGroup.rotation.y = rotationY;
  worldGroup.scale.setScalar(scaleFactor);
  worldGroup.position.y = heightOffset;
}

async function loadOSMBuildings() {
  // ... (même code de chargement Overpass que précédemment)
  // Après avoir ajouté les meshes dans worldGroup :
  osmMeshes.forEach(mesh => worldGroup.add(mesh));
  applyCalibration();
  updateStatus(`✅ ${osmMeshes.length} bâtiments - Utilise les boutons de calibration`);
}

// ====================== UI avec Calibration ======================
function setupUI() {
  const ui = document.getElementById('ui');
  addOSMMap();

  // Boutons calibration
  const calibDiv = document.createElement('div');
  calibDiv.innerHTML = `
    <strong>Calibration :</strong><br>
    <button>↻ Rotation +</button>
    <button>↺ Rotation -</button>
    <button>🔍 + Échelle</button>
    <button>🔎 - Échelle</button>
    <button>↑ Hauteur +</button>
    <button>↓ Hauteur -</button>
  `;
  ui.appendChild(calibDiv);

  // Ajoute les listeners
  calibDiv.querySelectorAll('button').forEach((btn, i) => {
    btn.onclick = () => {
      if (i === 0) rotationY += 0.1;
      if (i === 1) rotationY -= 0.1;
      if (i === 2) scaleFactor += 0.1;
      if (i === 3) scaleFactor -= 0.1;
      if (i === 4) heightOffset += 0.5;
      if (i === 5) heightOffset -= 0.5;
      applyCalibration();
    };
  });

  // Autres boutons (Charger bâtiments, etc.)
  const btnLoad = document.createElement('button');
  btnLoad.textContent = '🏢 Charger Bâtiments';
  btnLoad.onclick = loadOSMBuildings;
  ui.appendChild(btnLoad);
}

// Garde les fonctions getCurrentPosition, addOSMMap, projectLatLon, updateStatus...

window.onload = init;