// 3D Scene Setup
let scene, camera, renderer, controls;
let greyModel, texturedModel;
let currentModel = 0; // 0 = grey, 1 = textured
let isTransitioning = false;
let lastInteraction = 0;
let autoRotateTimeout;

// Timing constants
const DISPLAY_TIME = 3000; // 3 seconds
const TRANSITION_TIME = 1000; // 1 second

function init3D() {
    const container = document.getElementById('hero3d');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 2, 4);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a0a, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Controls
    setupControls();
    
    // Grid (faint)
    createGrid();
    
    // Create dog models
    createDogModels();
    
    // Lighting
    setupLighting();
    
    // Start the model transition cycle
    startModelCycle();
    
    // Animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function setupControls() {
    // Note: You'll need to include OrbitControls in your HTML
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    // <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        
        // Track user interaction
        controls.addEventListener('start', onControlsStart);
        controls.addEventListener('end', onControlsEnd);
    }
}

function onControlsStart() {
    lastInteraction = Date.now();
    if (controls) {
        controls.autoRotate = false;
    }
}

function onControlsEnd() {
    lastInteraction = Date.now();
    // Resume auto-rotation after 2 seconds of inactivity
    clearTimeout(autoRotateTimeout);
    autoRotateTimeout = setTimeout(() => {
        if (controls) {
            controls.autoRotate = true;
        }
    }, 2000);
}

function createGrid() {
    const gridHelper = new THREE.GridHelper(10, 20, 0x333333, 0x333333);
    gridHelper.material.opacity = 0;
    gridHelper.material.transparent = true;
    gridHelper.position.y = -2;
    scene.add(gridHelper);
}

function createDogModels() {
    // Create a simple dog-like shape for demonstration
    // Replace this with your actual model loading code
    
    // Grey wireframe model
    greyModel = createDogGeometry();
    greyModel.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshLambertMaterial({ 
                color: 0x808080,
                transparent: true,
                opacity: 0
            });
            
            // Add wireframe overlay
            const wireframeGeometry = child.geometry.clone();
            const wireframeMaterial = new THREE.WireframeGeometry(wireframeGeometry);
            const wireframe = new THREE.LineSegments(wireframeMaterial, new THREE.LineBasicMaterial({ 
                color: 0x00bcd4,
                transparent: true,
                opacity: 0
            }));
            child.add(wireframe);
        }
    });
    scene.add(greyModel);
    
    // Textured model (for now, using a different color to simulate texture)
    texturedModel = createDogGeometry();
    texturedModel.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshLambertMaterial({ 
                color: 0x8B4513, // Brown color to simulate dog texture
                transparent: true,
                opacity: 0
            });
        }
    });
    scene.add(texturedModel);
    
    // Show first model
    showModel(greyModel);
}

function createDogGeometry() {
    // Create a simple dog-like shape using basic geometries
    const group = new THREE.Group();
    
    // Body (ellipsoid)
    const bodyGeometry = new THREE.SphereGeometry(1.2, 32, 24);
    bodyGeometry.scale(1.5, 0.8, 0.9);
    const body = new THREE.Mesh(bodyGeometry);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.7, 24, 20);
    const head = new THREE.Mesh(headGeometry);
    head.position.set(1.8, 0.3, 0);
    head.castShadow = true;
    group.add(head);
    
    // Snout
    const snoutGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 16);
    snoutGeometry.rotateZ(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeometry);
    snout.position.set(2.3, 0.1, 0);
    snout.castShadow = true;
    group.add(snout);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.3, 0.6, 12);
    
    const leftEar = new THREE.Mesh(earGeometry);
    leftEar.position.set(1.5, 0.8, -0.3);
    leftEar.rotation.z = -0.3;
    leftEar.castShadow = true;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry);
    rightEar.position.set(1.5, 0.8, 0.3);
    rightEar.rotation.z = 0.3;
    rightEar.castShadow = true;
    group.add(rightEar);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    
    // Front legs
    const frontLeg1 = new THREE.Mesh(legGeometry);
    frontLeg1.position.set(0.8, -1, -0.4);
    frontLeg1.castShadow = true;
    group.add(frontLeg1);
    
    const frontLeg2 = new THREE.Mesh(legGeometry);
    frontLeg2.position.set(0.8, -1, 0.4);
    frontLeg2.castShadow = true;
    group.add(frontLeg2);
    
    // Back legs
    const backLeg1 = new THREE.Mesh(legGeometry);
    backLeg1.position.set(-0.8, -1, -0.4);
    backLeg1.castShadow = true;
    group.add(backLeg1);
    
    const backLeg2 = new THREE.Mesh(legGeometry);
    backLeg2.position.set(-0.8, -1, 0.4);
    backLeg2.castShadow = true;
    group.add(backLeg2);
    
    // Tail
    const tailGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1, 12);
    tailGeometry.rotateZ(-Math.PI / 4);
    const tail = new THREE.Mesh(tailGeometry);
    tail.position.set(-1.8, 0.5, 0);
    tail.castShadow = true;
    group.add(tail);
    
    return group;
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x00bcd4, 0.3);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
}

