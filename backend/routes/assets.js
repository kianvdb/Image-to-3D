console.log('📁 Loading routes/assets.js...');

const express = require('express');
const multer = require('multer');
const router = express.Router();

// Import models and config with better error handling
let Asset, cloudinaryConfig;
let dbAvailable = false;
let cloudinaryAvailable = false;

try {
  Asset = require('../models/Asset');
  dbAvailable = true;
  console.log('✅ Asset model loaded');
} catch (error) {
  console.error('❌ Could not load Asset model:', error.message);
}

try {
  cloudinaryConfig = require('../config/cloudinary');
  cloudinaryAvailable = true;
  console.log('✅ Cloudinary config loaded');
} catch (error) {
  console.error('❌ Could not load cloudinary config:', error.message);
}

console.log('🛤️ Router created successfully');

// Configure multer with fallback
let uploadFields;

try {
  if (cloudinaryAvailable && cloudinaryConfig.modelStorage) {
    // Use Cloudinary storage
    uploadFields = multer({
      storage: cloudinaryConfig.modelStorage,
      limits: { fileSize: 100 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        try {
          if (file.fieldname === 'modelFile') {
            if (file.mimetype === 'application/octet-stream' || 
                file.originalname.toLowerCase().endsWith('.glb') ||
                file.originalname.toLowerCase().endsWith('.gltf')) {
              cb(null, true);
            } else {
              cb(new Error('Only .glb and .gltf files are allowed'));
            }
          } else if (file.fieldname === 'previewImage') {
            if (file.mimetype.startsWith('image/')) {
              cb(null, true);
            } else {
              cb(new Error('Only image files are allowed'));
            }
          } else {
            cb(new Error('Unexpected field: ' + file.fieldname));
          }
        } catch (err) {
          console.error('❌ File filter error:', err);
          cb(err);
        }
      }
    }).fields([
      { name: 'modelFile', maxCount: 1 },
      { name: 'previewImage', maxCount: 1 }
    ]);
    console.log('📦 Multer configured with Cloudinary storage');
  } else {
    throw new Error('Cloudinary not available');
  }
} catch (error) {
  console.log('⚠️ Falling back to memory storage:', error.message);
  // Use memory storage as fallback
  uploadFields = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
  }).fields([
    { name: 'modelFile', maxCount: 1 },
    { name: 'previewImage', maxCount: 1 }
  ]);
  console.log('📦 Multer configured with memory storage');
}

