// frontend/main.js
async function generateModel() {
    const prompt = document.getElementById("prompt").value;
    const response = await fetch("http://127.0.0.1:5000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: prompt }) // Gebruik je URL of Base64-encoded data
    });
  
    const data = await response.json();
    if (data.result) {
      console.log("3D Model Task ID:", data.result);
    } else {
      console.error("Fout bij het verkrijgen van het model ID");
    }
  }
  