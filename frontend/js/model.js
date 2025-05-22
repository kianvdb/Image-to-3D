let scene, camera, renderer, model;

// Initialiseer de 3D-scene
const init3DScene = () => {
  // Set up the scene, camera, and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('3dCanvas').appendChild(renderer.domElement);

  // Voeg een eenvoudig grid toe aan de scene
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

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
    model.rotation.x += 0.01;
    model.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
};

// Initialiseer de 3D-scene
init3DScene();

// Wacht tot de taskId beschikbaar is en laad het model
const taskId = 'je_task_id_hier';  // Vervang dit met de werkelijke taskId
loadModelFromBackend(taskId);
