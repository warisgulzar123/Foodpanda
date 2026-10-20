const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const TimelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    restaurant: {
      id: { type: String, default: "kfc-clifton" },
      name: { type: String, default: "KFC - Clifton Block 4" },
      deliveryTime: { type: String, default: "20-25 min" },
    },
    restaurantLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [67.0325, 24.8145] }, // [lng, lat]
    },
    items: [OrderItemSchema],
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 99 },
    distanceKm: { type: Number, default: 0 },
    estimatedDurationMinutes: { type: Number, default: 20 },
    riderDistanceKm: { type: Number, default: 0 },
    riderEarnings: { type: Number, default: 0 },
    platformFee: { type: Number, default: 15 },
    voucherDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    deliveryAddress: { type: String, default: "Home - Clifton, Block 4" },
    addressDetail: { type: String, default: "" },
    customerLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [67.039, 24.822] }, // [lng, lat]
    },
    deliveryNote: { type: String, default: "" },
    paymentMethod: { type: String, default: "Cash on Delivery (COD)" },
    status: {
      type: String,
      enum: [
        "Placed",
        "Accepted",
        "Preparing",
        "Ready",
        "On the Way",
        "Arrived",
        "Delivered",
        "Rejected",
        "Cancelled",
      ],
      default: "Placed",
    },
    rider: {
      id: { type: String, default: null },
      riderId: { type: String, default: "RD-482" },
      name: { type: String, default: "Muhammad Tariq" },
      phone: { type: String, default: "+92 300 1234567" },
      vehicle: { type: String, default: "Honda CD 70 • KHI-9421" },
      rating: { type: Number, default: 4.9 },
      location: {
        lat: { type: Number, default: 24.8145 },
        lng: { type: Number, default: 67.0325 },
      },
    },
    riderLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [67.0325, 24.8145] },
    },
    timeline: [TimelineEntrySchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OrderSchema.index({ customerLocation: "2dsphere" });
OrderSchema.index({ restaurantLocation: "2dsphere" });

module.exports = mongoose.model("Order", OrderSchema);
