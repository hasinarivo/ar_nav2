let scene, camera, renderer;

function updateStatus(text) {
  const el = document.getElementById('status');
  if (el) el.innerHTML = text;
  console.log(text);
}

async function init() {
  try {
    updateStatus("Création de la scène...");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 300);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8888ff, 1.2));

    updateStatus("Création du bouton AR...");

    if (typeof ARButton === "undefined") {
      updateStatus("❌ ARButton non chargé");
      return;
    }

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['local-floor', 'hit-test'],
      optionalFeatures: ['dom-overlay']
    });

    arButton.style.position = 'absolute';
    arButton.style.bottom = '40px';
    arButton.style.left = '50%';
    arButton.style.transform = 'translateX(-50%)';
    arButton.style.zIndex = '1000';
    arButton.style.padding = '16px 40px';
    arButton.style.fontSize = '1.3em';

    document.body.appendChild(arButton);

    updateStatus("✅ Prêt ! Appuie sur le bouton <strong>Enter AR</strong> en bas");

    renderer.setAnimationLoop(() => renderer.render(scene, camera));

  } catch (error) {
    console.error(error);
    updateStatus("❌ Erreur : " + error.message);
  }
}

window.onload = () => {
  updateStatus("Initialisation...");
  init();
};