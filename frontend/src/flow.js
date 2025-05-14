export function initFlow() {
    const imageInput = document.getElementById("imageInput");
    const symmetryButtons = document.getElementById("symmetryModeButtons");
    const topologyButtons = document.getElementById("topologyButtons");
    const polycountControls = document.querySelector(".polycount-control");
    const textureButtons = document.getElementById("shouldTextureButtons");
    const pbrButtons = document.getElementById("pbrButtons");
    const generateBtn = document.getElementById("generateBtn");
    const downloadButtons = document.querySelectorAll("#downloadGLB, #downloadUSDZ, #downloadOBJ, #downloadFBX");
  
    // Initieel: enkel imageInput is zichtbaar
    [symmetryButtons, topologyButtons, polycountControls, textureButtons, pbrButtons, generateBtn].forEach(el => el.style.display = "none");
    downloadButtons.forEach(btn => btn.style.display = "none");
  
    // Wanneer een afbeelding gekozen wordt
    imageInput.addEventListener("change", () => {
      const file = imageInput?.files[0];
      if (!file) return;
  
      // Toon de standaard instellingen (behalve PBR)
      symmetryButtons.style.display = "flex";
      topologyButtons.style.display = "flex";
      polycountControls.style.display = "flex";
      textureButtons.style.display = "flex";
      generateBtn.style.display = "block";
  
      // ✅ Als texture=true al actief is, toon meteen de PBR knoppen
      const defaultTextureBtn = document.querySelector('.texture-btn.selected[data-texture="true"]');
      if (defaultTextureBtn) {
        pbrButtons.style.display = "flex";
      }
    });
  
    // Toon PBR alleen als textuur = true, en reset intern + UI als textuur = false
    textureButtons.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.classList.contains("texture-btn")) return;
  
      const textureEnabled = target.dataset.texture === "true";
      pbrButtons.style.display = textureEnabled ? "flex" : "none";
  
      if (!textureEnabled) {
        // Reset enablePBR naar false
        if (typeof window.enablePBR !== "undefined") {
          window.enablePBR = false;
        }
  
        // Reset de UI van de PBR-knoppen
        const pbrOffBtn = document.querySelector('.pbr-btn[data-enable="false"]');
        if (pbrOffBtn) {
          document.querySelectorAll('.pbr-btn').forEach(btn => btn.classList.remove('selected', 'active'));
          pbrOffBtn.classList.add('selected', 'active');
        }
      }
    });
  }
  
  export function showDownloadButtons() {
    const downloadButtons = document.querySelectorAll("#downloadGLB, #downloadUSDZ, #downloadOBJ, #downloadFBX");
    downloadButtons.forEach(btn => btn.style.display = "inline-block");
  }
  