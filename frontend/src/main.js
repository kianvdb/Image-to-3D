// src/main.js
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';

let scene, camera, renderer, controls;
let modelLoaded = false;
let currentTaskId;
let model; // COCO-SSD model

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");
    initScene();
    initDownloadButtons();

    try {
        model = await cocoSsd.load();
        console.log("✅ COCO-SSD geladen");
    } catch (err) {
        console.error("❌ COCO-SSD laadfout:", err);
        alert("Fout bij laden van objectdetectie-model.");
    }

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
    document.getElementById("downloadGLB").onclick = () => {
        if (!modelLoaded || !currentTaskId) {
            alert("Model is nog niet klaar voor download.");
            return;
        }
        const downloadUrl = `/api/proxyModel/${currentTaskId}`;
        downloadFile(downloadUrl, "model.glb");
    };
}

export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) return alert("Selecteer een afbeelding.");

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        console.log("Afbeelding geladen:", img);

        try {
            const predictions = await model.detect(img);
            console.log("Herkenning:", predictions);

            const dogDetected = predictions.some(p => p.class === "dog");
            console.log("Hond gedetecteerd:", dogDetected);

            if (!dogDetected) {
                alert("⚠️ Geen hond gedetecteerd!");
                return;
            }

            alert("🐶 Hond gevonden! Modelgeneratie gestart...");
            const taskId = await createModel(file);
            if (taskId) {
                currentTaskId = taskId;
                startPolling(taskId);
            }
        } catch (err) {
            console.error("❌ Fout bij objectdetectie:", err);
            alert("Fout bij objectdetectie.");
        }
    };

    img.onerror = () => {
        alert("Fout bij laden van afbeelding.");
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
                await loadModel(`/api/proxyModel/${taskId}`);
                modelLoaded = true;
                alert("✅ Model succesvol geladen!");
            }

            if (res.progress !== undefined) {
                document.getElementById("progressBar").value = res.progress;
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
        if (!response.ok || !contentType?.includes("model/gltf-binary")) {
            const errorText = await response.text();
            console.error("❌ Geen geldig model:", errorText);
            throw new Error("Geen geldig GLB-model ontvangen.");
        }

        const arrayBuffer = await response.arrayBuffer();
        const loader = new GLTFLoader();

        loader.parse(arrayBuffer, '', (gltf) => {
            scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group));
            scene.add(gltf.scene);
        }, (err) => {
            console.error("❌ GLTF parsing fout:", err);
        });
    } catch (e) {
        console.error("❌ Model laadfout:", e);
        alert("Kon model niet laden.");
    }
}

function downloadFile(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
