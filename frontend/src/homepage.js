// 3D Scene Setup
let scene, camera, renderer, controls;
let greyModel, texturedModel;
let currentModel = 0; // 0 = grey, 1 = textured
let isTransitioning = false;
let lastInteraction = 0;
let autoRotateTimeout;

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Timing constants
const DISPLAY_TIME = 3000; // 3 seconds
const TRANSITION_TIME = 1000; // 1 second

function init3D() {
    const container = document.getElementById('hero3d');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera positioned lower and angled for depth
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(6, 1.5, 8); // Lower Y position for ground level view
    camera.lookAt(0, 1, 0); // Look at the model center
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0a0a0a, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Controls
    setupControls();
    
    // Create static grid (no spinning)
    createStaticGrid();
    
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
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false; // Disable auto-rotate to stop grid spinning
        controls.autoRotateSpeed = 0;
        controls.target.set(0, 1, 0); // Focus on model center
        controls.minPolarAngle = Math.PI * 0.2; // Limit top view
        controls.maxPolarAngle = Math.PI * 0.7; // Limit bottom view
        
        // Track user interaction
        controls.addEventListener('start', onControlsStart);
        controls.addEventListener('end', onControlsEnd);
    }
}

function onControlsStart() {
    lastInteraction = Date.now();
    // No auto-rotate to disable since it's turned off
}

function onControlsEnd() {
    lastInteraction = Date.now();
    // No auto-rotate to resume since it's turned off
}

