const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

// CORS configureren: Als je alleen frontend vanaf bepaalde domeinen toestaat
const corsOptions = {
  origin: ['http://localhost:3001', 'http://127.0.0.1:5500'],  // Alleen frontend op poort 3001 toestaan
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Setup Multer voor image-upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API-sleutel voor Meshy
const YOUR_API_KEY = 'msy_dummy_api_key_for_test_mode_12345678'; // Voeg je echte API-sleutel toe

// Functie voor het aanmaken van een 3D-model
const createModel = async (imageBase64) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
  const payload = {
    image_url: imageBase64, // Hier gebruiken we de base64 string
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

    // Stuur de aanvraag naar de Meshy API
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );

    console.log('Meshy API Response:', response.data);
    return response.data.result; // Retourneer de taskId
  } catch (error) {
    if (error.response) {
      console.error('Error creating model:', error.response.data); // Toon de foutmelding van Meshy
    } else {
      console.error('Error creating model:', error.message); // Toon de foutmelding van axios
    }
    throw error;
  }
};

// Functie om de status van het model op te halen
const getModelStatus = async (taskId) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

  try {
    console.log(`Checking status for taskId: ${taskId}`);

    // Verkrijg de status van het model bij Meshy
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('Model status response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error retrieving model status:', error.response.data); // Toon de foutmelding van Meshy
    } else {
      console.error('Error retrieving model status:', error.message); // Toon de foutmelding van axios
    }
    throw error;
  }
};

// Endpoint om afbeelding te uploaden en model te genereren
app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  console.log('Received a request to generate model...');
  try {
    if (!req.file) {
      console.error('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    // Converteer de afbeelding naar base64
    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('Image received, converting to base64...');
    
    // Start de model-generatie
    const taskId = await createModel(imageBase64);
    console.log(`Model generation started with taskId: ${taskId}`);
    res.json({ taskId });
  } catch (error) {
    console.error('Error during model generation:', error);
    res.status(500).send('Error generating model.');
  }
});

// Endpoint om de status van een model op te halen
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

// ** Proxy voor het ophalen van het GLB-model van Meshy **
app.get('/api/proxyModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const modelUrl = `https://assets.meshy.ai/dummy-user-for-test-mode/tasks/${taskId}/output/model.glb`;

  try {
    // Haal het modelbestand op van de Meshy API
    const response = await axios.get(modelUrl, { responseType: 'arraybuffer' });

    // Zet de juiste headers en stuur de data naar de frontend
    res.set('Content-Type', 'application/octet-stream');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).send('Error fetching model');
  }
});

// Serve de frontend bestanden (optioneel)
app.use(express.static('frontend'));

// Start de server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
