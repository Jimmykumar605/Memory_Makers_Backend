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
    
    // Get all photographer images with categories
    const photographerImages = await PhotographerImage.find();
    
    // Map photographers with their images and categories
    const photographersWithCategories = photographers.map(photographer => {
      const images = photographerImages
        .find(pi => pi.photographerId.toString() === photographer._id.toString())
        ?.images || [];
      
      // Group images by category
      const categories = images.reduce((acc, image) => {
        if (!acc[image.category]) {
          acc[image.category] = [];
        }
        acc[image.category].push(image.imageUrl);
        return acc;
      }, {});
      
      return {
        id: photographer._id,
        name: photographer.name,
        email: photographer.email,
        phone: photographer.phone,
        city: photographer.city,
        language: photographer.language,
        profileImage: photographer.profileImage,
        categories
      };
    });

    return res.status(200).json({
      success: true,
      photographers: photographersWithCategories
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
router.post("/add_to_best_images",upload.none(), async (req, res) => {
  try {
    // Get the data from either form data or JSON body
    const data = req.body || {};
    
    // Handle form data
    if (req.body && typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body);
      } catch (e) {
        // If not JSON, treat as form data
        data = {
          userId: req.body.userId || req.body.photographerId,
          imageId: req.body.imageId,
          category: req.body.category
        };
      }
    }

    // Verify required fields
    if (!data.userId && !data.photographerId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or photographerId"
      });
    }

    if (!data.imageId || !data.category) {
      return res.status(400).json({
        success: false,
        message: "Missing imageId or category"
      });
    }

    const userId = data.userId || data.photographerId;
    const imageId = data.imageId;
    const category = data.category;

    // Verify photographer exists
    const user = await User.findById(userId);
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

    // Find and update the image
    const result = await PhotographerImage.findOneAndUpdate(
      {
        photographerId: userId,
        'images._id': imageId,
        'images.category': category
      },
      {
        $set: {
          'images.$.best_image': 'Y'
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

    return res.status(200).json({
      success: true,
      message: "Image marked as best image successfully"
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
    const { imageId, userId, category } = req.body;

    // Find and update the image
    const result = await PhotographerImage.findOneAndUpdate(
      {
        photographerId: userId,
        'images._id': imageId,
        'images.category': category
      },
      {
        $set: {
          'images.$.best_image': 'N'
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

    res.status(200).json({
      success: true,
      message: "Image removed from best images",
      data: result
    });
  } catch (error) {
    console.error("Error removing image from best images:", error);
    res.status(500).json({
      success: false,
      message: "Error removing image from best images",
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
