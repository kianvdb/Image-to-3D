require('dotenv').config();
console.log("🛠️ Loaded API Key:", process.env.MESHY_API_KEY);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
// CORS configuration (replace your existing corsOptions in server.js)
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:3001', 
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add Live Server origins
    'http://127.0.0.1:59063',
    'http://localhost:59063',
    // Add common Live Server ports
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5502',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5502',
    // Allow any localhost/127.0.0.1 with any port for development
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
// MongoDB connection (replace your existing connectDB function)
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dalma-ai');
    console.log(`🗄️ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 Make sure your MongoDB URI and credentials are correct in .env');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Existing multer setup for Meshy
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const YOUR_API_KEY = process.env.MESHY_API_KEY || 'msy_dgO5o6R6IKwwBbWYWrerMkUC4iMJSZPHPMYI';

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'DALMA AI Backend is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Import and use asset routes
const assetRoutes = require('./routes/assets');
app.use('/api/assets', assetRoutes);

// Your existing Meshy functions (keeping them exactly the same)
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
    console.log("🚀 Sending request to Meshy API...");
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      payload,
      { headers }
    );
    console.log('✅ Meshy API Response:', response.data);
    return response.data.result?.task_id || response.data.result;
  } catch (error) {
    console.error('❌ Error creating preview task:', error.response?.data || error.message);
    throw error;
  }
};

// Enhanced generateModel endpoint that also saves to database
app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  console.log('📥 Received a request to generate model...');
  try {
    if (!req.file) {
      console.error('❌ No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('🖼️ Image received, converting to base64...');

    const selectedTopology = req.body.topology || 'triangle';
    const shouldTexture = req.body.shouldTexture === 'true';
    const enablePBR = req.body.enablePBR === 'true';
    const validSymmetryModes = ['off', 'auto', 'on'];
    const rawSymmetry = req.body.symmetryMode;
    const selectedSymmetryMode = validSymmetryModes.includes(rawSymmetry) ? rawSymmetry : 'auto';

    let targetPolycount = parseInt(req.body.targetPolycount);
    if (isNaN(targetPolycount) || targetPolycount < 100 || targetPolycount > 300000) {
      console.warn(`⚠️ Invalid polycount received: ${req.body.targetPolycount}, defaulting to 30000.`);
      targetPolycount = 30000;
    }

    console.log(`🔧 Parameters:
      Topology: ${selectedTopology}
      Texture: ${shouldTexture}
      Symmetry Mode: ${selectedSymmetryMode}
      PBR: ${enablePBR}
      Polycount: ${targetPolycount}
    `);

    const previewTaskId = await createPreviewTask(
      imageBase64,
      selectedTopology,
      shouldTexture,
      selectedSymmetryMode,
      enablePBR,
      targetPolycount
    );

    console.log(`✅ Preview task started with taskId: ${previewTaskId}`);
    
    // Store metadata for potential asset creation
    req.app.locals.pendingAssets = req.app.locals.pendingAssets || {};
    req.app.locals.pendingAssets[previewTaskId] = {
      originalImage: imageBase64,
      parameters: {
        topology: selectedTopology,
        shouldTexture,
        symmetryMode: selectedSymmetryMode,
        enablePBR,
        targetPolycount
      },
      createdAt: new Date()
    };

    res.json({ taskId: previewTaskId, modelUrls: null });

  } catch (error) {
    console.error('❌ Error during model generation:', error);
    res.status(500).send('Error generating model.');
  }
});

// All your other existing endpoints...
app.get('/api/getModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`🔍 Received status request for taskId: ${taskId}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('📦 Model status response:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error retrieving model status:', error.response?.data || error.message);
    res.status(500).send('Error retrieving model status.');
  }
});

app.get('/api/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  console.log(`🔍 Received status request (alias /status) for taskId: ${taskId}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const response = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );
    console.log('📦 Model status response (via /status):', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error retrieving model status (/status route):', error.response?.data || error.message);
    res.status(500).send('Error retrieving model status.');
  }
});

app.get('/api/proxyModel/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const format = req.query.format || 'glb';

  console.log(`📥 Fetching model for taskId: ${taskId} in format: ${format}`);
  try {
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

    const statusRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    const modelStatus = statusRes.data?.status;
    if (modelStatus !== 'SUCCEEDED') {
      console.warn(`⚠️ Model not ready (status: ${modelStatus})`);
      return res.status(400).send(`Model not ready, status: ${modelStatus}`);
    }

    const result = statusRes.data?.result || statusRes.data;
    const urls = result?.model_urls;

    console.log("📦 Retrieved model_urls:", urls);

    if (!urls || typeof urls !== 'object') {
      console.error("❌ model_urls missing or invalid in API response.");
      return res.status(500).send("No model_urls found in API response.");
    }

    const modelUrl = urls[format];
    if (!modelUrl) {
      console.warn(`⚠️ Format '${format}' not available. Available formats: ${Object.keys(urls).join(', ')}`);
      return res.status(404).send(`Format '${format}' not available for this model.`);
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
    console.error('❌ Error fetching model:', error.response?.data || error.message);
    res.status(500).send('Error fetching model');
  }
});

// Endpoint to save completed Meshy model as asset
app.post('/api/saveAsset/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { name, breed, description } = req.body;
  
  try {
    // Get model status and URLs
    const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
    const statusRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
      { headers }
    );

    if (statusRes.data?.status !== 'SUCCEEDED') {
      return res.status(400).json({ error: 'Model not ready for saving' });
    }

    const modelUrls = statusRes.data?.result?.model_urls || statusRes.data?.model_urls;
    const glbUrl = modelUrls?.glb;
    
    if (!glbUrl) {
      return res.status(400).json({ error: 'GLB model URL not available' });
    }

    // Use the asset creation endpoint
    const assetData = {
      taskId,
      name: name || `Generated Dog Model`,
      breed: breed || 'Unknown Breed',
      icon: '🐕',
      modelUrl: glbUrl,
      polygons: 30000, // Default, could be extracted from metadata
      description: description || 'Generated 3D dog model from uploaded image',
      tags: 'generated,meshy,ai'
    };

    // Call the asset creation endpoint
    const assetResponse = await axios.post(`http://localhost:${port}/api/assets/from-meshy`, assetData);
    
    res.json(assetResponse.data);
  } catch (error) {
    console.error('❌ Error saving asset:', error);
    res.status(500).json({ error: 'Failed to save asset' });
  }
});

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
  console.log(`📦 Assets API: http://localhost:${port}/api/assets`);
});