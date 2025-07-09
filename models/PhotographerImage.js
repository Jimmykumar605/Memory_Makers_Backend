const mongoose = require("mongoose");
const multer = require("multer");

const photographerImageSchema = new mongoose.Schema({
  photographerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  images: [{
    imageUrl: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed!"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const PhotographerImage = mongoose.model("PhotographerImage", photographerImageSchema);

module.exports = {
  PhotographerImage,
  upload
};
