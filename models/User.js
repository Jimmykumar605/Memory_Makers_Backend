// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  user_type: { 
    type: String, 
    enum: ["customer", "photographer"], 
    required: true 
  },
  phone: { type: String },
  city: { type: String },
  language: { type: String },
  profileImage: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
