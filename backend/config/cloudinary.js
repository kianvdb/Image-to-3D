const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for 3D model files
const modelStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dalma-ai/models',
    resource_type: 'raw', // Important: raw allows any file type
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `model-${originalName}-${timestamp}`;
    },
  },
});

// Storage for preview images - FIXED VERSION
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dalma-ai/previews',
    resource_type: 'image',
    // Remove allowed_formats to be more permissive
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `preview-${originalName}-${timestamp}`;
    },
  },
});

// Helper function to delete files
const deleteFile = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType 
    });
    console.log('🗑️ File deleted from Cloudinary:', result);
    return result;
  } catch (error) {
    console.error('❌ Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Helper function to upload model file from URL (for Meshy integration)
const uploadFromUrl = async (url, filename) => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: 'dalma-ai/models',
      resource_type: 'raw',
      public_id: `model-${filename}-${Date.now()}`,
      overwrite: false
    });
    return {
      filename: filename,
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes
    };
  } catch (error) {
    console.error('❌ Error uploading file from URL:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  modelStorage,
  imageStorage,
  deleteFile,
  uploadFromUrl
};