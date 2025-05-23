

let scene, camera, renderer, controls, model;
let currentTaskId;
let selectedTopology = 'triangle';
let selectedTexture = null;
let selectedSymmetry = 'auto';
let enablePBR = false;
let selectedPolycount = 30000;
let dogFactOverlay;
let factInterval;
let factIndex = 0;


document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");

    initFlow();
    initScene();
    initDownloadButtons();
    initTopologyButtons();
    initTextureButtons();
    initSymmetryButtons();
    initPolycountInput();

    // ✅ Init selecties
    document.querySelector('.topology-btn[data-topology="triangle"]').classList.add('selected', 'active');
    document.querySelector('.texture-btn[data-texture="true"]').classList.add('selected', 'active');
    selectedTexture = "true"; // synchroon met UI
    document.querySelector('.symmetry-btn[data-symmetry="auto"]').classList.add('selected', 'active');

    // Zet PBR waarde naar false (standaard)
    enablePBR = false;
    document.getElementById("pbrButtons").style.display = "none";

    // Eventlistener voor PBR checkbox
    const pbrCheckbox = document.getElementById("pbrCheckbox");
    pbrCheckbox.addEventListener("change", (e) => {
        enablePBR = e.target.checked;
        console.log(`🔘 Geselecteerde PBR: ${enablePBR}`);
    });

    document.getElementById("generateBtn").addEventListener("click", generateModel);
});

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Get the 3dCanvas element to match its size
    const canvas3d = document.getElementById("3dCanvas");
    const canvasRect = canvas3d.getBoundingClientRect();
    
    // Use the actual canvas dimensions
    const width = canvasRect.width || 600;
    const height = canvasRect.height || 500;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;

    // Store the overlay before clearing
    const dogFactOverlay = document.getElementById("dogFactOverlay");
    
    // Clear only existing canvas elements
    const existingCanvases = canvas3d.querySelectorAll("canvas");
    existingCanvases.forEach(canvas => canvas.remove());
    
    // Add the renderer canvas
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    canvas3d.appendChild(renderer.domElement);
    
    // Ensure overlay stays in place and is properly sized
    if (dogFactOverlay && !canvas3d.contains(dogFactOverlay)) {
        canvas3d.appendChild(dogFactOverlay);
    }

    // Rest of your lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(3, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-3, 5, -2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, 3, -5);
    scene.add(backLight);

    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
    gridHelper.position.y = -0.95;
    scene.add(gridHelper);

    // Orbit controls - use the global THREE.OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function initDownloadButtons() {
    const formats = ['GLB', 'USDZ', 'OBJ', 'FBX'];

    formats.forEach(format => {
        const btn = document.getElementById(`download${format}`);
        if (!btn) return;

        btn.onclick = () => {
            if (!currentTaskId) {
                alert("Geen model taskId beschikbaar.");
                return;
            }

            getModelStatus(currentTaskId).then(res => {
                if (res.status !== "SUCCEEDED") {
                    alert(`Model is nog niet klaar voor download als ${format}.`);
                } else {
                    downloadModel(format.toLowerCase());
                }
            }).catch(err => {
                console.error("❌ Downloadstatusfout:", err);
                alert("Fout bij ophalen van modelstatus.");
            });
        };
    });
}

function initTopologyButtons() {
    const buttons = document.querySelectorAll('.topology-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            selectedTopology = button.dataset.topology;
            console.log(`🔘 Geselecteerde topologie: ${selectedTopology}`);
        });
    });
}

function initTextureButtons() {
    const buttons = document.querySelectorAll('.texture-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            selectedTexture = button.dataset.texture;
            console.log(`🔘 Geselecteerde textuur: ${selectedTexture}`);

            const pbrButtons = document.getElementById("pbrButtons");
            if (selectedTexture === "true") {
                pbrButtons.style.display = "flex";
            } else {
                pbrButtons.style.display = "none";
                const pbrCheckbox = document.getElementById("pbrCheckbox");
                if (pbrCheckbox) {
                    pbrCheckbox.checked = false;
                }
                enablePBR = false;
            }
        });
    });
}

function initSymmetryButtons() {
    const buttons = document.querySelectorAll('.symmetry-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            selectedSymmetry = button.dataset.symmetry;
            console.log(`🔘 Geselecteerde symmetrie: ${selectedSymmetry}`);
        });
    });
}

function initPolycountInput() {
    const polyInput = document.getElementById("polycountInput");
    const polySlider = document.getElementById("polycountSlider");

    if (!polyInput || !polySlider) {
        console.warn("Polycount input of slider niet gevonden.");
        return;
    }

    polyInput.value = selectedPolycount;
    polySlider.value = selectedPolycount;

    polyInput.addEventListener("input", () => {
        const parsed = parseInt(polyInput.value);
        if (!isNaN(parsed) && parsed > 0) {
            selectedPolycount = parsed;
            polySlider.value = selectedPolycount;
            console.log(`🔢 Polycount ingesteld op: ${selectedPolycount}`);
        }
    });

    polySlider.addEventListener("input", () => {
        selectedPolycount = parseInt(polySlider.value);
        polyInput.value = selectedPolycount;
        console.log(`🔢 Polycount ingesteld via slider op: ${selectedPolycount}`);
    });
}

