// src/objectDetection.js
// Now uses TensorFlow loaded globally via CDN instead of ES6 imports

// ✅ RESTORE: Enable detection (your original feature)
const enableDetection = true;

let objectDetector = null;

// Loads the COCO-SSD model (once, with caching) - YOUR ORIGINAL LOGIC
async function loadObjectDetector() {
    if (!enableDetection) {
        console.log("🚫 Object detection is disabled");
        return null;
    }
    
    if (!objectDetector) {
        console.log("📦 Laden van COCO-SSD model...");
        
        // Check if TensorFlow is available globally
        if (typeof cocoSsd === 'undefined') {
            console.error("❌ COCO-SSD not loaded! Make sure TensorFlow scripts are in index.html");
            return null;
        }
        
        try {
            // Use global cocoSsd object instead of import - YOUR ORIGINAL CACHING LOGIC
            if (!window._cocoModel) {
                window._cocoModel = await cocoSsd.load();
                console.log("✅ COCO-SSD geladen en gecached in window");
            }
            objectDetector = window._cocoModel;
        } catch (error) {
            console.error("❌ Failed to load COCO-SSD:", error);
            return null;
        }
    }
    
    return objectDetector;
}

// RESTORE: Your original dog detection logic
async function detectRelevantObjects(imageFile) {
    if (!enableDetection) {
        console.warn("🚫 Objectdetectie is uitgeschakeld.");
        return { relevant: true, predictions: [] };
    }

    // YOUR ORIGINAL SETTINGS
    const allowedClasses = ["dog"];
    const confidenceThreshold = 0.5;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        img.onload = async () => {
            console.log("🖼️ Afbeelding geladen:", img);

            try {
                await img.decode(); // ✅ Betere compatibiliteit - YOUR ORIGINAL CODE

                // YOUR ORIGINAL SCALING LOGIC
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
                if (!detector) {
                    console.warn("⚠️ Object detector not available, allowing generation");
                    resolve({ relevant: true, predictions: [] });
                    return;
                }
                
                console.log("📦 Model geladen, starten met detectie...");

                // YOUR ORIGINAL DETECTION LOGIC
                const predictions = await detector.detect(canvas);
                console.table(predictions.map(p => ({
                    class: p.class,
                    score: p.score.toFixed(2),
                    bbox: p.bbox
                })));

                const relevantObjects = predictions.filter(p =>
                    allowedClasses.includes(p.class) && p.score > confidenceThreshold
                );

                // YOUR ORIGINAL SUCCESS/FAILURE LOGIC
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