// GET /api/assets
router.get('/', async (req, res) => {
  try {
    console.log('📥 GET /api/assets called');
    
    if (!dbAvailable || !Asset) {
      console.log('⚠️ Database not available, returning empty result');
      return res.json({
        message: 'Database not available',
        assets: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalAssets: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    // Simple query for now
    const assets = await Asset.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20);

    console.log(`📊 Found ${assets.length} assets`);

    res.json({
      message: 'Assets loaded successfully',
      assets,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalAssets: assets.length,
        hasNextPage: false,
        hasPrevPage: false
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /api/assets:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch assets', 
      details: error.message 
    });
  }
});

// POST /api/assets - Create new asset
router.post('/', uploadFields, async (req, res) => {
  try {
    console.log('📝 POST /api/assets called');
    console.log('📄 Body keys:', Object.keys(req.body || {}));
    console.log('📁 Files keys:', Object.keys(req.files || {}));
    
    // Extract and validate form data
    const name = req.body.name?.trim();
    const breed = req.body.breed?.trim();
    const description = req.body.description?.trim();

    console.log('🔍 Validating required fields...');
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!breed) {
      return res.status(400).json({ error: 'Breed is required' });
    }
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const modelFile = req.files?.modelFile?.[0];
    if (!modelFile) {
      return res.status(400).json({ error: 'Model file is required' });
    }

    console.log('✅ Validation passed');
    
    // If no database, return success without saving
    if (!dbAvailable || !Asset) {
      console.log('⚠️ Database not available, returning mock success');
      return res.json({
        message: 'Asset data received (database not available)',
        asset: {
          _id: 'mock-' + Date.now(),
          name,
          breed,
          description,
          modelFile: modelFile.originalname
        }
      });
    }

    // Prepare asset data
    const assetData = {
      name,
      breed,
      icon: req.body.icon || '🐕',
      fileSize: req.body.fileSize || `${(modelFile.size / (1024 * 1024)).toFixed(1)} MB`,
      polygons: parseInt(req.body.polygons) || 30000,
      popularity: parseInt(req.body.popularity) || 0,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      description,
      generatedFromImage: false
    };

    // Handle file storage
    if (cloudinaryAvailable && modelFile.path) {
      console.log('☁️ Using Cloudinary file paths');
      assetData.modelFile = {
        filename: modelFile.originalname,
        url: modelFile.path,
        publicId: modelFile.filename,
        size: modelFile.size
      };
    } else {
      console.log('💾 Using memory storage (files not permanently stored)');
      assetData.modelFile = {
        filename: modelFile.originalname,
        url: 'memory://not-stored',
        publicId: 'memory-' + Date.now(),
        size: modelFile.size
      };
    }

    // Handle preview image if present
    const previewImage = req.files?.previewImage?.[0];
    if (previewImage) {
      if (cloudinaryAvailable && previewImage.path) {
        assetData.previewImage = {
          filename: previewImage.originalname,
          url: previewImage.path,
          publicId: previewImage.filename,
          size: previewImage.size
        };
      }
    }

    console.log('💾 Saving to database...');
    const asset = new Asset(assetData);
    await asset.save();

    console.log('✅ Asset saved successfully:', asset._id);

    res.status(201).json({
      message: 'Asset created successfully',
      asset: {
        _id: asset._id,
        name: asset.name,
        breed: asset.breed,
        icon: asset.icon,
        fileSize: asset.fileSize,
        polygons: asset.polygons,
        description: asset.description,
        createdAt: asset.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /api/assets:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create asset', 
      details: error.message 
    });
  }
});



// DELETE /api/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/assets/' + req.params.id + ' called');
    
    if (!dbAvailable || !Asset) {
      return res.status(404).json({ error: 'Database not available' });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      console.log('❌ Asset not found:', req.params.id);
      return res.status(404).json({ error: 'Asset not found' });
    }

    console.log('🔍 Found asset to delete:', asset.name);

    // Delete files from Cloudinary if available
    if (cloudinaryAvailable && cloudinaryConfig) {
      try {
        if (asset.modelFile?.publicId && asset.modelFile.publicId !== 'memory-' + Date.now()) {
          console.log('🗑️ Deleting model file from Cloudinary:', asset.modelFile.publicId);
          await cloudinaryConfig.deleteFile(asset.modelFile.publicId, 'raw');
        }
        
        if (asset.previewImage?.publicId) {
          console.log('🗑️ Deleting preview image from Cloudinary:', asset.previewImage.publicId);
          await cloudinaryConfig.deleteFile(asset.previewImage.publicId, 'image');
        }
      } catch (cloudinaryError) {
        console.error('⚠️ Error deleting files from Cloudinary:', cloudinaryError.message);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await Asset.findByIdAndDelete(req.params.id);
    console.log('✅ Asset deleted from database');

    res.json({ 
      message: 'Asset deleted successfully',
      deletedAsset: {
        id: asset._id,
        name: asset.name
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting asset:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete asset', 
      details: error.message 
    });
  }
});




// GET /api/assets/stats/breeds
router.get('/stats/breeds', async (req, res) => {
  try {
    console.log('📊 GET /api/assets/stats/breeds called');
    
    if (!dbAvailable || !Asset) {
      return res.json([]);
    }
    
    const breeds = await Asset.distinct('breed', { isActive: true });
    console.log(`📊 Found ${breeds.length} breeds`);
    res.json(breeds.sort());
    
  } catch (error) {
    console.error('❌ Error fetching breeds:', error.message);
    res.status(500).json({ error: 'Failed to fetch breeds' });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('❌ Router error:', error.message);
  console.error('Stack:', error.stack);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  res.status(500).json({ error: 'Internal server error: ' + error.message });
});

console.log('✅ Asset routes ready to export');
module.exports = router;