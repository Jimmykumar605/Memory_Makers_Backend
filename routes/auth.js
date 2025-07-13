// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const login = require("../controllers/Login");
const { PhotographerImage } = require("../models/PhotographerImage");
const fs = require('fs');
const dotenv = require("dotenv");
dotenv.config();
const multer = require("multer");
const path = require("path");
const photographerSignup = require("../controllers/PhotographerSignup");
const customerSignup = require("../controllers/CustomerSignup");
const updatePhotographer = require("../controllers/PhotographerSignup");

// Configure multer for file upload
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

// UPDATE PHOTOGRAPHER
router.post("/update/photographer/:id", upload.single("profile"), async (req, res) => {
  try {
    updatePhotographer.updatePhotographer(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    login.login(req, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// CUSTOMER SIGNUP
router.post("/customer/signup", async (req, res) => {
  try {
    customerSignup.customerSignup(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// PHOTOGRAPHER SIGNUP
router.post("/photographer/signup", async (req, res) => {
  try {
    photographerSignup.photographerSignup(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, user_type } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      user_type,
    });

    await user.save();
    res.json({ success: true, message: "User registered", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// UPLOAD PHOTOGRAPHER IMAGE
router.post("/photographers/upload-image", upload.single("image"), async (req, res) => {
  try {
    photographerSignup.photographerImagesUpload(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET PHOTOGRAPHER BY ID
router.get("/photographers/:id", async (req, res) => {
  try {
    photographerSignup.getPhotographer(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET PHOTOGRAPHER IMAGES BY ID AND CATEGORY
router.get("/photographers/:id/images/:category", async (req, res) => {
  try {
    const { id, category } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Photographer not found"
      });
    }

    if (user.user_type !== "photographer") {
      return res.status(400).json({
        success: false,
        message: "User is not a photographer"
      });
    }

    // Find the photographer's image document
    const photographerImage = await PhotographerImage.findOne({ photographerId: id });
    
    if (!photographerImage) {
      return res.status(404).json({
        success: false,
        message: "No images found for this photographer"
      });
    }

    // Check if the category exists in the photographer's images
    const categoryExists = photographerImage.images.some(img => img.category === category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found in photographer's images"
      });
    }

    // Filter images by category
    const categoryImages = photographerImage.images.filter(img => img.category === category);

    if (categoryImages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No images found for this category"
      });
    }

    return res.status(200).json({
      success: true,
      images: categoryImages
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET ALL PHOTOGRAPHERS
router.get("/all_photographers", async (req, res) => {
  try {
    photographerSignup.getAllPhotographers(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// ADD TO BEST IMAGES
router.post("/add_to_best_images", upload.none(), async (req, res) => {
  try {
    let data = req.body || {};

    if (req.body.data && typeof req.body.data === 'string') {
      try {
        data = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in 'data' field"
        });
      }
    }

    const userId = data.userId || data.photographerId;
    const imageId = data.imageId;
    const category = data.category;

    if (!userId || !imageId || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing userId/imageId/category"
      });
    }

    const user = await User.findById(userId);
    if (!user || user.user_type !== "photographer") {
      return res.status(400).json({
        success: false,
        message: "Invalid photographer"
      });
    }

    // Step 1: Find the document and image
    const photographerDoc = await PhotographerImage.findOne({
      photographerId: userId,
      'images._id': imageId,
      'images.category': category
    });

    if (!photographerDoc) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Step 2: Update the best_image flag
    const image = photographerDoc.images.id(imageId);
    image.best_image = "Y";
    await photographerDoc.save();

    return res.status(200).json({
      success: true,
      message: "Image marked as best and saved successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// REMOVE FROM BEST IMAGES
router.put("/remove_from_best_images", upload.none(), async (req, res) => {
  try {
    let data = req.body || {};

    if (req.body.data && typeof req.body.data === 'string') {
      try {
        data = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in 'data' field"
        });
      }
    }

    const userId = data.userId || data.photographerId;
    const imageId = data.imageId;
    const category = data.category;

    if (!userId || !imageId || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing userId/imageId/category"
      });
    }

    const user = await User.findById(userId);
    if (!user || user.user_type !== "photographer") {
      return res.status(400).json({
        success: false,
        message: "Invalid photographer"
      });
    }

    // Step 1: Find the document and image
    const photographerDoc = await PhotographerImage.findOne({
      photographerId: userId,
      'images._id': imageId,
      'images.category': category
    });

    if (!photographerDoc) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Step 2: Update the best_image flag
    const image = photographerDoc.images.id(imageId);
    image.best_image = "N";
    await photographerDoc.save();

    return res.status(200).json({
      success: true,
      message: "Image removed from best images successfully"
    });

  } catch (error) {
    console.error("Error removing image from best images:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// DELETE PHOTOGRAPHER IMAGE
router.delete("/photographers/delete-image", async (req, res) => {
  try {
    photographerSignup.photographersImageDelete(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;
