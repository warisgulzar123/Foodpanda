const dns = require("node:dns");
// Configure Google and Cloudflare Public DNS to resolve MongoDB Atlas SRV/TXT records
// and prevent queryTxt ETIMEOUT on Windows / ISP DNS
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
if (!process.env.MONGODB_URI) {
  require("dotenv").config({ path: path.join(__dirname, "../.env") });
}

const Order = require("./models/Order");
const Restaurant = require("./models/Restaurant");
const Rider = require("./models/Rider");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

// Enable CORS for Expo web & mobile clients
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  })
);
app.use(express.json());

// Serve uploads directory statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount modular REST routes
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const riderRoutes = require("./routes/riderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");

const {
  calculateDistance,
  calculateETA,
  formatDistance,
  formatETABanner,
} = require("./utils/distance");

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

// Setup Socket.io with HTTP server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
global.io = io;

// In-Memory store fallback in case MongoDB is connecting or offline
const memoryOrders = new Map();
global.memoryOrders = memoryOrders;

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

// Helper to get order
async function findOrder(orderId) {
  try {
    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({ orderId });
      if (order) return order.toObject();
    }
  } catch (err) {
    console.warn("MongoDB read warning:", err.message);
  }
  return memoryOrders.get(orderId) || null;
}

// Seed default active riders in MongoDB if collection is empty
async function seedDefaultRiders() {
  try {
    const count = await Rider.countDocuments();
    if (count === 0) {
      const seedRiders = [
        {
          riderId: "RD-482",
          name: "Tariq Mahmood",
          phone: "+92 300 8829102",
          vehicle: "Honda CD 70 • KHI-9421",
          rating: 4.9,
          isOnline: true,
          status: "idle",
          walletBalance: 3450,
          tripsCompleted: 12,
          location: { type: "Point", coordinates: [67.0325, 24.8145] },
        },
        {
          riderId: "RD-190",
          name: "Bilal Hussain",
          phone: "+92 321 4455667",
          vehicle: "Yamaha YBR 125 • KHI-1190",
          rating: 4.8,
          isOnline: true,
          status: "idle",
          walletBalance: 2980,
          tripsCompleted: 9,
          location: { type: "Point", coordinates: [67.026, 24.819] },
        },
        {
          riderId: "RD-302",
          name: "Usman Ghani",
          phone: "+92 333 9988776",
          vehicle: "Suzuki GS 150 • KHI-3022",
          rating: 4.7,
          isOnline: true,
          status: "idle",
          walletBalance: 4120,
          tripsCompleted: 15,
          location: { type: "Point", coordinates: [67.065, 24.805] },
        },
        {
          riderId: "RD-511",
          name: "Farhan Saeed",
          phone: "+92 345 5566778",
          vehicle: "Super Power 70 • KHI-5114",
          rating: 4.9,
          isOnline: true,
          status: "idle",
          walletBalance: 3100,
          tripsCompleted: 11,
          location: { type: "Point", coordinates: [67.0285, 24.8095] },
        },
      ];
      await Rider.insertMany(seedRiders);
      console.log(`[Database Seed] Seeded ${seedRiders.length} active fleet riders with 2dsphere indexes.`);
    }
  } catch (err) {
    console.warn("Rider seed notice:", err.message);
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
    activeRooms: io.sockets.adapter.rooms.size,
  });
});

// Note: All /api/orders routes (POST /, GET /, GET /:id, PATCH /:id/status, POST /:id/accept-rider)
// are handled by the modular orderRoutes engine mounted above at app.use("/api/orders", orderRoutes)


// ==========================================
// SOCKET.IO EVENT LISTENERS
// ==========================================

