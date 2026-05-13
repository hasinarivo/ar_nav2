let scene, camera, renderer, xrSession = null;
let currentPosition = { lat: 48.8566, lon: 2.3522 };
let destination = null;
let navigationArrows = [];

// Vérification support WebXR AR
async function checkARSupport() {
  const statusEl = document.getElementById('status');
  
  if (!navigator.xr) {
    statusEl.textContent = "❌ WebXR non supporté par ce navigateur";
    return false;
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    statusEl.textContent = "❌ immersive-ar non supporté (ARCore requis)";
    return false;
  }
  
  statusEl.textContent = "✅ AR supporté - Appuie sur Démarrer AR";
  return true;
}

// ====================== INITIALISATION ======================
function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
  
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true 
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2);
  scene.add(light);

  // Bouton AR officiel
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['local-floor', 'hit-test'],
    optionalFeatures: ['dom-overlay']
  });
  
  // Remplacer l'ancien bouton
  const oldButton = document.getElementById('startAR');
  oldButton.parentNode.replaceChild(arButton, oldButton);

  renderer.setAnimationLoop(animate);
}

function animate() {
  renderer.render(scene, camera);
}

// ====================== FLÈCHES (inchangées) ======================
// ... (copie les fonctions createArrow, addNavigationArrow, updateNavigation, calculateBearing du message précédent)

// ====================== DÉMARRAGE ======================
window.onload = async () => {
  initThree();
  
  // Vérification AR
  await checkARSupport();
  
  // Récupérer position
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      currentPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      document.getElementById('status').textContent += ` | 📍 ${currentPosition.lat.toFixed(4)}`;
    });
  }
};

// Option : Forcer la demande de permission caméra manuellement (fallback)
document.getElementById('startAR').addEventListener('click', async () => {  // si tu gardes ton propre bouton
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    console.log("✅ Permission caméra obtenue via getUserMedia");
    // Tu peux arrêter le stream immédiatement, WebXR le reprendra
    stream.getTracks().forEach(track => track.stop());
  } catch (e) {
    console.warn("getUserMedia non nécessaire pour WebXR, mais utile en debug :", e);
  }
}, { once: true });