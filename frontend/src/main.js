import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createModel, getModelStatus } from './api.js';

let scene, camera, renderer, controls;
let modelLoaded = false;
let currentModelUrls = {};
let model;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📌 DOM geladen...");
    initScene();
    initDownloadButtons();

    try {
        model = await cocoSsd.load();
        console.log("✅ COCO-SSD geladen");
    } catch (err) {
        console.error("❌ COCO-SSD laadfout:", err);
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
        if (!modelLoaded || !currentModelUrls.glb) return alert("Model nog niet klaar");
        downloadFile(currentModelUrls.glb, "model.glb");
    };

    document.getElementById("downloadOBJ").onclick = () => {
        if (!modelLoaded || !currentModelUrls.obj) return alert("OBJ niet beschikbaar");
        downloadFile(currentModelUrls.obj, "model.obj");
    };

    document.getElementById("downloadFBX").onclick = () => {
        if (!modelLoaded || !currentModelUrls.fbx) return alert("FBX niet beschikbaar");
        downloadFile(currentModelUrls.fbx, "model.fbx");
    };
}

export async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) return alert("Selecteer een afbeelding");

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        console.log("Afbeelding geladen:", img);  // Log afbeelding die wordt geladen

        try {
            // Detecteer objecten in de afbeelding
            const predictions = await model.detect(img);
            console.log("Herkenning:", predictions);  // Log alle gedetecteerde objecten

            // Zoek naar de hond in de gedetecteerde objecten
            const dogDetected = predictions.some(p => p.class === "dog");
            console.log("Hond gedetecteerd:", dogDetected);  // Log de detectie van een hond

            if (!dogDetected) {
                console.warn("⚠️ Geen hond gedetecteerd!", predictions);  // Log gedetecteerde objecten
                return alert("Geen hond gedetecteerd!");  // Waarschuw de gebruiker als er geen hond is gedetecteerd
            }

            alert("Hond gevonden! Start genereren...");
            const taskId = await createModel(file);
            if (taskId) startPolling(taskId);
        } catch (err) {
            console.error("❌ Fout bij objectdetectie:", err);  // Log fout bij detectie
        }
    };
}

function startPolling(taskId) {
    const interval = setInterval(async () => {
        try {
            const res = await getModelStatus(taskId);
            if (res.status === "SUCCEEDED" && res.model_urls?.glb) {
                clearInterval(interval);
                currentModelUrls = res.model_urls;
                loadModel(currentModelUrls.glb);
                modelLoaded = true;
            }

            if (res.progress !== undefined) {
                document.getElementById("progressBar").value = res.progress;
            }
        } catch (e) {
            console.error("Poll error:", e);
        }
    }, 5000);
}

async function loadModel(url) {
    try {
        const loader = new GLTFLoader();
        const blob = await (await fetch(url)).blob();
        const objectURL = URL.createObjectURL(blob);
        loader.load(objectURL, (gltf) => {
            scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group));
            scene.add(gltf.scene);
        });
    } catch (e) {
        console.error("Model laadfout:", e);
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
