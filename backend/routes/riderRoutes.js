const express = require("express");
const mongoose = require("mongoose");
const Rider = require("../models/Rider");
const Order = require("../models/Order");
const {
  calculateDistance,
  calculateETA,
  calculateDeliveryFee,
  calculateRiderEarnings,
  formatDistance,
} = require("../utils/distance");

const router = express.Router();

// Fallback in-memory riders
const fallbackRiders = [
  {
    _id: "r-1",
    riderId: "RD-482",
    name: "Tariq Mahmood",
    phone: "+92 300 8829102",
    vehicle: "Honda CD 70 • KHI-9421",
    rating: 4.9,
    isOnline: true,
    status: "idle",
    currentOrderId: null,
    walletBalance: 3450,
    tripsCompleted: 12,
    location: { type: "Point", coordinates: [67.0325, 24.8145] },
  },
  {
    _id: "r-2",
    riderId: "RD-190",
    name: "Bilal Hussain",
    phone: "+92 321 4455667",
    vehicle: "Yamaha YBR 125 • KHI-1190",
    rating: 4.8,
    isOnline: true,
    status: "idle",
    currentOrderId: null,
    walletBalance: 2980,
    tripsCompleted: 9,
    location: { type: "Point", coordinates: [67.026, 24.819] },
  },
  {
    _id: "r-3",
    riderId: "RD-302",
    name: "Usman Ghani",
    phone: "+92 333 9988776",
    vehicle: "Suzuki GS 150 • KHI-3022",
    rating: 4.7,
    isOnline: true,
    status: "idle",
    currentOrderId: null,
    walletBalance: 4120,
    tripsCompleted: 15,
    location: { type: "Point", coordinates: [67.065, 24.805] },
  },
  {
    _id: "r-4",
    riderId: "RD-511",
    name: "Farhan Saeed",
    phone: "+92 345 5566778",
    vehicle: "Super Power 70 • KHI-5114",
    rating: 4.9,
    isOnline: true,
    status: "idle",
    currentOrderId: null,
    walletBalance: 3100,
    tripsCompleted: 11,
    location: { type: "Point", coordinates: [67.0285, 24.8095] },
  },
];

// GET /api/riders - List all riders
router.get("/", async (req, res) => {
  try {
    const { verificationStatus } = req.query;
    const filter = {};
    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    if (mongoose.connection.readyState === 1) {
      const riders = await Rider.find(filter);
      if (riders.length > 0) {
        return res.json({ success: true, count: riders.length, riders });
      }
    }

    let list = fallbackRiders;
    if (verificationStatus) {
      list = list.filter((r) => r.verificationStatus === verificationStatus);
    }
    res.json({ success: true, count: list.length, riders: list });
  } catch (err) {
    res.json({ success: true, count: fallbackRiders.length, riders: fallbackRiders });
  }
});