io.on("connection", (socket) => {
  console.log(`[Socket Connected] Socket ID: ${socket.id}`);

  // 1. join_room (Users/Riders/Vendors join their room)
  socket.on("join_room", (roomId) => {
    if (!roomId) return;
    const cleanId = String(roomId).replace(/^order_/, "");
    socket.join(cleanId);
    socket.join(`order_${cleanId}`);
    socket.join(`rider_${cleanId}`);
    socket.join(`restaurant_${cleanId}`);
    console.log(`[Socket] Client ${socket.id} joined rooms: ${cleanId}, order_${cleanId}, rider_${cleanId}`);

    socket.emit("room_joined", {
      roomId: cleanId,
      message: `Successfully joined tracking room ${cleanId}`,
    });
  });

  // 2. update_order_status (Restaurant/Rider emits status changes)
  socket.on("update_order_status", async ({ orderId, status, note }) => {
    try {
      if (!orderId || !status) return;
      const cleanId = String(orderId).replace(/^order_/, "");

      console.log(`[Socket Event: update_order_status] Room: ${cleanId} -> ${status}`);

      const order = await findOrder(cleanId);
      if (order) {
        order.status = status;
        order.timeline = order.timeline || [];
        order.timeline.push({
          status,
          timestamp: new Date(),
          title:
            status === "Preparing"
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
          description: note || `Order is now ${status}.`,
        });

        // Ensure Rider is freed and active queues cleared if status is Delivered or Cancelled
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
            await Rider.updateMany(
              { currentOrderId: cleanId },
              { status: "idle", currentOrderId: null }
            );
            console.log(`[Socket Order Queue Cleanup] Order #${cleanId} set to ${status}. Rider queues cleared.`);
          }
        }

        await saveOrder(order);
      }

      const eventPayload = {
        orderId: cleanId,
        status,
        timeline: order ? order.timeline : [],
        timestamp: new Date().toISOString(),
      };

      io.to(cleanId).emit("order_status_updated", eventPayload);
      io.to(`order_${cleanId}`).emit("order_status_updated", eventPayload);
      io.emit("order_status_updated", eventPayload);
    } catch (err) {
      console.error("Error updating order status via socket:", err);
    }
  });

  // 3. rider_location_update (Rider continuously pushes GPS coordinates)
  socket.on("rider_location_update", async (data) => {
    try {
      const orderId = String(data.orderId || "").replace(/^order_/, "");
      const riderLat = data.riderLat ?? data.coords?.lat ?? data.latitude;
      const riderLng = data.riderLng ?? data.coords?.lng ?? data.longitude;
      const heading = data.heading || 0;
      const speed = data.speed || 0;
      const riderId = data.riderId || "RD-482";

      if (riderLat === undefined || riderLng === undefined) return;

      let liveDistanceKm = 0;
      let liveETA = 0;
      let liveEtaText = "";

      // Persist in Order & Rider model in DB, and compute live distance to customer
      if (orderId) {
        const order = await findOrder(orderId);
        if (order) {
          const custLat = order.customerLocation?.coordinates?.[1] || 24.822;
          const custLng = order.customerLocation?.coordinates?.[0] || 67.039;
          liveDistanceKm = calculateDistance(riderLat, riderLng, custLat, custLng);
          liveETA = calculateETA(liveDistanceKm, 25, 0);
          liveEtaText = formatETABanner(liveETA, liveDistanceKm);

          if (order.rider) {
            order.rider.location = { lat: riderLat, lng: riderLng };
            order.riderLocation = { type: "Point", coordinates: [riderLng, riderLat] };
            await saveOrder(order);
          }
        }
      }

      const payload = {
        orderId,
        riderId,
        riderLat,
        riderLng,
        coords: { lat: riderLat, lng: riderLng },
        heading,
        speed,
        distanceKm: liveDistanceKm,
        etaMinutes: liveETA,
        liveDistanceText: formatDistance(liveDistanceKm),
        liveEtaText: liveEtaText || formatETABanner(liveETA, liveDistanceKm),
        timestamp: new Date().toISOString(),
      };

      // Broadcast live_order_location to room
      if (orderId) {
        io.to(orderId).emit("live_order_location", payload);
        io.to(`order_${orderId}`).emit("live_order_location", payload);
        io.to(orderId).emit("rider_location_updated", payload);
        io.to(`order_${orderId}`).emit("rider_location_updated", payload);
      }
      io.emit("live_order_location", payload);

      if (mongoose.connection.readyState === 1 && riderId) {
        await Rider.findOneAndUpdate(
          { riderId },
          { location: { type: "Point", coordinates: [riderLng, riderLat] } }
        );
      }
    } catch (err) {
      console.error("Error broadcasting rider location:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] Socket ID: ${socket.id}`);
  });
});

// Connect to MongoDB with IPv4 resolution to prevent DNS timeouts
const rawUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.mongodb_uri ||
  "mongodb://127.0.0.1:27017/foodpanda";

const MONGO_URI =
  rawUri.includes("mongodb+srv://") && !rawUri.includes("authSource")
    ? rawUri.includes("?")
      ? `${rawUri}&authSource=admin`
      : `${rawUri}?authSource=admin`
    : rawUri;

// Cached DB connection helper for Serverless & Container runtimes
let cachedDbConnection = null;

async function connectToDatabase() {
  if (cachedDbConnection && mongoose.connection.readyState === 1) {
    return cachedDbConnection;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    cachedDbConnection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      family: 4, // Force IPv4
    });
    console.log("MongoDB Connected Successfully to Cluster0!");
    await seedDefaultRiders();
    return cachedDbConnection;
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    console.log("Server will operate with In-Memory fallback cache.");
    cachedDbConnection = null;
    return null;
  }
}

// Serverless middleware: ensure DB connection before handling request
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectToDatabase();
    } catch (err) {
      // Allow in-memory fallback to handle request
    }
  }
  next();
});

// Trigger initial asynchronous connection
connectToDatabase();

// Only listen on port when run directly in local standalone development (never when imported by Vercel Serverless)
const isDirectExecution = require.main === module;
const isProductionOrVercel = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

if (isDirectExecution && !isProductionOrVercel) {
  const PORT = process.env.PORT || 5000;

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });

  server.listen(PORT, () => {
    console.log(`Foodpanda Backend & Socket.io server running on http://localhost:${PORT}`);
  });
}

// Export Express app instance for Vercel Serverless Function runtime
module.exports = app;
