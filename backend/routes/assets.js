console.log('📁 Loading routes/assets.js...');

const express = require('express');
const multer = require('multer');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

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

// Configure multer with memory storage for manual uploads
const uploadFields = multer({ 
  storage: multer.memoryStorage(), // Use memory storage, then upload manually
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      console.log(`🔍 Processing file: ${file.originalname}, field: ${file.fieldname}, mimetype: ${file.mimetype}`);
      
      if (file.fieldname === 'modelFile') {
        const isGLB = file.mimetype === 'application/octet-stream' && file.originalname.toLowerCase().endsWith('.glb');
        const isGLTF = file.originalname.toLowerCase().endsWith('.gltf');
        
        if (isGLB || isGLTF) {
          console.log('✅ Model file accepted:', file.originalname);
          cb(null, true);
        } else {
          console.log('❌ Model file rejected:', file.originalname, file.mimetype);
          cb(new Error('Only .glb and .gltf files are allowed for model files'));
        }
      } else if (file.fieldname === 'previewImage') {
        const allowedImageTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
        ];
        
        if (allowedImageTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
          console.log('✅ Image file accepted:', file.originalname);
          cb(null, true);
        } else {
          console.log('❌ Image file rejected:', file.originalname, file.mimetype);
          cb(new Error('Only image files are allowed for preview images'));
        }
      } else {
        console.log('❌ Unexpected field:', file.fieldname);
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
console.log('📦 Multer configured with memory storage for manual uploads');

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

    // Manual file upload to Cloudinary (now with memory storage)
    if (cloudinaryAvailable && cloudinaryConfig) {
      console.log('☁️ Uploading files to Cloudinary with correct resource types...');
      
      // Upload model file as "raw" resource type
      console.log('📁 Uploading model file as RAW resource type...');
      try {
        const modelUpload = await new Promise((resolve, reject) => {
          cloudinaryConfig.cloudinary.uploader.upload_stream(
            {
              folder: 'dalma-ai/models',
              resource_type: 'raw', // Correct for 3D models
              public_id: `model-${name.replace(/\s+/g, '-')}-${Date.now()}`,
            },
            (error, result) => {
              if (error) {
                console.error('❌ Model upload error:', error);
                reject(error);
              } else {
                console.log('✅ Model uploaded as RAW:', result.secure_url);
                resolve(result);
              }
            }
          ).end(modelFile.buffer);
        });
        
        assetData.modelFile = {
          filename: modelFile.originalname,
          url: modelUpload.secure_url,
          publicId: modelUpload.public_id,
          size: modelFile.size
        };
      } catch (error) {
        console.error('❌ Model file upload failed:', error);
        throw error;
      }
      
      // Upload preview image as "image" resource type
      const previewImage = req.files?.previewImage?.[0];
      if (previewImage) {
        console.log('🖼️ Uploading preview image as IMAGE resource type...');
        try {
          const imageUpload = await new Promise((resolve, reject) => {
            cloudinaryConfig.cloudinary.uploader.upload_stream(
              {
                folder: 'dalma-ai/previews',
                resource_type: 'image', // Correct for images - this is the key fix!
                public_id: `preview-${name.replace(/\s+/g, '-')}-${Date.now()}`,
                transformation: [
                  { width: 800, height: 600, crop: 'limit' },
                  { quality: 'auto' }
                ]
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Image upload error:', error);
                  reject(error);
                } else {
                  console.log('✅ Preview image uploaded as IMAGE:', result.secure_url);
                  resolve(result);
                }
              }
            ).end(previewImage.buffer);
          });
          
          assetData.previewImage = {
            filename: previewImage.originalname,
            url: imageUpload.secure_url,
            publicId: imageUpload.public_id,
            size: previewImage.size
          };
        } catch (error) {
          console.error('❌ Preview image upload failed:', error);
          // Don't throw - preview image is optional
          console.log('⚠️ Continuing without preview image...');
        }
      }
    } else {
      console.log('💾 Cloudinary not available - using local storage fallback');
      assetData.modelFile = {
        filename: modelFile.originalname,
        url: 'memory://not-stored',
        publicId: 'memory-' + Date.now(),
        size: modelFile.size
      };
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
        createdAt: asset.createdAt,
        previewImage: assetData.previewImage ? {
          url: assetData.previewImage.url
        } : null,
        modelFile: assetData.modelFile ? {
          url: assetData.modelFile.url,
          filename: assetData.modelFile.filename
        } : null
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

// GET /api/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
  try {
    console.log('📥 GET /api/assets/' + req.params.id + ' called');
    
    if (!dbAvailable || !Asset) {
      return res.status(404).json({ error: 'Database not available' });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      console.log('❌ Asset not found:', req.params.id);
      return res.status(404).json({ error: 'Asset not found' });
    }

    console.log('✅ Found asset:', asset.name);
    res.json({
      message: 'Asset loaded successfully',
      asset
    });
    
  } catch (error) {
    console.error('❌ Error fetching asset:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch asset', 
      details: error.message 
    });
  }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', uploadFields, async (req, res) => {
  try {
    console.log('📝 PUT /api/assets/' + req.params.id + ' called');
    console.log('📄 Body keys:', Object.keys(req.body || {}));
    console.log('📁 Files keys:', Object.keys(req.files || {}));
    
    if (!dbAvailable || !Asset) {
      return res.status(404).json({ error: 'Database not available' });
    }
    
    // Find existing asset
    const existingAsset = await Asset.findById(req.params.id);
    if (!existingAsset) {
      console.log('❌ Asset not found:', req.params.id);
      return res.status(404).json({ error: 'Asset not found' });
    }

    console.log('🔍 Found existing asset:', existingAsset.name);
    
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

    console.log('✅ Validation passed');
    
    // Prepare updated asset data
    const updateData = {
      name,
      breed,
      icon: req.body.icon || existingAsset.icon || '🐕',
      polygons: parseInt(req.body.polygons) || existingAsset.polygons || 30000,
      popularity: parseInt(req.body.popularity) || existingAsset.popularity || 0,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : existingAsset.tags || [],
      description,
      updatedAt: new Date()
    };

    // Handle file uploads if provided
    const modelFile = req.files?.modelFile?.[0];
    const previewImage = req.files?.previewImage?.[0];

    if (cloudinaryAvailable && cloudinaryConfig) {
      // Handle model file upload if provided
      if (modelFile) {
        console.log('📁 Updating model file...');
        try {
          // Delete old model file first
          if (existingAsset.modelFile?.publicId && existingAsset.modelFile.publicId.startsWith('model-')) {
            console.log('🗑️ Deleting old model file:', existingAsset.modelFile.publicId);
            await cloudinaryConfig.deleteFile(existingAsset.modelFile.publicId, 'raw');
          }
          
          // Upload new model file
          const modelUpload = await new Promise((resolve, reject) => {
            cloudinaryConfig.cloudinary.uploader.upload_stream(
              {
                folder: 'dalma-ai/models',
                resource_type: 'raw',
                public_id: `model-${name.replace(/\s+/g, '-')}-${Date.now()}`,
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Model upload error:', error);
                  reject(error);
                } else {
                  console.log('✅ Model uploaded as RAW:', result.secure_url);
                  resolve(result);
                }
              }
            ).end(modelFile.buffer);
          });
          
          updateData.modelFile = {
            filename: modelFile.originalname,
            url: modelUpload.secure_url,
            publicId: modelUpload.public_id,
            size: modelFile.size
          };
          
          // Update file size
          updateData.fileSize = `${(modelFile.size / (1024 * 1024)).toFixed(1)} MB`;
          
        } catch (error) {
          console.error('❌ Model file upload failed:', error);
          return res.status(500).json({ error: 'Failed to upload model file', details: error.message });
        }
      }
      
      // Handle preview image upload if provided
      if (previewImage) {
        console.log('🖼️ Updating preview image...');
        try {
          // Delete old preview image first
          if (existingAsset.previewImage?.publicId && existingAsset.previewImage.publicId.startsWith('preview-')) {
            console.log('🗑️ Deleting old preview image:', existingAsset.previewImage.publicId);
            await cloudinaryConfig.deleteFile(existingAsset.previewImage.publicId, 'image');
          }
          
          // Upload new preview image
          const imageUpload = await new Promise((resolve, reject) => {
            cloudinaryConfig.cloudinary.uploader.upload_stream(
              {
                folder: 'dalma-ai/previews',
                resource_type: 'image',
                public_id: `preview-${name.replace(/\s+/g, '-')}-${Date.now()}`,
                transformation: [
                  { width: 800, height: 600, crop: 'limit' },
                  { quality: 'auto' }
                ]
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Image upload error:', error);
                  reject(error);
                } else {
                  console.log('✅ Preview image uploaded as IMAGE:', result.secure_url);
                  resolve(result);
                }
              }
            ).end(previewImage.buffer);
          });
          
          updateData.previewImage = {
            filename: previewImage.originalname,
            url: imageUpload.secure_url,
            publicId: imageUpload.public_id,
            size: previewImage.size
          };
          
        } catch (error) {
          console.error('❌ Preview image upload failed:', error);
          // Don't fail the whole update for optional preview image
          console.log('⚠️ Continuing without updating preview image...');
        }
      }
    }

    console.log('💾 Updating asset in database...');
    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    console.log('✅ Asset updated successfully:', updatedAsset._id);

    res.json({
      message: 'Asset updated successfully',
      asset: {
        _id: updatedAsset._id,
        name: updatedAsset.name,
        breed: updatedAsset.breed,
        icon: updatedAsset.icon,
        fileSize: updatedAsset.fileSize,
        polygons: updatedAsset.polygons,
        description: updatedAsset.description,
        tags: updatedAsset.tags,
        createdAt: updatedAsset.createdAt,
        updatedAt: updatedAsset.updatedAt,
        previewImage: updatedAsset.previewImage ? {
          url: updatedAsset.previewImage.url
        } : null,
        modelFile: updatedAsset.modelFile ? {
          url: updatedAsset.modelFile.url,
          filename: updatedAsset.modelFile.filename
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error updating asset:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to update asset', 
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