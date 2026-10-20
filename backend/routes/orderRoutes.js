const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Rider = require("../models/Rider");
const Restaurant = require("../models/Restaurant");
const {
  calculateDistance,
  calculateETA,
  calculateDeliveryFee,
  calculateRiderEarnings,
  formatDistance,
  formatETABanner,
} = require("../utils/distance");

const router = express.Router();

// In-Memory store fallback in case MongoDB is connecting or offline
const memoryOrders = new Map();

// Built-in fallback template jobs (matches rider dashboard template jobs)
const fallbackOrderTemplates = {
  "FP-889102": {
    orderId: "FP-889102",
    restaurant: {
      id: "kfc-clifton",
      name: "KFC - Clifton Block 4",
      address: "Sea View Road, Block 4, Clifton, Karachi",
    },
    restaurantLocation: { type: "Point", coordinates: [67.0325, 24.8145] },
    deliveryAddress: "Apartment 4B, Ocean View, Clifton Block 2",
    customerLocation: { type: "Point", coordinates: [67.039, 24.822] },
    items: [
      { id: "item-kfc-zinger", name: "Zinger Burger", quantity: 2, price: 650 },
      { id: "item-kfc-fries", name: "Fries Large", quantity: 1, price: 180 },
    ],
    subtotal: 1480,
    deliveryFee: 125,
    platformFee: 29,
    voucherDiscount: 0,
    total: 1634,
    distanceKm: 1.1,
    estimatedDurationMinutes: 15,
    riderDistanceKm: 1.2,
    riderEarnings: 129,
    status: "Ready",
    timeline: [
      {
        status: "Placed",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        title: "Order Placed",
        description: "Order placed by customer.",
      },
      {
        status: "Ready",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        title: "Ready for Pickup",
        description: "Kitchen has packed the order and it is ready for rider pickup.",
      },
    ],
  },
  "FP-772910": {
    orderId: "FP-772910",
    restaurant: {
      id: "burger-lab",
      name: "Burger Lab Express",
      address: "Shop 14, Block 7, Clifton, Karachi",
    },
    restaurantLocation: { type: "Point", coordinates: [67.031, 24.818] },
    deliveryAddress: "House 28, Street 5, Phase 5, DHA, Karachi",
    customerLocation: { type: "Point", coordinates: [67.065, 24.805] },
    items: [
      { id: "item-bl-doppler", name: "Doppler Burger", quantity: 2, price: 850 },
      { id: "item-bl-drinks", name: "Soft Drinks", quantity: 2, price: 150 },
    ],
    subtotal: 1850,
    deliveryFee: 150,
    platformFee: 29,
    voucherDiscount: 0,
    total: 2029,
    distanceKm: 3.8,
    estimatedDurationMinutes: 20,
    riderDistanceKm: 1.5,
    riderEarnings: 165,
    status: "Preparing",
    timeline: [
      {
        status: "Placed",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        title: "Order Placed",
        description: "Order placed by customer.",
      },
      {
        status: "Preparing",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        title: "Kitchen Preparing",
        description: "Kitchen is preparing your meal fresh.",
      },
    ],
  },
};

// Seed fallback orders into memory
Object.entries(fallbackOrderTemplates).forEach(([key, val]) => {
  memoryOrders.set(key, val);
});

// Helper to save order in DB or fallback to Memory
async function saveOrder(orderData) {
  memoryOrders.set(orderData.orderId, orderData);
  try {
    if (mongoose.connection.readyState === 1) {
      const existing = await Order.findOne({ orderId: orderData.orderId });
      if (existing) {
        Object.assign(existing, orderData);
        return await existing.save();
      }
      return await Order.create(orderData);
    }
  } catch (err) {
    console.warn("MongoDB write warning (using memory cache):", err.message);
  }
  return orderData;
}

// Helper to find order
async function findOrder(orderId) {
  try {
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ orderId });
      if (order) return order.toObject();
    }
  } catch (err) {
    console.warn("MongoDB read warning:", err.message);
  }
  return memoryOrders.get(orderId) || fallbackOrderTemplates[orderId] || null;
}

// Helper to get Socket.io instance from Express app or global
function getIO(req) {
  return req.app.get("io") || global.io || null;
}

