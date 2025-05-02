import { createModel, getModelStatus } from "./api.js";

let scene, camera, renderer, controls, directionalLight, ambientLight;
let modelLoaded = false;
let currentModelUrls = {};

document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 DOM geladen, initialiseer Three.js...");
    initScene();
    initDownloadButtons();
});

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(600, 400);

    const viewer = document.getElementById("viewer");
    if (!viewer) {
        console.error("❌ Viewer element niet gevonden!");
        return;
    }
    viewer.innerHTML = "";
    viewer.appendChild(renderer.domElement);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0x888888);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 2;
    controls.maxDistance = 20;

    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

function initDownloadButtons() {
    document.getElementById("downloadGLB").addEventListener("click", () => {
        if (!modelLoaded || !currentModelUrls.glb) return alert("⏳ Het model is nog niet klaar.");
        downloadFile(currentModelUrls.glb, "model.glb");
    });

    document.getElementById("downloadOBJ").addEventListener("click", () => {
        if (!modelLoaded || !currentModelUrls.obj) return alert("⏳ Het model is nog niet klaar of .obj niet beschikbaar.");
        downloadFile(currentModelUrls.obj, "model.obj");
    });

    document.getElementById("downloadFBX").addEventListener("click", () => {
        if (!modelLoaded || !currentModelUrls.fbx) return alert("⏳ Het model is nog niet klaar of .fbx niet beschikbaar.");
        downloadFile(currentModelUrls.fbx, "model.fbx");
    });
}

export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const imageFile = imageInput?.files[0];

    if (!imageFile) {
        alert("Selecteer een afbeelding!");
        return;
    }

    try {
        const taskId = await createModel(imageFile);
        if (taskId) {
            alert("Model generatie gestart! Task ID: " + taskId);
            startModelStatusPolling(taskId);
        }
    } catch (error) {
        console.error("❌ Modelgeneratie mislukt:", error);
    }
}

function startModelStatusPolling(taskId) {
    const intervalId = setInterval(async () => {
        if (modelLoaded) {
            clearInterval(intervalId);
            return;
        }

        try {
            const data = await getModelStatus(taskId);
            if (data.status === "GENERATING") {
                const percentage = data.progress || 0;
                window.updateProgressBar?.(percentage);
            }

            if (data.status === "SUCCEEDED" && data.model_urls?.glb) {
                clearInterval(intervalId);
                currentModelUrls = data.model_urls;
                loadModel(currentModelUrls.glb);
                modelLoaded = true;
            }
        } catch (error) {
            console.error("❌ Fout bij ophalen van modelstatus:", error);
        }
    }, 5000);
}

async function fetchModelBlob(modelUrl) {
    const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ];

    for (const proxy of proxies) {
        const finalUrl = proxy + encodeURIComponent(modelUrl);
        try {
            const response = await fetch(finalUrl);
            if (!response.ok) throw new Error(`Proxy ${proxy} gaf geen OK`);
            return await response.blob();
        } catch (err) {
            console.warn(`❌ Proxy ${proxy} faalde:`, err.message);
        }
    }

    throw new Error("🚫 Alle CORS-proxies zijn gefaald.");
}

async function loadModel(modelUrl) {
    console.log("📥 Laden van model via URL:", modelUrl);

    try {
        const blob = await fetchModelBlob(modelUrl);
        const url = URL.createObjectURL(blob);

        const loader = new THREE.GLTFLoader();
        loader.load(url, function (gltf) {
            console.log("✅ Model geladen!");

            scene.children = scene.children.filter((child) => {
                if (child instanceof THREE.Group) {
                    scene.remove(child);
                    return false;
                }
                return true;
            });

            scene.add(gltf.scene);
        }, undefined, function (error) {
            console.error("❌ Fout bij laden van model:", error);
        });
    } catch (error) {
        console.error("❌ Kon model niet laden:", error);
    }
}

function downloadFile(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
