const mongoose = require("mongoose");

const RiderSchema = new mongoose.Schema(
  {
    riderId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    vehicle: { type: String, default: "Honda CD 70 • KHI-9421" },
    vehicleType: { type: String, default: "Motorbike" },
    email: { type: String, default: "" },
    // Document Uploads & Verification
    cnicNumber: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    cnicDocUrl: { type: String, default: "" },
    licenseDocUrl: { type: String, default: "" },
    vehicleDocUrl: { type: String, default: "" },
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String, default: "" },
    rating: { type: Number, default: 4.9 },
    isOnline: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["idle", "busy", "offline"],
      default: "idle",
    },
    currentOrderId: { type: String, default: null },
    walletBalance: { type: Number, default: 3450 },
    tripsCompleted: { type: Number, default: 12 },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      // GeoJSON format: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
        default: [67.0325, 24.8145], // Clifton, Karachi
      },
    },
  },
  { timestamps: true }
);

// Geospatial 2dsphere index for $near queries
RiderSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Rider", RiderSchema);
