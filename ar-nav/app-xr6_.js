let scene, camera, renderer;

// ====================== ARButton intégré (copié) ======================
const ARButton = {
  createButton: function (renderer, sessionInit = {}) {
    const button = document.createElement('button');
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
    button.style.cursor = 'pointer';

    function showStartButton() {
      button.textContent = 'ENTRER EN AR';
      button.onclick = () => {
        renderer.xr.startSession('immersive-ar', sessionInit);
      };
    }

    function showARNotSupported() {
      button.textContent = 'AR NON SUPPORTÉ';
      button.disabled = true;
    }

    if (!navigator.xr) {
      showARNotSupported();
      return button;
    }

    navigator.xr.isSessionSupported('immersive-ar').then(supported => {
      if (supported) {
        showStartButton();
      } else {
        showARNotSupported();
      }
    }).catch(() => showARNotSupported());

    return button;
  }
};

// ====================== Le reste de l'application ======================
function updateStatus(text) {
  const el = document.getElementById('status');
  if (el) el.innerHTML = text;
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

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['local-floor', 'hit-test'],
      optionalFeatures: ['dom-overlay']
    });

    document.body.appendChild(arButton);

    updateStatus("✅ Prêt !<br><strong>Appuie sur le bouton bleu ENTRER EN AR</strong>");

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