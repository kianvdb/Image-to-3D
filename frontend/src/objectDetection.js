import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

// ✅ Zet deze op false om detectie uit te schakelen
export const enableDetection = true;

let objectDetector = null;

// Laadt het COCO-SSD model (eenmalig, met caching)
export async function loadObjectDetector() {
    if (!objectDetector) {
        console.log("📦 Laden van COCO-SSD model...");

        if (!window._cocoModel) {
            window._cocoModel = await cocoSsd.load();
            console.log("✅ COCO-SSD geladen en gecached in window");
        }

        objectDetector = window._cocoModel;
    }
    return objectDetector;
}

// Detecteert relevante objecten, zoals honden, in de afbeelding
export async function detectRelevantObjects(imageFile) {
    if (!enableDetection) {
        console.warn("🚫 Objectdetectie is uitgeschakeld.");
        return { relevant: true, predictions: [] };
    }

    const allowedClasses = ["dog"];
    const confidenceThreshold = 0.5;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        img.onload = async () => {
            console.log("🖼️ Afbeelding geladen:", img);

            try {
                await img.decode(); // ✅ Betere compatibiliteit

                const maxDim = 640;
                let scale = 1;
                if (img.width > maxDim || img.height > maxDim) {
                    scale = Math.min(maxDim / img.width, maxDim / img.height);
                }

                const canvas = document.createElement("canvas");
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                console.log("🖼️ Canvas grootte:", canvas.width, canvas.height);

                const detector = await loadObjectDetector();
                console.log("📦 Model geladen, starten met detectie...");

                const predictions = await detector.detect(canvas);
                console.table(predictions.map(p => ({
                    class: p.class,
                    score: p.score.toFixed(2),
                    bbox: p.bbox
                })));

                const relevantObjects = predictions.filter(p =>
                    allowedClasses.includes(p.class) && p.score > confidenceThreshold
                );

                if (relevantObjects.length === 0) {
                    console.warn("⚠️ Geen relevante objecten met voldoende vertrouwen gevonden.");
                    resolve({ relevant: false, predictions });
                } else {
                    console.log("✅ Relevante objecten gevonden:", relevantObjects.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
                    resolve({ relevant: true, predictions: relevantObjects });
                }
            } catch (err) {
                console.error("❌ Fout bij detectie:", err);
                reject(err);
            }
        };

        reader.onload = () => {
            img.src = reader.result;
        };

        reader.onerror = () => {
            reject("❌ Kon afbeelding niet lezen.");
        };

        reader.readAsDataURL(imageFile);
    });
}
