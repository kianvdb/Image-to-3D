import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';
import { detectRelevantObjects, enableDetection } from './objectDetection.js';
import { initFlow, showDownloadButtons } from './flow.js';


let scene, camera, renderer, controls, model;
let currentTaskId;
let selectedTopology = 'triangle'; // standaardwaarde
let selectedTexture = null;
let selectedSymmetry = 'auto';
let enablePBR = false;
let selectedPolycount = 30000; // default polycount

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");

    initFlow();
    initScene();
    initDownloadButtons();
    initTopologyButtons();
    initTextureButtons();
    initSymmetryButtons();
    initPBRButtons();  
    initPolycountInput(); // <-- nieuw

    document.querySelector('.topology-btn[data-topology="triangle"]').classList.add('selected', 'active');
    document.querySelector('.texture-btn[data-texture="true"]').classList.add('selected', 'active');
    document.querySelector('.symmetry-btn[data-symmetry="auto"]').classList.add('selected', 'active');
    document.querySelector('.pbr-btn[data-enable="false"]').classList.add('selected', 'active');

    document.getElementById("generateBtn").addEventListener("click", generateModel);
});

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(600, 400);

    const viewer = document.getElementById("viewer");
    viewer.innerHTML = "";
    viewer.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    // Zorg ervoor dat de polycount wordt bijgewerkt wanneer de slider of het invoerveld wordt aangepast
const polycountSlider = document.getElementById("polycountSlider");
const polycountInput = document.getElementById("polycountInput");

// Wanneer de slider verandert, werk het inputveld bij
polycountSlider.addEventListener("input", (event) => {
  polycountInput.value = event.target.value;
});

// Wanneer het inputveld verandert, werk de slider bij
polycountInput.addEventListener("input", (event) => {
  polycountSlider.value = event.target.value;
});


    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 3, 5);
    controls.update();

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

    if (buttons.length === 0) {
        console.warn("Geen topology knoppen gevonden.");
        return;
    }

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

    if (buttons.length === 0) {
        console.warn("Geen texture knoppen gevonden.");
        return;
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            selectedTexture = button.dataset.texture;
            console.log(`🔘 Geselecteerde textuur: ${selectedTexture}`);
        });
    });
}

function initSymmetryButtons() {
    const buttons = document.querySelectorAll('.symmetry-btn');

    if (buttons.length === 0) {
        console.warn("Geen symmetrieknoppen gevonden.");
        return;
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            selectedSymmetry = button.dataset.symmetry;
            console.log(`🔘 Geselecteerde symmetrie: ${selectedSymmetry}`);
        });
    });
}

function initPBRButtons() {
    const buttons = document.querySelectorAll('.pbr-btn');

    if (buttons.length === 0) {
        console.warn("Geen PBR knoppen gevonden.");
        return;
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            enablePBR = button.dataset.enable === "true";
            console.log(`🔘 Geselecteerde PBR: ${enablePBR}`);
        });
    });
}

// ✅ Nieuw: initialiseer polycount input
function initPolycountInput() {
    const polyInput = document.getElementById("polycountInput");
    const polySlider = document.getElementById("polycountSlider"); // De slider
    if (!polyInput || !polySlider) {
        console.warn("Polycount input of slider niet gevonden.");
        return;
    }

    // Stel de waarde van het inputveld in op de geselecteerde polycount
    polyInput.value = selectedPolycount;
    polySlider.value = selectedPolycount; // Stel de slider ook in op dezelfde waarde

    // Event listener voor het inputveld
    polyInput.addEventListener("input", () => {
        const parsed = parseInt(polyInput.value);
        if (!isNaN(parsed) && parsed > 0) {
            selectedPolycount = parsed;
            polySlider.value = selectedPolycount; // Update de slider wanneer het inputveld wordt gewijzigd
            console.log(`🔢 Polycount ingesteld op: ${selectedPolycount}`);
        }
    });

    // Event listener voor de slider
    polySlider.addEventListener("input", () => {
        selectedPolycount = parseInt(polySlider.value);
        polyInput.value = selectedPolycount; // Update het inputveld wanneer de slider wordt verschoven
        console.log(`🔢 Polycount ingesteld via slider op: ${selectedPolycount}`);
    });
}