function createStaticGrid() {
    // Create a perspective grid that extends into the distance
    const gridSize = 50;
    const gridDivisions = 50;
    
    // Create the main perspective grid
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00bcd4, 0x333333);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    gridHelper.position.y = -0.5;
    
    // Create a custom shader material for better perspective fade effect
    const gridMaterial = new THREE.ShaderMaterial({
        uniforms: {
            fogColor: { value: new THREE.Color(0x0a0a0a) },
            fogNear: { value: 10 },
            fogFar: { value: 40 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 fogColor;
            uniform float fogNear;
            uniform float fogFar;
            varying vec3 vWorldPosition;
            
            void main() {
                float depth = distance(vWorldPosition, cameraPosition);
                float fogFactor = smoothstep(fogNear, fogFar, depth);
                
                vec3 gridColor = vec3(0.0, 0.737, 0.831); // #00bcd4 in RGB
                vec3 finalColor = mix(gridColor, fogColor, fogFactor);
                
                gl_FragColor = vec4(finalColor, 1.0 - fogFactor);
            }
        `,
        transparent: true
    });
    
    // Create grid geometry manually for better control
    const gridGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const halfSize = gridSize / 2;
    const step = gridSize / gridDivisions;
    
    // Vertical lines
    for (let i = 0; i <= gridDivisions; i++) {
        const x = -halfSize + i * step;
        vertices.push(x, 0, -halfSize);
        vertices.push(x, 0, halfSize);
    }
    
    // Horizontal lines
    for (let i = 0; i <= gridDivisions; i++) {
        const z = -halfSize + i * step;
        vertices.push(-halfSize, 0, z);
        vertices.push(halfSize, 0, z);
    }
    
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const perspectiveGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
    perspectiveGrid.position.y = -0.5;
    
    scene.add(perspectiveGrid);
    
    // Add a subtle secondary grid for depth
    const secondaryGrid = new THREE.GridHelper(gridSize * 0.6, gridDivisions * 0.6, 0x00bcd4, 0x00bcd4);
    secondaryGrid.material.opacity = 0.1;
    secondaryGrid.material.transparent = true;
    secondaryGrid.position.y = -0.48;
    scene.add(secondaryGrid);
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Main directional light from above-front
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Fill light from the side
    const fillLight = new THREE.DirectionalLight(0x00bcd4, 0.2);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
    
    // Rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(-2, 3, -5);
    scene.add(rimLight);
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
    
    // Rotate models slowly in OPPOSITE direction (counter-clockwise)
    if (greyModel) {
        greyModel.rotation.y -= 0.003; // Much slower rotation
    }
    if (texturedModel) {
        texturedModel.rotation.y -= 0.003; // Much slower rotation
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('hero3d');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Asset Management Functions
async function loadAssetsFromAPI() {
    try {
        console.log('🔄 Loading assets from API...');
        const response = await fetch(`${API_BASE_URL}/assets?limit=8&sortBy=popularity&sortOrder=desc`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Assets loaded:', data.assets?.length || 0);
        return data.assets || [];
    } catch (error) {
        console.error('❌ Error loading assets:', error);
        return [];
    }
}

// Replace your createAssetCard function in homepage.js with this:
function createAssetCard(asset) {
    const assetCard = document.createElement('div');
    assetCard.classList.add('asset-card');
    assetCard.setAttribute('data-asset-id', asset._id);
    
    // Use preview image if available, otherwise use icon
    const hasPreviewImage = asset.previewImage && asset.previewImage.url;
    
    if (hasPreviewImage) {
        // Use actual preview image
        assetCard.innerHTML = `
            <div class="asset-preview">
                <img src="${asset.previewImage.url}" alt="${asset.name}" class="asset-preview-img">
            </div>
            <div class="asset-info">
                <div class="asset-icon-small">${asset.icon || '🐕'}</div>
                <h3 class="asset-name">${asset.name}</h3>
                <div class="asset-stats">
                    <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                </div>
            </div>
        `;
    } else {
        // Use emoji icon (fallback)
        assetCard.innerHTML = `
            <div class="asset-icon">${asset.icon || '🐕'}</div>
            <h3 class="asset-name">${asset.name}</h3>
            <div class="asset-stats">
                <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
            </div>
        `;
    }
    
    // Add click handler for asset interaction
    assetCard.addEventListener('click', () => {
        handleAssetClick(asset);
    });
    
    return assetCard;
}

async function handleAssetClick(asset) {
    try {
        // Increment views
        await fetch(`${API_BASE_URL}/assets/${asset._id}`, {
            method: 'GET'
        });
        
        // Show asset details
        showAssetModal(asset);
    } catch (error) {
        console.error('Error handling asset click:', error);
    }
}

function showAssetModal(asset) {
    // Create a simple modal to show asset details
    const modal = document.createElement('div');
    modal.classList.add('asset-modal');
    modal.innerHTML = `
        <div class="asset-modal-content">
            <span class="asset-modal-close">&times;</span>
            <h2>${asset.name}</h2>
            <div class="asset-modal-info">
                <p><strong>Breed:</strong> ${asset.breed}</p>
                <p><strong>File Size:</strong> ${asset.fileSize || 'Unknown'}</p>
                <p><strong>Polygons:</strong> ${asset.polygons?.toLocaleString() || '0'}</p>
                <p><strong>Description:</strong> ${asset.description}</p>
                <div class="asset-tags">
                    ${(asset.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                ${asset.modelFile?.url ? `
                    <div class="asset-actions">
                        <a href="${asset.modelFile.url}" target="_blank" class="download-btn">Download Model</a>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.asset-modal-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

async function renderAssetsSection() {
    const assetsGrid = document.querySelector('.assets-grid');
    
    if (!assetsGrid) {
        console.warn('❌ Assets grid not found in HTML');
        return;
    }
    
    console.log('🔄 Rendering assets section...');
    
    // Show loading state
    assetsGrid.innerHTML = '<div class="loading-assets">Loading your assets...</div>';
    
    try {
        const assets = await loadAssetsFromAPI();
        
        // Clear loading state
        assetsGrid.innerHTML = '';
        
        if (assets.length === 0) {
            assetsGrid.innerHTML = `
                <div class="no-assets">
                    <p>No assets available yet.</p>
                    <p><a href="/manageAssets.html" style="color: #00bcd4;">Create your first asset →</a></p>
                </div>
            `;
            return;
        }
        
        console.log(`✅ Rendering ${assets.length} assets`);
        
        // Create asset cards
        assets.forEach(asset => {
            const assetCard = createAssetCard(asset);
            assetsGrid.appendChild(assetCard);
        });
        
    } catch (error) {
        console.error('❌ Error rendering assets:', error);
        assetsGrid.innerHTML = `
            <div class="error-assets">
                <p>Error loading assets. Please try again later.</p>
                <button onclick="renderAssetsSection()" style="background: #00bcd4; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Homepage initializing...');
    
    // Initialize 3D scene
    init3D();
    
    // Load and render assets
    renderAssetsSection();
    
    console.log('✅ Homepage initialized');
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

// Mobile navigation toggle
function toggleMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.getElementById('mobileNav');
    
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
}