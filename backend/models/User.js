const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    password: { type: String, default: "123456" },
    role: {
      type: String,
      enum: ["customer", "restaurant", "rider", "admin"],
      default: "customer",
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved",
    },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Verified",
    },
    restaurantId: { type: String, default: null },
    riderId: { type: String, default: null },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      // GeoJSON format: [longitude, latitude]
      coordinates: {
        type: [Number],
        default: [67.0325, 24.8145],
      },
    },
    address: { type: String, default: "Clifton Block 4, Karachi" },
  },
  { timestamps: true }
);

UserSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", UserSchema);
