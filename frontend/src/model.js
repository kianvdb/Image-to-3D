// Import GLTFLoader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, model;
let modelLoaded = false;

// Initialiseer de 3D-scene
const init3DScene = () => {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('3dCanvas').appendChild(renderer.domElement);

  // Grid
  const gridHelper = new THREE.GridHelper(10, 10);
  gridHelper.position.y = -1;
  scene.add(gridHelper);

  // Licht
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  // Responsive canvas
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};

// Laad een GLB-model in de scene
const loadGLBModel = (url) => {
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      model = gltf.scene;

      // Automatisch centreren
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      scene.add(model);
      animate();

      // Verberg optionele loader/spinner
      const loaderEl = document.getElementById('loading');
      if (loaderEl) loaderEl.style.display = 'none';
    },
    undefined,
    (error) => {
      console.error('Er is een fout opgetreden bij het laden van het model:', error);
    }
  );
};

// Haal model op via backend
const fetchModelBlob = async (taskId) => {
  try {
    const response = await fetch(`/api/proxyModel/${taskId}`);
    if (!response.ok) throw new Error('Fout bij het ophalen van modelbestand');
    return await response.blob();
  } catch (error) {
    console.error('Fout bij het ophalen van model Blob:', error);
    throw error;
  }
};

// Laad model vanaf backend
const loadModelFromBackend = async (taskId) => {
  if (modelLoaded) return;
  modelLoaded = true;

  try {
    const blob = await fetchModelBlob(taskId);
    const url = URL.createObjectURL(blob);
    loadGLBModel(url);
  } catch (error) {
    console.error('Fout bij het laden van model via backend:', error);
  }
};

// Start animatie
const animate = () => {
  requestAnimationFrame(animate);
  if (model) {
    model.rotation.x += 0.01;
    model.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
};

// Poll de status van de task
const checkTaskStatus = async (taskId) => {
  try {
    const response = await fetch(`/api/taskStatus/${taskId}`);
    const statusData = await response.json();

    if (statusData.status === 'SUCCEEDED') {
      loadModelFromBackend(taskId);
    } else if (statusData.status === 'FAILED') {
      console.error('Task is mislukt.');
    } else {
      console.log('Task nog niet klaar. Nieuwe poging binnen 3 seconden...');
      setTimeout(() => checkTaskStatus(taskId), 3000);
    }
  } catch (error) {
    console.error('Fout bij het controleren van de taakstatus:', error);
  }
};

// Export functies voor gebruik in andere scripts
export { init3DScene, checkTaskStatus };
