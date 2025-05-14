// src/api.js
import axios from 'axios';

const proxyUrl = "http://localhost:3000"; // Proxyserver om CORS-problemen te vermijden

/**
 * 📌 Upload een afbeelding naar de backend om een 3D-model te genereren.
 * @param {File} imageFile - De afbeelding die omgezet moet worden naar een 3D-model.
 * @param {string} topology - Optioneel: gewenste mesh topologie ('triangle' of 'quad'). Default is 'triangle'.
 * @param {boolean} shouldTexture - Optioneel: of het model een textuur moet hebben. Default is true.
 * @param {string} symmetryMode - Optioneel: de symmetrie-modus ('auto' of 'on'). Default is 'auto'.
 * @param {boolean} enablePBR - Optioneel: of PBR (Physically Based Rendering) moet ingeschakeld zijn. Default is false.
 * @param {number} polycount - Optioneel: gewenste polycount (100 tot 300000). Default is 50000.
 * @returns {Promise<string>} - De taskId die gebruikt wordt om de status op te volgen.
 */
const createModel = async (
  imageFile,
  topology = 'triangle',
  shouldTexture = true,
  symmetryMode = 'auto',
  enablePBR = false,
  polycount = 50000
) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('topology', topology);            // ✅ Topologie parameter
  formData.append('shouldTexture', shouldTexture);  // ✅ Textuur parameter
  formData.append('symmetryMode', symmetryMode);    // ✅ Symmetrie parameter
  formData.append('enablePBR', enablePBR);          // ✅ PBR parameter
  formData.append('polycount', polycount);          // ✅ Nieuw: polycount parameter

  try {
    const response = await axios.post(`${proxyUrl}/api/generateModel`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data?.taskId) {
      return response.data.taskId;
    } else {
      throw new Error("❌ Geen taskId ontvangen van backend.");
    }
  } catch (error) {
    console.error('❌ Fout bij aanmaken van model:', error);
    throw error;
  }
};

/**
 * 📌 Poll de status van het gegenereerde model.
 * @param {string} taskId - De unieke ID van de Meshy-taak.
 * @returns {Promise<Object>} - De statusinformatie van de taak.
 */
const getModelStatus = async (taskId) => {
  try {
    const response = await axios.get(`${proxyUrl}/api/getModel/${taskId}`);

    if (!response.data?.status) {
      throw new Error(`❌ Geen geldige status ontvangen voor taskId ${taskId}`);
    }

    return response.data;
  } catch (error) {
    console.error("❌ Fout bij ophalen van modelstatus:", error);
    throw error;
  }
};

/**
 * 📌 Haal het gegenereerde GLB-bestand op van de backend.
 * @param {string} taskId - De unieke ID van de Meshy-taak.
 * @param {string} format - Optioneel: formaat van het model (bijvoorbeeld 'glb', 'gltf', 'usdz', etc.).
 * @returns {Promise<Blob>} - Het modelbestand als blob.
 */
const fetchModelBlob = async (taskId, format = 'glb') => {
  try {
    const response = await axios.get(`${proxyUrl}/api/proxyModel/${taskId}?format=${format}`, {
      responseType: 'blob',
    });

    const contentType = response.headers['content-type'];

    if (!contentType?.includes("model/gltf-binary") && format === 'glb') {
      throw new Error("❌ Geen geldig GLB-model ontvangen van backend.");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Fout bij ophalen van model via proxy:", error);
    throw error;
  }
};

export { createModel, getModelStatus, fetchModelBlob };
