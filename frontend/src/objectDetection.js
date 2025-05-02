import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let objectDetector = null;

// Laadt het COCO-SSD model
export async function loadObjectDetector() {
    if (!objectDetector) {
        console.log("📦 Laden van COCO-SSD model...");
        objectDetector = await cocoSsd.load();
        console.log("✅ COCO-SSD geladen!");
    }
    return objectDetector;
}

// Detecteert relevante objecten, zoals honden, in de afbeelding
export async function detectRelevantObjects(imageFile) {
    const allowedClasses = ["dog"]; // Alleen honden detecteren

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = async () => {
            img.src = reader.result;
        };

        img.onload = async () => {
            console.log("Afbeelding geladen:", img);
            try {
                // Maak een canvas aan om de afbeelding te verwerken
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                // Log de canvas afmetingen
                console.log("Canvas afmetingen:", canvas.width, canvas.height);

                // Wacht op het laden van het model en voer de detectie uit
                const detector = await loadObjectDetector();
                console.log("📦 Model geladen, nu starten met detecteren...");
                const predictions = await detector.detect(canvas);

                console.log("🔍 Gedetecteerde objecten:", predictions);

                // Filter de voorspellingen om te kijken of er een hond is
                const relevantObjects = predictions.filter(p =>
                    allowedClasses.includes(p.class)
                );

                // Als er geen relevante objecten zijn
                if (relevantObjects.length === 0) {
                    console.warn("⚠️ Geen relevante objecten gevonden:", predictions);
                    resolve({ relevant: false, predictions });
                } else {
                    // Als er wel relevante objecten zijn (zoals een hond)
                    console.log("✅ Relevante objecten gevonden:", relevantObjects.map(o => o.class));
                    resolve({ relevant: true, predictions: relevantObjects });
                }
            } catch (err) {
                // Foutafhandelingsbericht
                console.error("❌ Fout bij detectie:", err);
                reject(err);
            }
        };

        // Fout als de afbeelding niet kan worden gelezen
        reader.onerror = () => {
            reject("❌ Kon afbeelding niet lezen.");
        };

        reader.readAsDataURL(imageFile);
    });
}
