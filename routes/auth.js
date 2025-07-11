// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const { PhotographerImage } = require("../models/PhotographerImage");
const fs = require('fs');

// Dummy JWT secret (use .env for production)
const JWT_SECRET = "My$3cur3_JWT_Secr3t_K3y@2024!";

const multer = require("multer");
const path = require("path");

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
    const { name, email, phone, city, language } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update user details
    user.name = name;
    user.email = email;
    user.phone = phone;
    user.city = city;
    user.language = language;

    // Handle profile image upload if provided
    if (req.file) {
      // Store relative path instead of full path
      user.profileImage = `uploads/${req.file.filename}`;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Photographer profile updated successfully",
      user
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

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1d" });

    return res.json({
      success: true,
      message: "Login successful",
      user,
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// CUSTOMER SIGNUP
router.post("/customer/signup", async (req, res) => {
  const { name, user_email, user_password, confirm_password, user_login_id, user_type } = req.body;

  try {
    // Validate passwords match
    if (user_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: user_email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(user_password, 10);

    // Create new user
    const user = new User({
      name,
      email: user_email,
      password: hashedPassword,
      user_type: "customer"
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Customer registration successful"
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

// PHOTOGRAPHER SIGNUP
router.post("/photographer/signup", async (req, res) => {
  const { name, user_email, user_password, phone, city, language, user_login_id, user_type } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: user_email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(user_password, 10);

    // Create new user
    const user = new User({
      name,
      email: user_email,
      password: hashedPassword,
      user_type: "photographer",
      phone,
      city,
      language
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Photographer registration successful"
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
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    // Get category from form data
    const category = req.body.category;
    const photographerId = req.body.photographerId;

    // Validate required fields
    if (!category || !photographerId) {
      return res.status(400).json({
        success: false,
        message: "Category and photographerId are required"
      });
    }

    // Verify photographer exists and is valid
    const user = await User.findById(photographerId);
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

    // Store relative path instead of full path
    const imageUrl = `uploads/${req.file.filename}`;
    
    // Find or create photographer's image document
    let photographerImage = await PhotographerImage.findOne({ photographerId });
    if (!photographerImage) {
      photographerImage = new PhotographerImage({
        photographerId,
        images: []
      });
    }

    // Add new image to array
    photographerImage.images.push({
      imageUrl,
      category,
      uploadedAt: new Date()
    });

    await photographerImage.save();

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageUrl,
        category,
        uploadedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET PHOTOGRAPHER IMAGES BY ID
router.get("/photographers/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
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

    return res.status(200).json({
      success: true,
      images: photographerImage.images
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
    // Get all photographers
    const photographers = await User.find({ user_type: "photographer" });
    
    // Get all photographer images
    const photographerImages = await PhotographerImage.find();
    
    // Map photographers with their best images
    const photographersWithBestImages = photographers.map(photographer => {
      const photographerImagesData = photographerImages
        .find(pi => pi.photographerId.toString() === photographer._id.toString());
      // Get best images
      const bestImages = photographerImagesData?.images.filter(img => img?.best_image === 'Y');
      return {
        ...photographer.toObject(),
        best_images: bestImages
      };
    });

    return res.status(200).json({
      success: true,
      photographers: photographersWithBestImages
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
    const { imageId, photographerId, category } = req.body;

    // Verify photographer exists and is valid
    const user = await User.findById(photographerId);
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

    // First find the image to get its URL
    const photographerImage = await PhotographerImage.findOne({
      photographerId,
      'images._id': imageId,
      'images.category': category
    });

    if (!photographerImage) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Get the image URL
    const image = photographerImage.images.find(img => 
      img._id.toString() === imageId && img.category === category
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Now delete the image from the database
    const result = await PhotographerImage.findOneAndUpdate(
      { photographerId },
      { 
        $pull: { 
          images: { 
            _id: imageId,
            category: category
          }
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Delete the physical file from uploads directory
    try {
      const imagePath = path.join(__dirname, "..", image.imageUrl);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err.message}`);
        }
      });
    } catch (err) {
      console.error(`Error deleting file: ${err.message}`);
    }

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully"
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

module.exports = router;
