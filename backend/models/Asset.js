const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    maxlength: [100, 'Asset name cannot exceed 100 characters']
  },
  breed: {
    type: String,
    required: [true, 'Dog breed is required'],
    trim: true,
    maxlength: [50, 'Breed name cannot exceed 50 characters']
  },
  icon: {
    type: String,
    required: [true, 'Icon is required'],
    maxlength: [10, 'Icon cannot exceed 10 characters']
  },
  fileSize: {
    type: String,
    required: [true, 'File size is required'],
    trim: true
  },
  polygons: {
    type: Number,
    required: [true, 'Polygon count is required'],
    min: [100, 'Polygon count must be at least 100'],
    max: [1000000, 'Polygon count cannot exceed 1,000,000']
  },
  popularity: {
    type: Number,
    required: [true, 'Popularity rating is required'], 
    min: [0, 'Popularity must be between 0 and 100'],
    max: [100, 'Popularity must be between 0 and 100'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  modelFile: {
    filename: {
      type: String,
      required: [true, 'Model file is required']
    },
    url: {
      type: String,
      required: [true, 'Model file URL is required']
    },
    publicId: {
      type: String,
      required: [true, 'Model file public ID is required']
    },
    size: {
      type: Number,
      required: true
    }
  },
  previewImage: {
    filename: String,
    url: String,
    publicId: String,
    size: Number
  },
  downloads: {
    type: Number,
    default: 0,
    min: 0
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  // Integration with your existing Meshy workflow
  meshyTaskId: {
    type: String,
    sparse: true,
    unique: true // Only for models generated through Meshy
  },
  generatedFromImage: {
    type: Boolean,
    default: false
  },
  originalImageUrl: {
    type: String,
    sparse: true // Only for models generated from images
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for search performance
AssetSchema.index({ name: 'text', breed: 'text', description: 'text' });
AssetSchema.index({ breed: 1 });
AssetSchema.index({ popularity: -1 });
AssetSchema.index({ createdAt: -1 });

// Instance methods
AssetSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

AssetSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

AssetSchema.methods.updatePopularity = function() {
  const downloadWeight = 10;
  const viewWeight = 1;
  const totalScore = (this.downloads * downloadWeight) + (this.views * viewWeight);
  this.popularity = Math.min(100, Math.floor(totalScore / 10));
  return this.save();
};

// Static methods
AssetSchema.statics.findByBreed = function(breed) {
  return this.find({ breed: new RegExp(breed, 'i'), isActive: true });
};

AssetSchema.statics.findPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ popularity: -1 })
    .limit(limit);
};

AssetSchema.statics.findByMeshyTask = function(taskId) {
  return this.findOne({ meshyTaskId: taskId });
};

module.exports = mongoose.model('Asset', AssetSchema);