function statusMessage(msg, timeout = 0) {
    return new Promise(resolve => {
        const el = document.getElementById("statusMsg");
        if (el) {
            el.textContent = msg;
        }
        setTimeout(resolve, timeout);
    });
}

function showSpinner(show = true) {
    const spinner = document.getElementById("spinnerContainer");
    if (spinner) {
        spinner.style.display = show ? "flex" : "none";
    }
}

function updateProgress(percent) {
    const progressText = document.getElementById("progressText");
    const progressBar = document.getElementById("progressBar");

    console.log(`🔄 Progress bijgewerkt: ${percent}%`);

    if (progressText) {
        progressText.textContent = `${percent}%`;
    }

    if (progressBar) {
        progressBar.value = percent;
    }
}

function startDogFacts() {
  if (!dogFacts || !dogFacts.length) {
    console.warn("⚠️ dogFacts array is leeg of niet gedefinieerd.");
    return;
  }
  
  // Create the overlay element if it doesn't exist
  let dogFactOverlay = document.getElementById('dogFactOverlay');
  if (!dogFactOverlay) {
    console.log("🐾 dogFactOverlay niet gevonden, wordt aangemaakt...");
    dogFactOverlay = document.createElement('div');
    dogFactOverlay.id = 'dogFactOverlay';
    document.getElementById('viewer').appendChild(dogFactOverlay);
  }

  console.log("▶️ startDogFacts() gestart.");
  factIndex = 0;
  
  // Set content and make visible
  dogFactOverlay.innerHTML = `<p>${dogFacts[factIndex]}</p>`;
  dogFactOverlay.style.display = 'flex'; // Set display to flex before adding the visible class
  
  // Allow DOM to update before adding the visible class (for animation)
  setTimeout(() => {
    dogFactOverlay.classList.add('visible');
    console.log("🐾 Overlay zichtbaar gemaakt met eerste feit:", dogFacts[factIndex]);
  }, 10);

  // Start interval to cycle through facts
  if (factInterval) {
    clearInterval(factInterval); // Clear any existing interval
  }
  
  factInterval = setInterval(() => {
    factIndex = (factIndex + 1) % dogFacts.length;
    dogFactOverlay.innerHTML = `<p>${dogFacts[factIndex]}</p>`;
    console.log(`🐾 Nieuwe dog fact getoond: ${dogFacts[factIndex]}`);
  }, 5000);
}

function stopDogFacts() {
  console.log("⏹️ stopDogFacts() gestart.");
  
  // Clear the interval
  if (factInterval) {
    clearInterval(factInterval);
    factInterval = null;
    console.log("⏹️ Interval gestopt.");
  }
  
  // Hide the overlay
  const dogFactOverlay = document.getElementById('dogFactOverlay');
  if (dogFactOverlay) {
    dogFactOverlay.classList.remove('visible');
    // Wait for transition to complete before changing display
    setTimeout(() => {
      dogFactOverlay.style.display = 'none';
    }, 500); // Match this with your CSS transition time
    console.log("🐾 Overlay verborgen.");
  } else {
    console.warn("⚠️ dogFactOverlay niet beschikbaar in stopDogFacts.");
  }
}

async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) {
        console.warn("⚠️ Geen afbeelding geselecteerd.");
        return alert("Selecteer een afbeelding.");
    }

    const minPoly = 100;
    const maxPoly = 300000;

    if (selectedPolycount < minPoly || selectedPolycount > maxPoly) {
        const origineleWaarde = selectedPolycount;
        const aangepasteWaarde = selectedPolycount < minPoly ? minPoly : maxPoly;

        console.warn(`⚠️ Polycount ${origineleWaarde} ongeldig. Aangepast naar ${aangepasteWaarde}.`);

        selectedPolycount = aangepasteWaarde;
        document.getElementById("polycountInput").value = selectedPolycount;
        document.getElementById("polycountSlider").value = selectedPolycount;

        return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        console.log("🖼️ Afbeelding geladen");

        try {
            await statusMessage("🔍 Scanning picture...", 2000);

            if (enableDetection) {
                console.log("📤 Detectie gestart...");
                const detection = await detectRelevantObjects(file);
                console.log("🔍 Objectdetectie resultaat:", detection);

                if (!detection.relevant) {
                    await statusMessage("❌ No dog found. Please try again or change picture.");
                    console.warn("🚫 Geen hond gedetecteerd.");
                    showSpinner(false);
                    return;
                }

                console.log("✅ Hond gedetecteerd.");
                await statusMessage("✅ Dog detected! Starting generation...", 2000);
                startDogFacts();

            } else {
                console.log("🚫 Detectie uitgeschakeld.");
                await statusMessage("🚫 Detection disabled. Starting generation...", 2000);
            }

            showSpinner(true);
            updateProgress(0);
            document.getElementById("statusMsg").textContent = "⚙️ Generating...";
            console.log("📤 Modelaanvraag verzonden...");

            const taskId = await createModel(file, selectedTopology, selectedTexture, enablePBR, selectedSymmetry, selectedPolycount);

            if (taskId) {
                console.log(`📬 Task-ID ontvangen: ${taskId}`);
                currentTaskId = taskId;
                startPolling(taskId);
            } else {
                console.error("❌ Geen taskId ontvangen van backend.");
            }
        } catch (err) {
            console.error("❌ Fout bij modelgeneratie:", err);
            await statusMessage("❌ Error while processing image.");
            showSpinner(false);
        }
    };

    img.onerror = () => {
        console.error("❌ Fout bij laden van afbeelding.");
        alert("❌ Fout bij laden van afbeelding.");
        showSpinner(false);
    };
}

