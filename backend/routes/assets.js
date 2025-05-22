const express = require('express');
const multer = require('multer');
const Asset = require('../models/Asset');
const { modelStorage, imageStorage, deleteFile, uploadFromUrl } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for file uploads
const uploadFields = multer({
  storage: modelStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for 3D models
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'modelFile') {
      if (file.mimetype === 'application/octet-stream' || 
          file.originalname.toLowerCase().endsWith('.glb') ||
          file.originalname.toLowerCase().endsWith('.gltf')) {
        cb(null, true);
      } else {
        cb(new Error('Only .glb and .gltf files are allowed for model files'));
      }
    } else if (file.fieldname === 'previewImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for preview images'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
}).fields([
  { name: 'modelFile', maxCount: 1 },
  { name: 'previewImage', maxCount: 1 }
]);

// GET /api/assets - Get all assets
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      breed, 
      tags, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const query = { isActive: true };
    
    if (breed) {
      query.breed = new RegExp(breed, 'i');
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const assets = await Asset.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const totalAssets = await Asset.countDocuments(query);
    const totalPages = Math.ceil(totalAssets / limit);

    res.json({
      assets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAssets,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets: ' + error.message });
  }
});

// GET /api/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Increment views
    await asset.incrementViews();

    res.json(asset);
  } catch (error) {
    console.error('❌ Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset: ' + error.message });
  }
});

// POST /api/assets - Create new asset (manual upload)
router.post('/', uploadFields, async (req, res) => {
  try {
    console.log('📝 Creating new asset...');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);

    const {
      name,
      breed,
      icon,
      fileSize,
      polygons,
      popularity,
      tags,
      description
    } = req.body;

    if (!req.files?.modelFile?.[0]) {
      return res.status(400).json({ error: 'Model file is required' });
    }

    const modelFile = req.files.modelFile[0];
    const previewImage = req.files?.previewImage?.[0];

    const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const assetData = {
      name,
      breed,
      icon,
      fileSize: fileSize || `${(modelFile.size / (1024 * 1024)).toFixed(1)} MB`,
      polygons: parseInt(polygons) || 30000,
      popularity: parseInt(popularity) || 0,
      tags: parsedTags,
      description,
      modelFile: {
        filename: modelFile.originalname,
        url: modelFile.path,
        publicId: modelFile.filename,
        size: modelFile.size
      },
      generatedFromImage: false // This is a manual upload
    };

    if (previewImage) {
      assetData.previewImage = {
        filename: previewImage.originalname,
        url: previewImage.path,
        publicId: previewImage.filename,
        size: previewImage.size
      };
    }

    const asset = new Asset(assetData);
    await asset.save();

    console.log('✅ Asset created successfully:', asset._id);

    res.status(201).json({
      message: 'Asset created successfully',
      asset
    });
  } catch (error) {
    console.error('❌ Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset: ' + error.message });
  }
});

// POST /api/assets/from-meshy - Create asset from Meshy generation
router.post('/from-meshy', async (req, res) => {
  try {
    const {
      taskId,
      name,
      breed,
      icon,
      modelUrl,
      originalImageUrl,
      polygons,
      description,
      tags
    } = req.body;

    if (!taskId || !modelUrl) {
      return res.status(400).json({ error: 'TaskId and modelUrl are required' });
    }

    // Check if asset already exists for this taskId
    const existingAsset = await Asset.findByMeshyTask(taskId);
    if (existingAsset) {
      return res.json({
        message: 'Asset already exists for this task',
        asset: existingAsset
      });
    }

    // Upload model file to Cloudinary from Meshy URL
    const uploadedModel = await uploadFromUrl(modelUrl, `meshy-${taskId}`);

    const assetData = {
      name: name || `Generated ${breed || 'Dog'}`,
      breed: breed || 'Unknown Breed',
      icon: icon || '🐕',
      fileSize: `${(uploadedModel.size / (1024 * 1024)).toFixed(1)} MB`,
      polygons: parseInt(polygons) || 30000,
      popularity: 0,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : ['generated', 'meshy'],
      description: description || 'Generated 3D dog model from uploaded image',
      modelFile: uploadedModel,
      meshyTaskId: taskId,
      generatedFromImage: true,
      originalImageUrl: originalImageUrl || null
    };

    const asset = new Asset(assetData);
    await asset.save();

    console.log(`✅ Asset created from Meshy task ${taskId}`);

    res.status(201).json({
      message: 'Asset created from Meshy generation',
      asset
    });
  } catch (error) {
    console.error('❌ Error creating asset from Meshy:', error);
    res.status(500).json({ error: 'Failed to create asset from Meshy generation: ' + error.message });
  }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Delete files from Cloudinary
    if (asset.modelFile?.publicId) {
      await deleteFile(asset.modelFile.publicId, 'raw');
    }
    
    if (asset.previewImage?.publicId) {
      await deleteFile(asset.previewImage.publicId, 'image');
    }

    await Asset.findByIdAndDelete(req.params.id);

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset: ' + error.message });
  }
});

// GET /api/assets/stats/popular - Get popular assets
router.get('/stats/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const assets = await Asset.findPopular(parseInt(limit));
    res.json(assets);
  } catch (error) {
    console.error('❌ Error fetching popular assets:', error);
    res.status(500).json({ error: 'Failed to fetch popular assets: ' + error.message });
  }
});

// GET /api/assets/stats/breeds - Get all available breeds
router.get('/stats/breeds', async (req, res) => {
  try {
    const breeds = await Asset.distinct('breed', { isActive: true });
    res.json(breeds.sort());
  } catch (error) {
    console.error('❌ Error fetching breeds:', error);
    res.status(500).json({ error: 'Failed to fetch breeds: ' + error.message });
  }
});

module.exports = router;