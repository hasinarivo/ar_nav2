let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let cvReady = false;
let currentLines = []; // segments détectés dans la caméra
let osmBuildings = []; // données OSM

// Initialisation caméra
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment", width: 1280, height: 720 } 
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setInterval(processFrame, 200); // ~5 FPS pour perf
    };
  } catch (e) { alert("Erreur caméra : " + e); }
}

// Chargement OpenCV.js
function waitForCV() {
  if (typeof cv !== 'undefined' && cv.getBuildInformation) {
    cvReady = true;
    console.log("OpenCV.js prêt");
  } else {
    setTimeout(waitForCV, 300);
  }
}

// Détection de lignes (approximation DeepLSD)
function detectLines(src) {
  let gray = new cv.Mat();
  let edges = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edges, 50, 150, 3, false);
  
  // LSD (Line Segment Detector) si disponible, sinon Hough
  let lines = new cv.Mat();
  cv.HoughLinesP(edges, lines, 1, Math.PI/180, 50, 30, 10);
  
  let segments = [];
  for (let i = 0; i < lines.rows; i++) {
    let [x1, y1, x2, y2] = lines.data32S.slice(i*4, i*4+4);
    segments.push({x1, y1, x2, y2, length: Math.hypot(x2-x1, y2-y1)});
  }
  
  gray.delete(); edges.delete(); lines.delete();
  return segments;
}

// Dessin overlay
function drawLines(segments) {
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 3;
  segments.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  });
}

// Récupération bâtiments OSM (Overpass API)
async function fetchOSMBuildings(lat, lon, radius = 50) {
  const query = `
    [out:json][timeout:10];
    (
      way["building"](around:${radius},${lat},${lon});
    );
    out geom;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    osmBuildings = data.elements.map(el => {
      // Calcul bounding box + estimation façade principale
      let points = el.geometry || [];
      return {
        id: el.id,
        points: points,
        // Estimation simple d'une façade (à améliorer avec orientation)
        facadeLength: estimateFacadeLength(points)
      };
    });
    console.log(`${osmBuildings.length} bâtiments OSM chargés`);
  } catch (e) { console.error(e); }
}

function estimateFacadeLength(geom) {
  if (geom.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < geom.length; i++) {
    for (let j = i+1; j < geom.length; j++) {
      let d = Math.hypot(geom[i].lon - geom[j].lon, geom[i].lat - geom[j].lat) * 111000; // mètres approx
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

// Comparaison simple (longueurs + angles)
function compareWithOSM(cameraLines) {
  if (osmBuildings.length === 0 || cameraLines.length === 0) return 0;
  
  // Exemple très simplifié : moyenne des longueurs des plus grandes lignes
  let camLengths = cameraLines.map(l => l.length).sort((a,b)=>b-a).slice(0,5);
  let osmLengths = osmBuildings.map(b => b.facadeLength * 10).sort((a,b)=>b-a).slice(0,5); // scaling arbitraire
  
  let score = 0;
  for (let i = 0; i < Math.min(camLengths.length, osmLengths.length); i++) {
    let diff = Math.abs(camLengths[i] - osmLengths[i]) / Math.max(camLengths[i], osmLengths[i]);
    score += (1 - Math.min(diff, 1));
  }
  return Math.round((score / Math.min(camLengths.length, osmLengths.length)) * 100);
}

// Boucle principale
function processFrame() {
  if (!cvReady) return;
  
  let src = cv.imread(video);
  currentLines = detectLines(src);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLines(currentLines);
  
  src.delete();
}

// Bouton comparaison
document.getElementById('capture').addEventListener('click', async () => {
  // Récupérer position (GPS)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      const {latitude, longitude} = pos.coords;
      
      // Mettre à jour carte
      document.getElementById('map-container').style.display = 'block';
      document.getElementById('osm-map').src = 
        `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik`;
      
      await fetchOSMBuildings(latitude, longitude);
      
      let score = compareWithOSM(currentLines);
      document.getElementById('match-score').textContent = `Score de correspondance : ${score}%`;
      
      if (score > 70) {
        alert("Bonne correspondance ! Direction probable détectée.");
      }
    });
  }
});

window.onload = () => {
  waitForCV();
  initCamera();
};