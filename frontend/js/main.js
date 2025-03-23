import { createModel, getModelStatus } from "./api.js";

let scene, camera, renderer, controls, directionalLight, ambientLight;
let modelLoaded = false; // Flag om bij te houden of het model al is geladen

// Wacht totdat de DOM volledig is geladen
document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 DOM geladen, initialiseer Three.js...");
    initScene(); 
});

function initScene() {
    console.log("🚀 Initialiseren van de Three.js scene...");

    // Maak een Three.js scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(600, 400);

    // Voeg de renderer toe aan het DOM
    const viewer = document.getElementById("viewer");
    if (!viewer) {
        console.error("❌ Viewer element niet gevonden!");
        return;
    }
    viewer.innerHTML = ""; 
    viewer.appendChild(renderer.domElement);

    console.log("✅ Renderer toegevoegd aan de viewer.");

    // Lichtbronnen toevoegen
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    console.log("✅ Directional Light toegevoegd.");

    ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    console.log("✅ Ambient Light toegevoegd.");

    // GridHelper toevoegen
    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0x888888);
    scene.add(gridHelper);
    console.log("✅ GridHelper toegevoegd.");

    // OrbitControls toevoegen voor de muisbesturing
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 2;
    controls.maxDistance = 20;

    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);

    console.log("✅ Camera ingesteld.");

    // Start de render-loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
    console.log("🎥 Animatie gestart.");
}

// 🌟 Functie om een model te genereren via de API
export async function generateModel() {
    console.log("🎨 Model genereren gestart...");

    const imageInput = document.getElementById("imageInput");
    const imageFile = imageInput.files[0];

    if (!imageFile) {
        alert("Selecteer een afbeelding!");
        console.log("❌ Geen afbeelding geselecteerd.");
        return;
    }

    try {
        const taskId = await createModel(imageFile);
        if (taskId) {
            alert("Model generatie gestart! Task ID: " + taskId);
            console.log("✅ Model generatie gestart, task ID:", taskId);
            startModelStatusPolling(taskId);
        }
    } catch (error) {
        console.error("❌ Modelgeneratie mislukt:", error);
    }
}

// 📡 Functie om de status van het model op te halen en periodiek te controleren
function startModelStatusPolling(taskId) {
    const intervalId = setInterval(async () => {
        console.log("🔄 Controleren van de modelstatus...");

        if (modelLoaded) {
            console.log("✅ Model al geladen, polling gestopt.");
            clearInterval(intervalId);
            return;
        }

        try {
            const data = await getModelStatus(taskId);
            console.log("📊 Status update ontvangen:", data);

            if (data.status === "SUCCEEDED" && data.model_urls.glb) {
                alert("🎉 Model is klaar!");
                console.log("✅ Model klaar om te laden.");
                clearInterval(intervalId);
                loadModel(data.model_urls.glb);
                modelLoaded = true;
            } else {
                console.log("⏳ Model wordt nog gegenereerd...");
            }
        } catch (error) {
            console.error("❌ Fout bij ophalen van modelstatus:", error);
        }
    }, 5000);
}

// 🏗️ Model inladen in de 3D-scene
function loadModel(url) {
    console.log("📥 Laden van model via proxy:", url);

    // Gebruik de proxy-route om het model op te halen
    const proxyUrl = `http://localhost:3000/api/proxyModel/${url.split('/').pop()}`;

    const loader = new THREE.GLTFLoader();
    loader.load(proxyUrl, function (gltf) {
        console.log("✅ Model geladen!");

        // Oude modellen verwijderen
        scene.children.forEach((child) => {
            if (child instanceof THREE.Group) {
                scene.remove(child);
            }
        });

        scene.add(gltf.scene);
        console.log("📌 Model toegevoegd aan de scene.");
    }, undefined, function (error) {
        console.error("❌ Fout bij laden van model:", error);
    });
}

// Initialiseer de 3D viewport direct
initScene();