export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) return alert("Selecteer een afbeelding.");

    // ✅ Controleer polycount-bereik
    const minPoly = 100;
    const maxPoly = 300000;
    if (selectedPolycount < minPoly || selectedPolycount > maxPoly) {
        const origineleWaarde = selectedPolycount;
        const aangepasteWaarde = selectedPolycount < minPoly ? minPoly : maxPoly;

        alert(`⚠️ Polycount ${origineleWaarde} is ongeldig. Gelieve een waarde te kiezen tussen ${minPoly} en ${maxPoly}. De waarde is tijdelijk aangepast naar ${aangepasteWaarde}. Je kunt dit nu nog wijzigen.`);

        // ✅ Pas waarde aan en toon in UI, maar stop verdere uitvoering
        selectedPolycount = aangepasteWaarde;

        const polyInput = document.getElementById("polycountInput");
        const polySlider = document.getElementById("polycountSlider");
        if (polyInput) polyInput.value = selectedPolycount;
        if (polySlider) polySlider.value = selectedPolycount;

        return; // ⛔️ Stop hier! Laat gebruiker opnieuw klikken.
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        console.log("🖼️ Afbeelding geladen");

        try {
            let isRelevant = true;
            let predictions = [];

            if (enableDetection) {
                const detection = await detectRelevantObjects(file);
                predictions = detection.predictions;
                console.log("🔍 Objectdetectie:", predictions);

                if (!detection.relevant) {
                    alert("⚠️ Geen hond gedetecteerd in afbeelding!");
                    return;
                }

                console.log("✅ Hond gedetecteerd. Start modelgeneratie...");
            } else {
                console.log("🚫 Objectdetectie uitgeschakeld. Ga verder met modelgeneratie.");
            }

            alert(`🛠️ Modelgeneratie gestart met topologie: ${selectedTopology}, polycount: ${selectedPolycount}, textuur: ${selectedTexture}, PBR: ${enablePBR}, symmetrie: ${selectedSymmetry}`);

            const taskId = await createModel(file, selectedTopology, selectedTexture, enablePBR, selectedSymmetry, selectedPolycount);
            if (taskId) {
                currentTaskId = taskId;
                startPolling(taskId);
            }
        } catch (err) {
            console.error("❌ Fout bij objectdetectie of modelgeneratie:", err);
            alert("Er trad een fout op bij het verwerken van de afbeelding.");
        }
    };

    img.onerror = () => {
        alert("❌ Fout bij laden van afbeelding.");
    };
}



function startPolling(taskId) {
    const interval = setInterval(async () => {
        try {
            const res = await getModelStatus(taskId);
            console.log(`📡 Polling taskId ${taskId}:`, res);

            if (!res) {
                console.error("❌ Lege response ontvangen.");
                return;
            }

            if (res.status === "SUCCEEDED") {
                showDownloadButtons();
                clearInterval(interval);
                const success = await loadModel(`/api/proxyModel/${taskId}?format=glb`);
                if (success) {
                    alert("✅ Model succesvol geladen!");
                } else {
                    alert("❌ Kon model niet laden.");
                }
            }

            if (res.progress !== undefined) {
                const progressBar = document.getElementById("progressBar");
                if (progressBar) progressBar.value = res.progress;
            }

            if (res.status === "FAILED" || res.status === "ERROR") {
                clearInterval(interval);
                alert("❌ Modelgeneratie mislukt.");
            }
        } catch (e) {
            console.error("❌ Pollingfout:", e);
        }
    }, 5000);
}

async function loadModel(url) {
    try {
        console.log("🔗 Probeer model te laden van:", url);

        const response = await fetch(url);
        const contentType = response.headers.get("Content-Type");
        const isGLB = contentType?.includes("model/gltf-binary");

        console.log("📄 Content-Type:", contentType);

        if (!response.ok || !isGLB) {
            const text = await response.text();
            console.error("❌ Response geen geldig modelbestand:", text);
            return false;
        }

        const arrayBuffer = await response.arrayBuffer();
        const loader = new GLTFLoader();

        return new Promise((resolve) => {
            loader.parse(arrayBuffer, '', (gltf) => {
                scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group));
                scene.add(gltf.scene);
                resolve(true);
            }, (err) => {
                console.error("❌ GLTF parsing fout:", err);
                resolve(false);
            });
        });
    } catch (e) {
        console.error("❌ Fout tijdens model laden:", e);
        return false;
    }
}
showDownloadButtons();
function downloadModel(format = 'glb') {
    const downloadUrl = `/api/proxyModel/${currentTaskId}?format=${format}`;
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
