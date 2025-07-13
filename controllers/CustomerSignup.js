
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config();
const customerSignup = async (req, res) => {
    try {
    const { name, user_email, user_password, confirm_password, user_login_id, user_type } = req.body;
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
};
module.exports = { customerSignup };
