// src/api.js
import axios from 'axios';

const proxyUrl = "http://localhost:3000"; // Proxyserver om CORS-problemen te vermijden

/**
 * 📌 Upload een afbeelding naar de backend om een 3D-model te genereren.
 * @param {File} imageFile - De afbeelding die omgezet moet worden naar een 3D-model.
 * @returns {Promise<string>} - De taskId die gebruikt wordt om de status op te volgen.
 */
const createModel = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

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
    const response = await axios.get(`${proxyUrl}/api/getModel/${taskId}`); // Aangepast naar getModel i.p.v. proxyModel

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
 * @returns {Promise<Blob>} - Het GLB-modelbestand als blob.
 */
const fetchModelBlob = async (taskId) => {
  try {
    const response = await axios.get(`${proxyUrl}/api/proxyModel/${taskId}`, {
      responseType: 'blob',
    });

    const contentType = response.headers['content-type'];

    if (!contentType?.includes("model/gltf-binary")) {
      throw new Error("❌ Geen geldig GLB-model ontvangen van backend.");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Fout bij ophalen van GLB-model via proxy:", error);
    throw error;
  }
};

export { createModel, getModelStatus, fetchModelBlob };
