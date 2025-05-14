require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const YOUR_API_KEY = process.env.MESHY_API_KEY || 'msy_dummy_api_key_for_test_mode_12345678';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Dynamisch topology, texture, symmetry, pbr én polycount gebruiken
const createPreviewTask = async (imageBase64, topology = 'triangle', shouldTexture = true, symmetryMode = 'auto', enablePBR = false, targetPolycount = 30000) => {
  const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

  const payload = {
    image_url: imageBase64,
    ai_model: 'meshy-4',
    topology,
    target_polycount: targetPolycount,
    should_remesh: true,
    enable_pbr: enablePBR,
    should_texture: shouldTexture,
    symmetry_mode: symmetryMode,
    prompt: "dog"
  };

  try {
    console.log("Sending request to Meshy API...");
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );
    console.log('Meshy API Response:', response.data);
    return response.data.result?.task_id || response.data.result;
  } catch (error) {
    console.error('Error creating preview task:', error.response?.data || error.message);
    throw error;
  }
};

const pollPreview = async (taskId) => {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    try {
      const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
      console.log(`Checking preview status for taskId: ${taskId}`);
      const response = await axios.get(
        `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
        { headers }
      );

      const status = response.data?.status;
      console.log(`Preview status: ${status}`);

      if (status === 'SUCCEEDED') {
        return taskId;
      } else if (status === 'FAILED') {
        throw new Error('Preview task failed');
      }

      await sleep(5000);
      attempts++;
    } catch (error) {
      console.error('Error polling preview status:', error.response?.data || error.message);
      throw error;
    }
  }

  throw new Error('Preview polling timeout');
};

app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  console.log('Received a request to generate model...');
  try {
    if (!req.file) {
      console.error('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('Image received, converting to base64...');

    const selectedTopology = req.body.topology || 'triangle';
    const shouldTexture = req.body.shouldTexture === 'true';
    const enablePBR = req.body.enablePBR === 'true';

    const validSymmetryModes = ['off', 'auto', 'on'];
    const rawSymmetry = req.body.symmetryMode;
    const selectedSymmetryMode = validSymmetryModes.includes(rawSymmetry) ? rawSymmetry : 'auto';

    // ✅ Dynamische polycount uitlezen en valideren
    let targetPolycount = parseInt(req.body.targetPolycount);
    if (isNaN(targetPolycount) || targetPolycount < 100 || targetPolycount > 300000) {
      console.warn(`Ongeldige polycount ontvangen: ${req.body.targetPolycount}, standaard naar 30000.`);
      targetPolycount = 30000;
    }

    console.log(`Topology: ${selectedTopology}, Texture: ${shouldTexture}, Symmetry Mode: ${selectedSymmetryMode}, PBR: ${enablePBR}, Polycount: ${targetPolycount}`);

    const previewTaskId = await createPreviewTask(
      imageBase64,
      selectedTopology,
      shouldTexture,
      selectedSymmetryMode,
      enablePBR,
      targetPolycount
    );

    console.log(`Preview task gestart met taskId: ${previewTaskId}`);

    await pollPreview(previewTaskId);
    console.log('Preview task voltooid (geen refine-stap).');

    res.json({ taskId: previewTaskId, modelUrls: null });
  } catch (error) {
    console.error('Error tijdens modelgeneratie:', error);
    res.status(500).send('Error generating model.');
  }
});

app.get('/api/getModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`Received status request for taskId: ${taskId}`);

  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    console.log('Model status response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error retrieving model status:', error.response?.data || error.message);
    res.status(500).send('Error retrieving model status.');
  }
});

app.get('/api/proxyModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const format = req.query.format || 'glb';

  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

    const statusRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    const modelStatus = statusRes.data?.status;
    if (modelStatus !== 'SUCCEEDED') {
      console.warn(`Model not ready (status: ${modelStatus})`);
      return res.status(400).send(`Model not ready, status: ${modelStatus}`);
    }

    const urls = statusRes.data?.result?.model_urls;
    console.log("📦 Verkregen model_urls:", urls);

    if (!urls) {
      return res.status(500).send("Geen model_urls gevonden in API response.");
    }

    const modelUrl = urls[format];
    if (!modelUrl) {
      console.warn(`Format '${format}' niet beschikbaar. Beschikbare formaten: ${Object.keys(urls).join(', ')}`);
      return res.status(404).send(`Formaat '${format}' niet beschikbaar voor dit model.`);
    }

    const fileResponse = await axios.get(modelUrl, { responseType: 'arraybuffer' });

    const contentTypes = {
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
      usdz: 'model/vnd.usdz+zip',
      obj: 'text/plain',
      fbx: 'application/octet-stream'
    };

    const contentType = contentTypes[format] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.send(fileResponse.data);
  } catch (error) {
    console.error('Error fetching model:', error.response?.data || error.message);
    res.status(500).send('Error fetching model');
  }
});

app.use(express.static('frontend'));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
