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
  phone: { 
    type: String,
    required: function() { return this.user_type === 'photographer'; }
  },
  experience: { 
    type: String,
    required: function() { return this.user_type === 'photographer'; }
  },
  city: { 
    type: String,
    required: function() { return this.user_type === 'photographer'; }
  },
  language: { type: String },
  profileImage: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