function startPolling(taskId) {
    console.log(`🚀 Polling gestart voor taskId: ${taskId}`);
    let fakeProgress = 0;

    const interval = setInterval(async () => {
        try {
            const res = await getModelStatus(taskId);
            console.log(`📡 Polling taskId ${taskId}:`, res);

            if (!res) {
                console.warn("⚠️ Geen resultaat ontvangen van backend tijdens polling.");
                return;
            }

            let progress = res.progress;

            if (progress === undefined || isNaN(progress)) {
                fakeProgress = Math.min(fakeProgress + 10, 99);
                progress = fakeProgress;
                console.log(`⚠️ Geen progress van backend, simulatie op ${progress}%`);
            }

            updateProgress(progress);

            if (progress >= 100) {
                showSpinner(false);
            }

            if (res.status === "SUCCEEDED") {
                console.log("✅ Modelgeneratie voltooid.");
                clearInterval(interval);
                showSpinner(false);
                showDownloadButtons();
                stopDogFacts();
                const success = await loadModel(`http://localhost:3000/api/proxyModel/${taskId}?format=glb`);
                await statusMessage(success ? "✅ Model succesvol geladen!" : "❌ Kon model niet laden.");
                return;
            }

            if (res.status === "FAILED" || res.status === "ERROR") {
                console.error(`❌ Foutstatus ontvangen van backend: ${res.status}`);
                clearInterval(interval);
                showSpinner(false);
                await statusMessage("❌ Modelgeneratie mislukt.");
            }
        } catch (e) {
            console.error("❌ Pollingfout:", e);
        }
    }, 5000);
}

async function loadModel(url) {
    try {
        const response = await fetch(url);
        const contentType = response.headers.get("Content-Type");
        const isGLB = contentType?.includes("model/gltf-binary");

        if (!response.ok || !isGLB) {
            console.error("❌ Geen geldig model:", await response.text());
            return false;
        }

        const arrayBuffer = await response.arrayBuffer();
        const loader = new THREE.GLTFLoader();

        return new Promise((resolve) => {
            loader.parse(arrayBuffer, '', (gltf) => {
                // Verwijder oude modelgroepen
                scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group));

                const model = gltf.scene;

                // 📏 Start: kleine schaal en geen rotatie
                model.scale.set(0.01, 0.01, 0.01);
                model.rotation.y = 0;

                scene.add(model);

                // 🌀 Animeer schaal van klein naar normaal - use basic animation instead of GSAP
                animateScale(model);
                animateRotation(model);

                // 🔍 Smooth camera-zoom naar het model
                frameModel(model);

                resolve(true);
            }, (err) => {
                console.error("❌ Parsefout GLTF:", err);
                resolve(false);
            });
        });
    } catch (e) {
        console.error("❌ Laden mislukt:", e);
        return false;
    }
}

// Simple animation functions to replace GSAP
function animateScale(model) {
    const startTime = Date.now();
    const duration = 2000; // 2 seconds
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (power2.out equivalent)
        const eased = 1 - Math.pow(1 - progress, 2);
        
        const scale = 0.01 + (1 - 0.01) * eased;
        model.scale.set(scale, scale, scale);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function animateRotation(model) {
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (power2.out equivalent)
        const eased = 1 - Math.pow(1 - progress, 2);
        
        model.rotation.y = Math.PI * 2 * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

function frameModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let targetDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
    targetDistance = Math.max(targetDistance, 5); // 📏 minimaal 5 eenheden afstand

    const newPos = {
        x: center.x,
        y: center.y + maxDim * 0.3,
        z: center.z + targetDistance,
    };

    // Simple camera animation instead of GSAP
    const startTime = Date.now();
    const duration = 2000;
    const startPos = { ...camera.position };
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 2);
        
        camera.position.x = startPos.x + (newPos.x - startPos.x) * eased;
        camera.position.y = startPos.y + (newPos.y - startPos.y) * eased;
        camera.position.z = startPos.z + (newPos.z - startPos.z) * eased;
        
        camera.lookAt(center);
        controls.target.copy(center);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

showDownloadButtons();

function downloadModel(format = 'glb') {
    const downloadUrl = `http://localhost:3000/api/proxyModel/${currentTaskId}?format=${format}`;
    const filename = `model.${format}`;
    downloadFile(downloadUrl, filename);
}

function downloadFile(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}