const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=800&auto=format&fit=crop&q=80",
    },
    banner: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1000&auto=format&fit=crop&q=80",
    },
    cuisine: { type: String, default: "Fast Food • Burgers • Fried Chicken" },
    rating: { type: Number, default: 4.5 },
    reviews: { type: String, default: "100+ reviews" },
    deliveryTime: { type: String, default: "20-30 min" },
    minOrder: { type: Number, default: 299 },
    address: { type: String, default: "Clifton Block 4, Karachi" },
    // GeoJSON point: coordinates are [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [67.0325, 24.8145], // [lng, lat]
      },
    },
    status: {
      type: String,
      enum: ["Active", "Pending Review", "Suspended"],
      default: "Active",
    },
    // Commercial Onboarding & Document Verification
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    cnicNumber: { type: String, default: "" },
    ntnNumber: { type: String, default: "" },
    bankIban: { type: String, default: "" },
    cnicDocUrl: { type: String, default: "" },
    ntnDocUrl: { type: String, default: "" },
    bankChequeUrl: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    isOnline: { type: Boolean, default: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual getters for convenient lat/lng reading
RestaurantSchema.virtual("lat").get(function () {
  return this.location?.coordinates?.[1] ?? 24.8145;
});

RestaurantSchema.virtual("lng").get(function () {
  return this.location?.coordinates?.[0] ?? 67.0325;
});

RestaurantSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Restaurant", RestaurantSchema);
