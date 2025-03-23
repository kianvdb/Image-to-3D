let scene, camera, renderer, model;

const init3DScene = () => {
  // Set up the scene, camera, and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('3dCanvas').appendChild(renderer.domElement);

  // Add a simple grid to the scene
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  camera.position.z = 5;
};

const loadGLBModel = (url) => {
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    model = gltf.scene;
    scene.add(model);
    animate();
  });
};

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