// GET /api/riders/:id - Get single rider profile
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const rider = await Rider.findOne({
        $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { riderId: id }],
      });
      if (rider) return res.json({ success: true, rider });
    }
    const fallback =
      fallbackRiders.find((r) => r.riderId === id || r._id === id) || fallbackRiders[0];
    res.json({ success: true, rider: fallback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/riders/:id/location - Update real-time GPS location
router.patch("/:id/location", async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, latitude, longitude } = req.body;
    const finalLat = lat ?? latitude;
    const finalLng = lng ?? longitude;

    if (finalLat === undefined || finalLng === undefined) {
      return res.status(400).json({ success: false, message: "Latitude and longitude required" });
    }

    if (mongoose.connection.readyState === 1) {
      const rider = await Rider.findOneAndUpdate(
        { $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { riderId: id }] },
        {
          location: {
            type: "Point",
            coordinates: [finalLng, finalLat],
          },
        },
        { new: true }
      );
      if (rider) return res.json({ success: true, rider });
    }

    const fallback =
      fallbackRiders.find((r) => r.riderId === id || r._id === id) || fallbackRiders[0];
    fallback.location = { type: "Point", coordinates: [finalLng, finalLat] };
    res.json({ success: true, rider: fallback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/riders/:id/duty - Toggle on/off duty
router.patch("/:id/duty", async (req, res) => {
  try {
    const { id } = req.params;
    const { isOnline } = req.body;

    if (mongoose.connection.readyState === 1) {
      const rider = await Rider.findOneAndUpdate(
        { $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { riderId: id }] },
        {
          isOnline: Boolean(isOnline),
          status: isOnline ? "idle" : "offline",
        },
        { new: true }
      );
      if (rider) return res.json({ success: true, rider });
    }

    const fallback =
      fallbackRiders.find((r) => r.riderId === id || r._id === id) || fallbackRiders[0];
    fallback.isOnline = Boolean(isOnline);
    fallback.status = isOnline ? "idle" : "offline";
    res.json({ success: true, rider: fallback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/riders/:id/jobs - Live job feed based on distance from current coordinates
router.get("/:id/jobs", async (req, res) => {
  try {
    const { id } = req.params;
    const lat = Number(req.query.lat) || 24.8145;
    const lng = Number(req.query.lng) || 67.0325;

    let activeJob = null;
    let availableJobs = [];

    if (mongoose.connection.readyState === 1) {
      // 1. Find active job assigned to this rider
      // STRICT FILTER: strictly exclude Delivered and Cancelled orders
      activeJob = await Order.findOne({
        "rider.riderId": id,
        status: {
          $nin: ["Delivered", "Cancelled"],
          $in: ["Placed", "Accepted", "Preparing", "Ready", "On the Way", "Arrived"],
        },
      }).sort({ createdAt: -1 });

      // Clean up stale Rider currentOrderId in DB if the order has been delivered or cancelled
      try {
        const riderDoc = await Rider.findOne({ riderId: id });
        if (riderDoc && riderDoc.currentOrderId && !activeJob) {
          const orderCheck = await Order.findOne({ orderId: riderDoc.currentOrderId });
          if (!orderCheck || orderCheck.status === "Delivered" || orderCheck.status === "Cancelled") {
            riderDoc.currentOrderId = null;
            riderDoc.status = "idle";
            await riderDoc.save();
            console.log(`[Rider Queue] Freed rider ${id} from completed/cancelled job ${riderDoc.currentOrderId}`);
          }
        }
      } catch (rErr) {
        console.warn("[Rider Queue Notice]:", rErr.message);
      }

      // 2. Find pending orders waiting for pickup
      // STRICT FILTER: status strictly in ["Placed", "Preparing", "Ready"]
      // and explicitly $nin ["Delivered", "Cancelled"]
      // Order must not be assigned to another rider
      const pendingOrders = await Order.find({
        status: {
          $nin: ["Delivered", "Cancelled"],
          $in: ["Placed", "Preparing", "Ready"],
        },
        $or: [
          { rider: null },
          { "rider.riderId": null },
          { "rider.riderId": "" },
          { "rider.riderId": { $exists: false } },
          { "rider.riderId": id },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(10);

      availableJobs = pendingOrders.map((ord) => {
        const restLat = ord.restaurantLocation?.coordinates?.[1] || 24.8145;
        const restLng = ord.restaurantLocation?.coordinates?.[0] || 67.0325;
        const custLat = ord.customerLocation?.coordinates?.[1] || 24.822;
        const custLng = ord.customerLocation?.coordinates?.[0] || 67.039;

        const pickupDist = calculateDistance(lat, lng, restLat, restLng);
        const dropDist =
          ord.distanceKm || calculateDistance(restLat, restLng, custLat, custLng);
        const totalTripDist = Number((pickupDist + dropDist).toFixed(1));

        const earningsBreakdown = calculateRiderEarnings(dropDist, 50, 20);

        return {
          id: ord.orderId,
          orderId: ord.orderId,
          restaurant: ord.restaurant?.name || "KFC - Clifton",
          restaurantCoord: { lat: restLat, lng: restLng },
          restaurantAddress: ord.restaurant?.address || "Clifton Block 4, Karachi",
          dropoff: ord.deliveryAddress || "Clifton, Karachi",
          dropoffCoord: { lat: custLat, lng: custLng },
          customer: "Customer",
          customerPhone: "+92 300 1234567",
          pickupDistance: `${pickupDist} km`,
          pickupDistanceKm: pickupDist,
          deliveryDistance: `${dropDist} km`,
          deliveryDistanceKm: dropDist,
          totalDistance: `${totalTripDist} km`,
          totalDistanceKm: totalTripDist,
          earning: earningsBreakdown.totalEarning,
          earningsBreakdown,
          pickupETA: calculateETA(pickupDist, 25),
          deliveryETA: calculateETA(dropDist, 25),
          bonusTip: 0,
          itemsCount: ord.items?.length || 2,
          total: ord.total,
          status: ord.status,
        };
      });
    }

    // Fallback jobs if none available from DB
    if (availableJobs.length === 0) {
      const fallbackTemplates = [
        {
          id: "FP-889102",
          orderId: "FP-889102",
          restaurant: "KFC - Clifton Block 4",
          restaurantCoord: { lat: 24.8145, lng: 67.0325 },
          restaurantAddress: "Sea View Road, Block 4, Clifton, Karachi",
          dropoff: "Apartment 4B, Ocean View, Clifton Block 2",
          dropoffCoord: { lat: 24.822, lng: 67.039 },
          itemsCount: 2,
          total: 1480,
          status: "Ready",
        },
        {
          id: "FP-772910",
          orderId: "FP-772910",
          restaurant: "Burger Lab Express",
          restaurantCoord: { lat: 24.818, lng: 67.031 },
          restaurantAddress: "Shop 14, Block 7, Clifton, Karachi",
          dropoff: "House 28, Street 5, Phase 5, DHA, Karachi",
          dropoffCoord: { lat: 24.805, lng: 67.065 },
          itemsCount: 3,
          total: 1850,
          status: "Preparing",
        },
      ];

      // STRICT FILTER: Permanently remove any fallback order that has been Delivered, Cancelled, or is Active
      const fallbackIds = fallbackTemplates.map((item) => item.orderId);
      const excludedIds = new Set();

      if (mongoose.connection.readyState === 1) {
        const completedOrActiveOrders = await Order.find({
          orderId: { $in: fallbackIds },
        }).select("orderId status rider");

        for (const ord of completedOrActiveOrders) {
          // If already Delivered or Cancelled, it MUST NEVER be re-assigned or presented
          if (ord.status === "Delivered" || ord.status === "Cancelled") {
            excludedIds.add(ord.orderId);
          }
          // If assigned to another rider or active in delivery
          else if (ord.rider?.riderId && ord.rider.riderId !== id) {
            excludedIds.add(ord.orderId);
          } else if (["Accepted", "On the Way", "Arrived"].includes(ord.status)) {
            excludedIds.add(ord.orderId);
          }
        }
      }

      // Also check global memory orders
      const memOrders = global.memoryOrders;
      if (memOrders) {
        for (const [mId, mOrd] of memOrders.entries()) {
          if (mOrd.status === "Delivered" || mOrd.status === "Cancelled") {
            excludedIds.add(mId);
          }
        }
      }

      if (activeJob) {
        excludedIds.add(activeJob.orderId);
      }

      const eligibleFallbacks = fallbackTemplates.filter((item) => !excludedIds.has(item.orderId));

      availableJobs = eligibleFallbacks.map((item) => {
        const pDist = calculateDistance(lat, lng, item.restaurantCoord.lat, item.restaurantCoord.lng);
        const dDist = calculateDistance(
          item.restaurantCoord.lat,
          item.restaurantCoord.lng,
          item.dropoffCoord.lat,
          item.dropoffCoord.lng
        );
        const totalTrip = Number((pDist + dDist).toFixed(1));
        const breakdown = calculateRiderEarnings(dDist, 50, 20);

        return {
          ...item,
          customer: "Customer",
          customerPhone: "+92 321 8899001",
          pickupDistance: `${pDist} km`,
          pickupDistanceKm: pDist,
          deliveryDistance: `${dDist} km`,
          deliveryDistanceKm: dDist,
          totalDistance: `${totalTrip} km`,
          totalDistanceKm: totalTrip,
          earning: breakdown.totalEarning,
          earningsBreakdown: breakdown,
          pickupETA: calculateETA(pDist, 25),
          deliveryETA: calculateETA(dDist, 25),
          bonusTip: 0,
        };
      });
    }

    // Final safety filter: strictly exclude any job that is Delivered, Cancelled, or the current active job
    const finalAvailableJobs = availableJobs.filter((j) => {
      if (activeJob && j.orderId === activeJob.orderId) return false;
      if (j.status === "Delivered" || j.status === "Cancelled") return false;
      return true;
    });

    res.json({
      success: true,
      activeJob,
      availableJobs: finalAvailableJobs,
    });
  } catch (err) {
    console.error("GET /api/riders/:id/jobs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
