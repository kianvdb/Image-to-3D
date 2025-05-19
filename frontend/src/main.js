import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';
import { detectRelevantObjects, enableDetection } from './objectDetection.js';
import { initFlow, showDownloadButtons } from './flow.js';
import gsap from "gsap";



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

    // Stel een neutrale achtergrondkleur in (optioneel)
scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(45, 600 / 400, 0.1, 1000);
    camera.position.set(0, 2, 10); // dichterbij + iets boven voor een goede hoek

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(600, 400);
    renderer.shadowMap.enabled = true; // voor realistisch licht

    const viewer = document.getElementById("viewer");
    viewer.innerHTML = "";
    viewer.appendChild(renderer.domElement);

    // 🌞 BELICHTING - meerdere lichten voor optimale weergave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // zacht algemeen licht
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

    // 📏 GRID - onder het model (y=0)
const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
    gridHelper.position.y = -0.95;
    scene.add(gridHelper);

    // Orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0); // richt op midden van model
    controls.update();

    // 🌀 Animatielus
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

export async function generateModel() {
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
                const success = await loadModel(`/api/proxyModel/${taskId}?format=glb`);
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
        const loader = new GLTFLoader();

        return new Promise((resolve) => {
            loader.parse(arrayBuffer, '', (gltf) => {
                // Verwijder oude modelgroepen
                scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group));

                const model = gltf.scene;

                // 📏 Start: kleine schaal en geen rotatie
                model.scale.set(0.01, 0.01, 0.01);
                model.rotation.y = 0;

                scene.add(model);

                // 🌀 Animeer schaal van klein naar normaal
                gsap.to(model.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 2,
                    ease: "power2.out"
                });

                // 🔄 Roteer 360° tijdens laden
                gsap.to(model.rotation, {
                    y: Math.PI * 2,
                    duration: 2.5,
                    ease: "power2.out"
                });

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


function frameModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
let targetDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
targetDistance = Math.max(targetDistance, 5); // 📏 minimaal 3 eenheden afstand


    const newPos = {
        x: center.x,
        y: center.y + maxDim * 0.3,
        z: center.z + targetDistance,
    };

    // 🌠 Smooth animatie met GSAP
    gsap.to(camera.position, {
        duration: 2,
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        ease: "power2.out",
        onUpdate: () => {
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
        }
    });
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
