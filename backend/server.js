const express = require('express'); 
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const app = express();
const port = 3000;

// ✅ CORS-configuratie
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5500'];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'), false);
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

const YOUR_API_KEY = 'msy_dummy_api_key_for_test_mode_12345678';
const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

// ▶️ Stap 1: Start preview
const createPreviewTask = async (imageBase64) => {
  const payload = {
    image_url: imageBase64,
    ai_model: 'meshy-4',
    topology: 'triangle',
    target_polycount: 30000,
    should_remesh: true,
    enable_pbr: false,
    should_texture: true,
    symmetry_mode: 'auto',
    prompt: "dog"  // Dit kan later door de gebruiker worden aangepast
  };

  try {
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d', // Correcte versie voor de preview endpoint
      payload,
      {
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📨 Antwoord van Meshy (preview):', JSON.stringify(response.data, null, 2));

    // ✅ Fix voor testmode string-response
    if (typeof response.data.result === 'string') {
      return response.data.result;
    } else if (response.data?.result?.task_id) {
      return response.data.result.task_id;
    } else {
      throw new Error('Geen geldig preview-resultaat ontvangen');
    }

  } catch (error) {
    console.error('❌ Meshy API fout (preview):', error.response?.data || error.message);
    throw new Error('Preview-task aanmaken mislukt');
  }
};

// 🔁 Stap 2: Poll preview
const pollPreview = async (taskId) => {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const res = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, { headers }); // Correcte versie voor de preview polling
    const status = res.data?.status;

    console.log(`⏳ Preview status poging ${attempts + 1}:`, status);

    if (status === 'SUCCEEDED') {
      return taskId;
    } else if (status === 'FAILED') {
      throw new Error('Preview task is mislukt');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Preview polling timeout');
};

// 🛠️ Stap 3: Start refine
const startRefineTask = async (previewTaskId) => {
  console.log('🔄 Start refine-task voor preview ID:', previewTaskId);

  const refineUrl = `https://api.meshy.ai/openapi/v1/image-to-3d/refine`; // Correcte versie voor refine
  console.log('🔗 Refine URL:', refineUrl);  // 🚨 Log refine URL

  const payload = {
    preview_task_id: previewTaskId
  };

  try {
    const response = await axios.post(
      refineUrl,
      payload,
      { headers }
    );

    console.log('📨 Antwoord van Meshy (refine):', JSON.stringify(response.data, null, 2));

    if (typeof response.data.result === 'string') {
      return response.data.result;
    } else if (response.data?.result?.task_id) {
      return response.data.result.task_id;
    } else {
      throw new Error('Geen refine taskId ontvangen');
    }
  } catch (error) {
    console.error('❌ Fout bij refine-aanroep:', error.response?.data || error.message);
    throw new Error('Fout bij starten refine task');
  }
};

// 🔁 Stap 4: Poll refine
const pollRefine = async (taskId) => {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const res = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/refine/${taskId}`, { headers }); // Correcte versie voor refine polling
    const status = res.data?.status;

    console.log(`⏳ Refine status poging ${attempts + 1}:`, status);

    if (status === 'SUCCEEDED') {
      return res.data;
    } else if (status === 'FAILED') {
      throw new Error('Refine task is mislukt');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Refine polling timeout');
};

// 🌐 Endpoint: Genereer model
app.post('/api/generateModel', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('Geen bestand geüpload.');

    const imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    console.log('🖼️ imageBase64 lengte:', imageBase64.length);

    console.log('🔄 Start preview-task...');
    const previewTaskId = await createPreviewTask(imageBase64);
    console.log('🟢 Preview task ID:', previewTaskId);

    await pollPreview(previewTaskId);
    console.log('✅ Preview klaar, refine wordt gestart...');

    const refineTaskId = await startRefineTask(previewTaskId);
    console.log('🔄 Refine gestart met ID:', refineTaskId);

    const refineResult = await pollRefine(refineTaskId);
    console.log('✅ Refine klaar, model gereed');

    res.json({ taskId: refineTaskId, modelUrls: refineResult.model_urls });

  } catch (error) {
    console.error('❌ Fout tijdens preview/refine:', error.message);
    res.status(500).send('Fout bij preview/refine polling');
  }
});

// 📂 Serveer frontend
app.use(express.static('frontend'));

app.listen(port, () => {
  console.log(`🚀 Server draait op http://localhost:${port}`);
});
