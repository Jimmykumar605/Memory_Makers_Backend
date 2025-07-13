const User = require("../models/User");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { PhotographerImage } = require("../models/PhotographerImage");
dotenv.config();
const photographerSignup = async (req, res) => {
    const { name, user_email, user_password, phone, city, language, experience } = req.body;

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
      language,
      experience
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
};
const getPhotographer = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the photographer
        const photographer = await User.findById(id);
        
        if (!photographer) {
          return res.status(404).json({
            success: false,
            message: "Photographer not found"
          });
        }
    
        if (photographer.user_type !== "photographer") {
          return res.status(400).json({
            success: false,
            message: "User is not a photographer"
          });
        }
    
        // Get photographer's images
        const photographerImage = await PhotographerImage.findOne({ photographerId: id });
        
        // Format the response to include both profile and images
        const response = {
          success: true,
            id: photographer._id,
            name: photographer.name,
            email: photographer.email,
            phone: photographer.phone,
            city: photographer.city,
            language: photographer.language,
            profileImage: photographer.profileImage,
            createdAt: photographer.created_at,
            images: photographerImage ? photographerImage.images : []
        };
    
        return res.status(200).json(response);
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message
        });
      }
}
const updatePhotographer = async(req,res)=>{
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
}
const photographerImagesUpload = async(req,res)=>{
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
}
const getAllPhotographers = async(req,res)=>{
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
}
const photographersImageDelete = async(req,res)=>{
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
}
module.exports = { photographerSignup, getPhotographer, updatePhotographer,photographerImagesUpload,getAllPhotographers,photographersImageDelete };