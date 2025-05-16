export function initFlow() {
  const imageInput = document.getElementById("imageInput");
  const symmetryButtons = document.getElementById("symmetryModeButtons");
  const topologyButtons = document.getElementById("topologyButtons");
  const polycountControls = document.querySelector(".polycount-control");
  const textureButtons = document.getElementById("shouldTextureButtons");
  const pbrButtons = document.getElementById("pbrButtons");
  const generateBtn = document.getElementById("generateBtn");
  const downloadButtons = document.querySelectorAll("#downloadGLB, #downloadUSDZ, #downloadOBJ, #downloadFBX");
  const pbrCheckbox = document.getElementById("pbrCheckbox");

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

    // ✅ Als texture=true al actief is, toon meteen de PBR checkbox
    const defaultTextureBtn = document.querySelector('.texture-btn.selected[data-texture="true"]');
    if (defaultTextureBtn) {
      pbrButtons.style.display = "block";
    }
  });

  // Toon/verberg PBR-checkbox bij wissel texture true/false
  textureButtons.addEventListener("click", (e) => {
    const target = e.target;
    if (!target.classList.contains("texture-btn")) return;

    const textureEnabled = target.dataset.texture === "true";
    pbrButtons.style.display = textureEnabled ? "block" : "none";

    if (!textureEnabled) {
      // Reset enablePBR naar false
      window.enablePBR = false;

      // Reset checkbox UI
      if (pbrCheckbox) {
        pbrCheckbox.checked = false;
      }
    }
  });

  // Checkbox toggle → enablePBR
  if (pbrCheckbox) {
    pbrCheckbox.addEventListener("change", (e) => {
      window.enablePBR = e.target.checked;
      console.log(`🔘 Geselecteerde PBR: ${window.enablePBR}`);
    });
  }
}

export function showDownloadButtons() {
  const downloadButtons = document.querySelectorAll("#downloadGLB, #downloadUSDZ, #downloadOBJ, #downloadFBX");
  downloadButtons.forEach(btn => btn.style.display = "inline-block");
}
