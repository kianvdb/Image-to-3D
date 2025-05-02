// Declareer variabelen voor de 3D-scène
let scene, camera, renderer, model;

// Initialiseer de 3D-scene
const init3DScene = () => {
  // Set up de scene, camera, en renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('3dCanvas').appendChild(renderer.domElement);

  // Voeg een grid toe aan de scene en zet het onder het model
  const gridHelper = new THREE.GridHelper(10, 10);
  gridHelper.position.y = -1;  // Zet het grid 1 eenheid onder het model
  scene.add(gridHelper);

  // Voeg verlichting toe aan de scene met lagere intensiteit
  const light = new THREE.DirectionalLight(0xffffff, 0.5);  // Verlaag de intensiteit
  light.position.set(10, 10, 10);  // Zet de lichtbron op een geschikte positie
  scene.add(light);

  // Voeg ambient light toe voor zachte verlichting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);  // Zachte verlichting
  scene.add(ambientLight);

  // Zet de camera op een geschikte positie
  camera.position.z = 5;
};

// Laad een GLB-model in de scene
const loadGLBModel = (url) => {
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    model = gltf.scene;
    scene.add(model);
    animate();
  });
};

// Laad het model nadat het via de backend is opgehaald
const loadModelFromBackend = async (taskId) => {
  try {
    // Verkrijg het model-bestand als een Blob via de proxy
    const blob = await fetchModelBlob(taskId);
    
    // Zet de Blob om naar een URL die we kunnen gebruiken in de loader
    const url = URL.createObjectURL(blob);
    
    // Laad het model in de Three.js scène
    loadGLBModel(url);
  } catch (error) {
    console.error("Fout bij het laden van model via backend:", error);
  }
};

// Start de animatie van het model
const animate = () => {
  requestAnimationFrame(animate);
  if (model) {
    model.rotation.x += 0.01;  // Rotate het model om de x-as
    model.rotation.y += 0.01;  // Rotate het model om de y-as
  }
  renderer.render(scene, camera);
};

// Initialiseer de 3D-scene
init3DScene();

// Wacht tot de taskId beschikbaar is en laad het model
const taskId = 'je_task_id_hier';  // Vervang dit met de werkelijke taskId
loadModelFromBackend(taskId);
