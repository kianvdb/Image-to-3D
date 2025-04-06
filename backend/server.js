const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

const corsOptions = {
  origin: ['http://localhost:3001', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const YOUR_API_KEY = 'msy_dgO5o6R6IKwwBbWYWrerMkUC4iMJSZPHPMYI';

// Functie om een model te genereren op basis van een afbeelding
const createModel = async (imageBase64) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
  const payload = {
    image_url: imageBase64,
    ai_model: 'meshy-4',
    topology: 'triangle',
    target_polycount: 30000,
    should_remesh: true,
    enable_pbr: false,
    should_texture: true,
    symmetry_mode: 'auto',
  };

  try {
    console.log("Sending request to Meshy API...");
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );

    console.log('Meshy API Response:', response.data);
    return response.data.result; // Returns the taskId
  } catch (error) {
    if (error.response) {
      console.error('Error creating model:', error.response.data);
    } else {
      console.error('Error creating model:', error.message);
    }
    throw error;
  }
};

// Functie om de status van een model op te halen op basis van taskId
const getModelStatus = async (taskId) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

  try {
    console.log(`Checking status for taskId: ${taskId}`);
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('Model status response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error retrieving model status:', error.response.data);
    } else {
      console.error('Error retrieving model status:', error.message);
    }
    throw error;
  }
};

// Endpoint voor het genereren van een model
app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  console.log('Received a request to generate model...');
  try {
    if (!req.file) {
      console.error('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('Image received, converting to base64...');

    const taskId = await createModel(imageBase64);
    console.log(`Model generation started with taskId: ${taskId}`);
    res.json({ taskId });
  } catch (error) {
    console.error('Error during model generation:', error);
    res.status(500).send('Error generating model.');
  }
});

// Endpoint voor het ophalen van de modelstatus
app.get('/api/getModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`Received status request for taskId: ${taskId}`);

  try {
    const modelStatus = await getModelStatus(taskId);
    console.log(`Model status for taskId ${taskId}:`, modelStatus);
    res.json(modelStatus);
  } catch (error) {
    console.error('Error during status retrieval:', error);
    res.status(500).send('Error retrieving model status.');
  }
});

// Proxy endpoint om het model via een proxy op te halen
app.get('/api/proxyModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const modelUrl = `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}/model`;

  console.log(`📌 Proxy fetching model from: ${modelUrl}`);

  try {
    // Eerst de status van het model ophalen
    const modelStatus = await getModelStatus(taskId);
    console.log(`🔄 Model status voor taskId ${taskId}:`, modelStatus);

    // Controleer de status van het model
    if (modelStatus.status !== 'SUCCEEDED') {
      console.error(`❌ Model is niet gereed voor taskId: ${taskId}. Huidige status: ${modelStatus.status}`);
      return res.status(400).send(`Model is niet klaar, huidige status: ${modelStatus.status}`);
    }

    // Model ophalen als het gereed is
    const response = await axios.get(modelUrl, { responseType: 'arraybuffer' });
    console.log("✅ Model succesvol opgehaald via proxy.");

    res.set('Content-Type', 'model/gltf-binary');
    res.send(response.data);
  } catch (error) {
    // Controleer of de fout een buffer is en log het als string
    if (error.response) {
      if (Buffer.isBuffer(error.response.data)) {
        const errorMessage = error.response.data.toString('utf-8');
        console.error('❌ Error fetching model (buffer):', errorMessage);
      } else {
        console.error('❌ Error fetching model:', error.response.data);
      }
    } else if (error.request) {
      console.error('❌ No response received from Meshy API:', error.message);
    } else {
      console.error('❌ Error in the proxy logic:', error.message);
    }

    res.status(500).send('Error fetching model');
  }
});

// Serve the frontend files (e.g., index.html, etc.)
app.use(express.static('frontend'));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