// ==========================================
// 1. CREATE ORDER WITH DYNAMIC PER-KM DELIVERY FEE
// ==========================================
// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const {
      restaurant,
      items,
      subtotal,
      platformFee = 15,
      voucherDiscount = 0,
      deliveryAddress,
      addressDetail,
      deliveryNote,
      paymentMethod,
      customerLocation,
    } = req.body;

    const generatedId = `FP-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Resolve restaurant location coordinates
    let restLng = 67.0325;
    let restLat = 24.8145;

    if (restaurant?.location?.coordinates) {
      restLng = Number(restaurant.location.coordinates[0]);
      restLat = Number(restaurant.location.coordinates[1]);
    } else if (restaurant?.location?.lng && restaurant?.location?.lat) {
      restLng = Number(restaurant.location.lng);
      restLat = Number(restaurant.location.lat);
    } else if (restaurant?.id && mongoose.connection.readyState === 1) {
      const dbRest = await Restaurant.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(restaurant.id) ? restaurant.id : null },
          { id: restaurant.id },
        ],
      }).catch(() => null);

      if (dbRest) {
        if (dbRest.approvalStatus === "Rejected" || dbRest.status === "Suspended") {
          return res.status(400).json({
            success: false,
            message: `Order cannot be placed. "${dbRest.name}" is rejected or inactive on Foodpanda.`,
          });
        }
        if (dbRest.location?.coordinates) {
          restLng = Number(dbRest.location.coordinates[0]);
          restLat = Number(dbRest.location.coordinates[1]);
        }
      }
    }

    // 2. Resolve customer location coordinates
    const custLng = Number(
      customerLocation?.lng ?? customerLocation?.longitude ?? 67.039
    );
    const custLat = Number(
      customerLocation?.lat ?? customerLocation?.latitude ?? 24.822
    );

    // 3. Precise Haversine Distance & Dynamic Fee Calculation Engine
    // Total delivery distance from Restaurant to Customer
    const distanceKm = calculateDistance(restLat, restLng, custLat, custLng, {
      useRoadFactor: true,
    });

    // Dynamic Delivery Fee: Base Fare (Rs. 50) + (Distance in KM * Rs. 25/km)
    const calculatedDeliveryFee = calculateDeliveryFee(distanceKm, 50, 25);

    // Travel duration ETA: 25 km/h motorbike speed + 10 mins kitchen prep buffer
    const estimatedDurationMinutes = calculateETA(distanceKm, 25, 10);

    // Rider Payout: Base Pay (Rs. 50) + (Distance in KM * Rs. 20/km)
    const riderEarningsBreakdown = calculateRiderEarnings(distanceKm, 50, 20);

    // Recompute total with dynamic delivery fee
    const numericSubtotal = Number(subtotal) || 0;
    const numericPlatformFee = Number(platformFee) || 15;
    const numericDiscount = Number(voucherDiscount) || 0;
    const calculatedTotal = Math.max(
      0,
      numericSubtotal + calculatedDeliveryFee + numericPlatformFee - numericDiscount
    );

    // 4. Geospatial Nearest-Rider Auto-Dispatch (5km radius via $near)
    let assignedRiderData = {
      id: "RD-482",
      riderId: "RD-482",
      name: "Tariq Mahmood",
      phone: "+92 300 8829102",
      vehicle: "Honda CD 70 • KHI-9421",
      rating: 4.9,
      location: { lat: 24.8145, lng: 67.0325 },
    };

    let riderPickupDistanceKm = 1.2;

    if (mongoose.connection.readyState === 1) {
      try {
        const nearestRider = await Rider.findOne({
          isOnline: true,
          status: { $in: ["idle", "available"] },
          $or: [{ currentOrderId: null }, { currentOrderId: { $exists: false } }, { currentOrderId: "" }],
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [restLng, restLat], // [lng, lat]
              },
              $maxDistance: 5000, // 5km search radius
            },
          },
        });

        if (nearestRider) {
          nearestRider.status = "busy";
          nearestRider.currentOrderId = generatedId;
          await nearestRider.save();

          const rLng = nearestRider.location.coordinates[0];
          const rLat = nearestRider.location.coordinates[1];

          riderPickupDistanceKm = calculateDistance(rLat, rLng, restLat, restLng);

          assignedRiderData = {
            id: nearestRider._id.toString(),
            riderId: nearestRider.riderId,
            name: nearestRider.name,
            phone: nearestRider.phone,
            vehicle: nearestRider.vehicle,
            rating: nearestRider.rating,
            location: { lat: rLat, lng: rLng },
          };

          console.log(
            `[Auto-Dispatch] Assigned nearest online rider ${nearestRider.name} (${nearestRider.riderId}) - ${riderPickupDistanceKm} km from restaurant.`
          );
        } else {
          const backupRider = await Rider.findOne({
            isOnline: true,
            status: { $in: ["idle", "available"] },
            $or: [{ currentOrderId: null }, { currentOrderId: { $exists: false } }, { currentOrderId: "" }],
          });
          if (backupRider) {
            backupRider.status = "busy";
            backupRider.currentOrderId = generatedId;
            await backupRider.save();
            assignedRiderData = {
              id: backupRider._id.toString(),
              riderId: backupRider.riderId,
              name: backupRider.name,
              phone: backupRider.phone,
              vehicle: backupRider.vehicle,
              rating: backupRider.rating,
              location: {
                lat: backupRider.location.coordinates[1],
                lng: backupRider.location.coordinates[0],
              },
            };
          }
        }
      } catch (geoErr) {
        console.warn("[Geospatial Query Notice]:", geoErr.message);
      }
    }

    // 5. Construct Order Document with Dynamic Metrics
    const newOrderData = {
      orderId: generatedId,
      restaurant: restaurant || {
        id: "kfc-clifton",
        name: "KFC - Clifton Block 4",
        deliveryTime: `${estimatedDurationMinutes}-${estimatedDurationMinutes + 5} min`,
      },
      restaurantLocation: {
        type: "Point",
        coordinates: [restLng, restLat],
      },
      items: items || [],
      subtotal: numericSubtotal,
      deliveryFee: calculatedDeliveryFee, // Per-KM calculated fee (Base Rs. 50 + dist * Rs. 25)
      distanceKm, // Total delivery distance in KM
      estimatedDurationMinutes, // Estimated arrival duration
      riderDistanceKm: riderPickupDistanceKm, // Rider distance to restaurant
      riderEarnings: riderEarningsBreakdown.totalEarning, // Calculated rider payout
      platformFee: numericPlatformFee,
      voucherDiscount: numericDiscount,
      total: calculatedTotal,
      deliveryAddress: deliveryAddress || "Home - Clifton, Block 4",
      addressDetail: addressDetail || "Apartment 4B, Ocean View Heights",
      customerLocation: {
        type: "Point",
        coordinates: [custLng, custLat],
      },
      deliveryNote: deliveryNote || "",
      paymentMethod: paymentMethod || "Cash on Delivery (COD)",
      status: "Placed",
      rider: assignedRiderData,
      riderLocation: {
        type: "Point",
        coordinates: [assignedRiderData.location.lng, assignedRiderData.location.lat],
      },
      timeline: [
        {
          status: "Placed",
          timestamp: new Date(),
          title: "Order Placed",
          description: "Your order has been sent to the restaurant.",
        },
      ],
      createdAt: new Date(),
    };

    const savedOrder = await saveOrder(newOrderData);

    console.log(
      `[Order Created] ID: ${generatedId} | Distance: ${distanceKm} km | Fee: Rs. ${calculatedDeliveryFee} | ETA: ${estimatedDurationMinutes} mins | Total: Rs. ${calculatedTotal}`
    );

    // 6. Broadcast Real-Time Events via Socket.io
    const io = getIO(req);
    if (io) {
      const deliveryRequestPayload = {
        orderId: generatedId,
        order: savedOrder,
        restaurantName: newOrderData.restaurant.name,
        restaurantAddress: newOrderData.restaurant?.address || "Clifton Block 4, Karachi",
        pickupCoord: { lat: restLat, lng: restLng },
        dropoffCoord: { lat: custLat, lng: custLng },
        deliveryAddress: newOrderData.deliveryAddress,
        pickupDistance: `${riderPickupDistanceKm} km`,
        deliveryDistance: `${distanceKm} km`,
        totalDistance: `${(riderPickupDistanceKm + distanceKm).toFixed(1)} km`,
        distanceKm,
        total: calculatedTotal,
        earning: riderEarningsBreakdown.totalEarning,
        earningsBreakdown: riderEarningsBreakdown,
        estimatedDurationMinutes,
        itemsCount: newOrderData.items.length,
        createdAt: new Date().toISOString(),
      };

      io.to(`rider_${assignedRiderData.riderId}`).emit(
        "new_delivery_request",
        deliveryRequestPayload
      );
      io.to(assignedRiderData.riderId).emit(
        "new_delivery_request",
        deliveryRequestPayload
      );
      io.emit("new_delivery_request", deliveryRequestPayload);

      const restId = newOrderData.restaurant?.id || "kfc-clifton";
      io.to(`restaurant_${restId}`).emit("new_order", savedOrder);
      io.emit("new_order", savedOrder);
    }

    res.status(201).json({
      success: true,
      orderId: generatedId,
      order: savedOrder,
      distanceKm,
      deliveryFee: calculatedDeliveryFee,
      estimatedDurationMinutes,
      riderEarnings: riderEarningsBreakdown,
      assignedRider: assignedRiderData,
    });
  } catch (err) {
    console.error("Error creating order with dynamic fee:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. GET ORDER DETAILS WITH LIVE ETA & DISTANCE
// ==========================================
// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await findOrder(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Dynamically compute live distance & ETA if coordinates are present
    const restLat = order.restaurantLocation?.coordinates?.[1] || 24.8145;
    const restLng = order.restaurantLocation?.coordinates?.[0] || 67.0325;
    const custLat = order.customerLocation?.coordinates?.[1] || 24.822;
    const custLng = order.customerLocation?.coordinates?.[0] || 67.039;
    const riderLat = order.rider?.location?.lat || order.riderLocation?.coordinates?.[1] || restLat;
    const riderLng = order.rider?.location?.lng || order.riderLocation?.coordinates?.[0] || restLng;

    // Delivery distance (Restaurant to Customer)
    const deliveryDistanceKm =
      order.distanceKm || calculateDistance(restLat, restLng, custLat, custLng);

    // Live distance from Rider to Customer (if on the way) or to Restaurant (if picking up)
    const liveRiderToCustomerKm = calculateDistance(riderLat, riderLng, custLat, custLng);
    const liveRiderToRestaurantKm = calculateDistance(riderLat, riderLng, restLat, restLng);

    const liveETA =
      order.status === "On the Way"
        ? calculateETA(liveRiderToCustomerKm, 25, 0)
        : order.status === "Delivered"
        ? 0
        : calculateETA(deliveryDistanceKm, 25, 10);

    const liveDistanceText =
      order.status === "On the Way"
        ? formatDistance(liveRiderToCustomerKm)
        : formatDistance(deliveryDistanceKm);

    res.json({
      success: true,
      order: {
        ...order,
        distanceKm: deliveryDistanceKm,
        liveRiderToCustomerKm,
        liveRiderToRestaurantKm,
        liveETA,
        liveEtaText: formatETABanner(liveETA, liveRiderToCustomerKm),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. FETCH ORDERS LIST
// ==========================================
// GET /api/orders
router.get("/", async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit));
      return res.json({ success: true, count: orders.length, orders });
    }

    let list = Array.from(memoryOrders.values());
    if (status) list = list.filter((o) => o.status === status);
    res.json({ success: true, count: list.length, orders: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. UPDATE ORDER STATUS & EMIT REAL-TIME EVENT
// ==========================================
// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await findOrder(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status;
    order.timeline = order.timeline || [];
    order.timeline.push({
      status,
      timestamp: new Date(),
      title:
        status === "Accepted"
          ? "Order Confirmed"
          : status === "Preparing"
          ? "Food Being Prepared"
          : status === "Ready"
          ? "Food Ready for Pickup"
          : status === "On the Way"
          ? "Rider Picked Up & On the Way"
          : status === "Arrived"
          ? "Rider Arrived at Doorstep"
          : status === "Delivered"
          ? "Delivered 🎉"
          : status,
      description: note || `Order status updated to ${status}.`,
    });

    // If order delivered or cancelled, credit rider wallet and permanently reset status across queues
    if (status === "Delivered" || status === "Cancelled") {
      const earningToCredit =
        status === "Delivered" ? (order.riderEarnings || order.deliveryFee || 150) : 0;
      if (mongoose.connection.readyState === 1) {
        if (order.rider?.riderId) {
          await Rider.findOneAndUpdate(
            { riderId: order.rider.riderId },
            {
              status: "idle",
              currentOrderId: null,
              ...(status === "Delivered" ? { $inc: { tripsCompleted: 1, walletBalance: earningToCredit } } : {}),
            }
          );
        }

        // Permanently clear this order ID from any rider holding it as currentOrderId
        await Rider.updateMany(
          { currentOrderId: id },
          { status: "idle", currentOrderId: null }
        );
        console.log(`[Order Queue Cleanup] Order #${id} is now ${status}. All rider queues cleared.`);
      }
    }

    const updated = await saveOrder(order);

    const eventPayload = {
      orderId: id,
      status: updated.status,
      timeline: updated.timeline,
      timestamp: new Date().toISOString(),
    };

    const io = getIO(req);
    if (io) {
      io.to(id).emit("order_status_updated", eventPayload);
      io.to(`order_${id}`).emit("order_status_updated", eventPayload);
      io.emit("order_status_updated", eventPayload);
    }

    console.log(`[Status Emitted via Order Router] Order: ${id} -> Status: ${status}`);

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. ACCEPT RIDER ORDER
// ==========================================
// POST /api/orders/:id/accept-rider
router.post("/:id/accept-rider", async (req, res) => {
  try {
    const { id } = req.params;
    const { riderId, riderName, riderPhone } = req.body;

    let order = await findOrder(id);

    // STRICT CHECK: An order that is Delivered or Cancelled CANNOT be accepted or re-assigned!
    if (order && (order.status === "Delivered" || order.status === "Cancelled")) {
      return res.status(400).json({
        success: false,
        message: `Order #${id} has already been ${order.status.toLowerCase()} and cannot be accepted or re-assigned.`,
      });
    }

    if (!order) {
      const template = fallbackOrderTemplates[id] || {
        orderId: id,
        restaurant: {
          id: "kfc-clifton",
          name: "KFC - Clifton Block 4",
          address: "Sea View Road, Block 4, Clifton, Karachi",
        },
        restaurantLocation: { type: "Point", coordinates: [67.0325, 24.8145] },
        deliveryAddress: "Apartment 4B, Ocean View, Clifton Block 2",
        customerLocation: { type: "Point", coordinates: [67.039, 24.822] },
        items: [{ id: "item-crispy-chicken", name: "Crispy Chicken Meal", quantity: 2, price: 650 }],
        subtotal: 1300,
        deliveryFee: 125,
        platformFee: 29,
        voucherDiscount: 0,
        total: 1454,
        distanceKm: 1.5,
        estimatedDurationMinutes: 15,
        riderDistanceKm: 1.2,
        riderEarnings: 129,
        status: "Accepted",
        timeline: [
          {
            status: "Placed",
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            title: "Order Placed",
            description: "Customer placed the order.",
          },
        ],
      };

      order = { ...template };
    }

    const assignedRider = {
      ...(order.rider || {}),
      riderId: riderId || order.rider?.riderId || "RD-482",
      name: riderName || order.rider?.name || "Tariq Mahmood",
      phone: riderPhone || order.rider?.phone || "+92 300 8829102",
      vehicle: "Honda CD 70 (KHI-9421)",
      rating: 4.9,
      location: { lat: 24.8145, lng: 67.0325 },
    };

    order.rider = assignedRider;
    order.riderLocation = {
      type: "Point",
      coordinates: [67.0325, 24.8145],
    };
    order.status = "Accepted";
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: "Accepted",
      timestamp: new Date(),
      title: "Rider Accepted Order",
      description: `${assignedRider.name} accepted this delivery job.`,
    });

    const updated = await saveOrder(order);

    // Update Rider model status to busy
    if (mongoose.connection.readyState === 1 && assignedRider.riderId) {
      try {
        await Rider.findOneAndUpdate(
          { riderId: assignedRider.riderId },
          { status: "busy", currentOrderId: id }
        );
      } catch (rErr) {
        console.warn("Rider status update notice:", rErr.message);
      }
    }

    const io = getIO(req);
    if (io) {
      const eventPayload = {
        orderId: id,
        status: "Accepted",
        rider: assignedRider,
        timestamp: new Date().toISOString(),
      };
      io.to(id).emit("order_status_updated", eventPayload);
      io.to(`order_${id}`).emit("order_status_updated", eventPayload);
      io.emit("order_status_updated", eventPayload);
    }

    console.log(`[Order Accepted] Rider ${assignedRider.name} (${assignedRider.riderId}) accepted Order #${id}`);

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
