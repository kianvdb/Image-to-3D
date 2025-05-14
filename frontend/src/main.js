import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';
import { detectRelevantObjects, enableDetection } from './objectDetection.js';
import { initFlow, showDownloadButtons } from './flow.js';

let scene, camera, renderer, controls, model;
let currentTaskId;
let selectedTopology = 'triangle';
let selectedTexture = null;
let selectedSymmetry = 'auto';
let enablePBR = false;
let selectedPolycount = 30000;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");

    initFlow();
    initScene();
    initDownloadButtons();
    initTopologyButtons();
    initTextureButtons();
    initSymmetryButtons();
    initPBRButtons();
    initPolycountInput();

    // ✅ Init selecties
    document.querySelector('.topology-btn[data-topology="triangle"]').classList.add('selected', 'active');
    document.querySelector('.texture-btn[data-texture="true"]').classList.add('selected', 'active');
    selectedTexture = "true"; // <-- synchroon zetten met UI
    document.querySelector('.symmetry-btn[data-symmetry="auto"]').classList.add('selected', 'active');
    document.querySelector('.pbr-btn[data-enable="false"]').classList.add('selected', 'active');
    enablePBR = false; // <-- synchroon zetten met UI

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
                // Toon PBR knoppen als textuur "true" is
                pbrButtons.style.display = "flex";
            } else {
                // Verberg PBR knoppen als textuur "false" is
                pbrButtons.style.display = "none";
                enablePBR = false;
                // Reset selectie van PBR-knoppen visueel
                document.querySelectorAll('.pbr-btn').forEach(btn => btn.classList.remove('selected', 'active'));
                document.querySelector('.pbr-btn[data-enable="false"]').classList.add('selected', 'active');
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

function initPBRButtons() {
    const buttons = document.querySelectorAll('.pbr-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));
            button.classList.add('selected', 'active');
            enablePBR = button.dataset.enable === "true";
            console.log(`🔘 Geselecteerde PBR: ${enablePBR}`);
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

export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) return alert("Selecteer een afbeelding.");

    const minPoly = 100;
    const maxPoly = 300000;
    if (selectedPolycount < minPoly || selectedPolycount > maxPoly) {
        const origineleWaarde = selectedPolycount;
        const aangepasteWaarde = selectedPolycount < minPoly ? minPoly : maxPoly;

        alert(`⚠️ Polycount ${origineleWaarde} is ongeldig. Tussen ${minPoly} en ${maxPoly}. Aangepast naar ${aangepasteWaarde}.`);

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
                console.log("🚫 Objectdetectie uitgeschakeld.");
            }

            alert(`🛠️ Genereren met topologie: ${selectedTopology}, polycount: ${selectedPolycount}, textuur: ${selectedTexture}, PBR: ${enablePBR}, symmetrie: ${selectedSymmetry}`);

            const taskId = await createModel(file, selectedTopology, selectedTexture, enablePBR, selectedSymmetry, selectedPolycount);
            if (taskId) {
                currentTaskId = taskId;
                startPolling(taskId);
            }
        } catch (err) {
            console.error("❌ Fout bij modelgeneratie:", err);
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

            if (!res) return;

            if (res.status === "SUCCEEDED") {
                showDownloadButtons();
                clearInterval(interval);
                const success = await loadModel(`/api/proxyModel/${taskId}?format=glb`);
                alert(success ? "✅ Model succesvol geladen!" : "❌ Kon model niet laden.");
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
        const response = await fetch(url);
        const contentType = response.headers.get("Content-Type");
        const isGLB = contentType?.includes("model/gltf-binary");

        if (!response.ok || !isGLB) {
            console.error("❌ Geen geldig model:", await response.text());
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
                console.error("❌ Parsefout GLTF:", err);
                resolve(false);
            });
        });
    } catch (e) {
        console.error("❌ Laden mislukt:", e);
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
