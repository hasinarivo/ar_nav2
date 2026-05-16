let scene, camera, renderer, xrSession = null;
let currentPosition = { lat: -18.8792, lon: 47.5079 };
let destination = null;
let navigationArrows = [];
let osmMeshes = [];
let worldGroup = new THREE.Group();

// ====================== INIT ======================
async function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 400);
  
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
      updateStatus('✅ AR Activée - Bouge lentement');
      button.style.display = 'none';
    } catch (err) {
      alert("Erreur AR: " + err.message);
    }
  };
  document.body.appendChild(button);
}

// ====================== GPS + Carte ======================
function getCurrentPosition() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    }, null, { enableHighAccuracy: true });
  }
}

function addOSMMap() {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.bottom = '10px';
  container.style.left = '10px';
  container.style.width = '260px';
  container.style.height = '180px';
  container.style.border = '3px solid #fff';
  container.style.borderRadius = '8px';
  container.style.zIndex = '200';
  container.style.overflow = 'hidden';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${currentPosition.lon-0.01},${currentPosition.lat-0.01},${currentPosition.lon+0.01},${currentPosition.lat+0.01}&layer=mapnik`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  container.appendChild(iframe);
  document.body.appendChild(container);
}

// ====================== BÂTIMENTS (Correction principale) ======================
async function loadOSMBuildings() {
  updateStatus("Chargement bâtiments...");
  
  const query = `[out:json];way["building"](${currentPosition.lat-0.001},${currentPosition.lon-0.001},${currentPosition.lat+0.001},${currentPosition.lon+0.001});out geom;`;
  
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    // Nettoyage
    osmMeshes.forEach(m => worldGroup.remove(m));
    osmMeshes = [];

    data.elements.forEach((building, index) => {
      if (!building.geometry || building.geometry.length < 3) return;

      const points = building.geometry.map(p => projectLatLon(p.lat, p.lon));
      const shape = new THREE.Shape(points);
      
      const height = (building.tags && building.tags.height) ? parseFloat(building.tags.height) * 0.4 : 10;
      
      const geometry = new THREE.ExtrudeGeometry(shape, { 
        depth: height, 
        bevelEnabled: false 
      });

      const material = new THREE.MeshPhongMaterial({ 
        color: 0x00aaff, 
        transparent: true, 
        opacity: 0.7,
        side: THREE.DoubleSide 
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.1;           // Légèrement au-dessus du sol
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      worldGroup.add(mesh);
      osmMeshes.push(mesh);
    });

    updateStatus(`✅ ${osmMeshes.length} bâtiments chargés`);
  } catch (e) {
    updateStatus("❌ Erreur OSM");
    console.error(e);
  }
}

function projectLatLon(lat, lon) {
  const scale = 110000; // mètres par degré
  const x = (lon - currentPosition.lon) * scale * Math.cos(currentPosition.lat * Math.PI / 180);
  const z = (currentPosition.lat - lat) * scale;
  return new THREE.Vector2(x * 0.7, z * 0.7); // Réduction d'échelle pour mieux voir près de soi
}

// ====================== UI ======================
function setupUI() {
  const ui = document.getElementById('ui');
  addOSMMap();

  const btns = [
    { text: '🏢 Charger Bâtiments', fn: loadOSMBuildings },
    { text: '🎯 Nouvelle Destination', fn: setRandomDestination },
    { text: '🗑️ Effacer', fn: clearAll }
  ];

  btns.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    btn.onclick = b.fn;
    ui.appendChild(btn);
  });
}

function setRandomDestination() {
  destination = {
    lat: currentPosition.lat + (Math.random() - 0.5) * 0.005,
    lon: currentPosition.lon + (Math.random() - 0.5) * 0.005
  };
  updateNavigation();
}

function clearAll() {
  navigationArrows.forEach(a => worldGroup.remove(a));
  navigationArrows = [];
  // osmMeshes.forEach(m => worldGroup.remove(m)); // optionnel
}

// Flèches + autres fonctions (calculateBearing, updateNavigation, updateStatus) restent les mêmes que précédemment

function updateStatus(text) {
  document.getElementById('status').innerHTML = text;
}

window.onload = init;