function showModel(model) {
    model.traverse((child) => {
        if (child.isMesh) {
            child.material.opacity = 1;
            // Show wireframe if it exists
            if (child.children.length > 0) {
                child.children.forEach(wireframe => {
                    if (wireframe.material) {
                        wireframe.material.opacity = 0.8;
                    }
                });
            }
        }
    });
}

function hideModel(model) {
    model.traverse((child) => {
        if (child.isMesh) {
            child.material.opacity = 0;
            // Hide wireframe if it exists
            if (child.children.length > 0) {
                child.children.forEach(wireframe => {
                    if (wireframe.material) {
                        wireframe.material.opacity = 0;
                    }
                });
            }
        }
    });
}

function transitionModels() {
    if (isTransitioning) return;
    
    isTransitioning = true;
    const fromModel = currentModel === 0 ? greyModel : texturedModel;
    const toModel = currentModel === 0 ? texturedModel : greyModel;
    
    // Fade out current model
    const fadeOut = { opacity: 1 };
    const fadeOutTween = new TWEEN.Tween(fadeOut)
        .to({ opacity: 0 }, TRANSITION_TIME / 2)
        .onUpdate(() => {
            fromModel.traverse((child) => {
                if (child.isMesh) {
                    child.material.opacity = fadeOut.opacity;
                    if (child.children.length > 0) {
                        child.children.forEach(wireframe => {
                            if (wireframe.material) {
                                wireframe.material.opacity = fadeOut.opacity * 0.8;
                            }
                        });
                    }
                }
            });
        })
        .onComplete(() => {
            // Start fade in
            const fadeIn = { opacity: 0 };
            const fadeInTween = new TWEEN.Tween(fadeIn)
                .to({ opacity: 1 }, TRANSITION_TIME / 2)
                .onUpdate(() => {
                    toModel.traverse((child) => {
                        if (child.isMesh) {
                            child.material.opacity = fadeIn.opacity;
                            if (child.children.length > 0) {
                                child.children.forEach(wireframe => {
                                    if (wireframe.material) {
                                        wireframe.material.opacity = fadeIn.opacity * 0.8;
                                    }
                                });
                            }
                        }
                    });
                })
                .onComplete(() => {
                    isTransitioning = false;
                    currentModel = 1 - currentModel; // Toggle between 0 and 1
                });
            fadeInTween.start();
        });
    fadeOutTween.start();
}

function startModelCycle() {
    setInterval(() => {
        if (!isTransitioning) {
            transitionModels();
        }
    }, DISPLAY_TIME);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update TWEEN if available
    if (typeof TWEEN !== 'undefined') {
        TWEEN.update();
    }
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Rotate models
    if (greyModel) {
        greyModel.rotation.y += 0.01;
    }
    if (texturedModel) {
        texturedModel.rotation.y += 0.01;
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('hero3d');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Initialize 3D scene when page loads
document.addEventListener('DOMContentLoaded', function() {
    init3D();
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});