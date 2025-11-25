const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  // Google OAuth fields (optional)
  googleId: { type: String },
  displayName: { type: String },
  profilePhoto: { type: String },

  // Regular signup fields
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  // Multiple addresses for customers (like Foodpanda)
  addresses: [
    {
      label: { type: String, required: true }, // e.g., "Home", "Work", "Office"
      address: { type: String, required: true },
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // Favorites/wishlist items
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
    },
  ],
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ["Customer", "Staff", "Admin"],
    default: "Customer",
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
