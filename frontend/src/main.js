import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';
import { detectRelevantObjects, enableDetection } from './objectDetection.js';

let scene, camera, renderer, controls, model;
let currentTaskId;
let selectedTopology = 'triangle'; // standaardwaarde
let selectedTexture = null; // Geen textuur geselecteerd bij de start

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");
    initScene();
    initDownloadButtons();
    initTopologyButtons();
    initTextureButtons();

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
            // Verwijder 'selected' van alle knoppen
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));

            // Voeg 'selected' en 'active' toe aan de geklikte knop
            button.classList.add('selected', 'active');

            // Update topology
            selectedTopology = button.dataset.topology;
            console.log(`🔘 Geselecteerde topologie: ${selectedTopology}`);
        });
    });
}

function initTextureButtons() {
    const buttons = document.querySelectorAll('.texture-btn');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Verwijder 'selected' van alle knoppen
            buttons.forEach(btn => btn.classList.remove('selected', 'active'));

            // Voeg 'selected' en 'active' toe aan de geklikte knop
            button.classList.add('selected', 'active');

            // Update texture
            selectedTexture = button.dataset.texture;
            console.log(`🔘 Geselecteerde textuur: ${selectedTexture}`);
        });
    });
}

export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) return alert("Selecteer een afbeelding.");

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

            alert(`🛠️ Modelgeneratie gestart met topologie: ${selectedTopology} en textuur: ${selectedTexture}`);
            const taskId = await createModel(file, selectedTopology, selectedTexture); // Voeg texture toe aan de call
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
                // Verwijder vorige modellen (Group)
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
