const express = require("express");
const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant");
const Product = require("../models/Product");

const router = express.Router();

// In-Memory cache fallback if DB is connecting
const memoryRestaurants = [
  {
    _id: "kfc-clifton",
    id: "kfc-clifton",
    name: "KFC - Clifton Block 4",
    image:
      "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=800&auto=format&fit=crop&q=80",
    banner:
      "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1000&auto=format&fit=crop&q=80",
    cuisine: "Fast Food • Fried Chicken • Burgers",
    rating: 4.6,
    reviews: "1.2k+ reviews",
    deliveryTime: "20-25 min",
    minOrder: 299,
    address: "Clifton Block 4, Marine Drive, Karachi",
    location: { lat: 24.8145, lng: 67.0325 },
    status: "Active",
    products: [
      {
        _id: "p-1",
        id: "kfc-mighty-zinger",
        name: "Mighty Zinger Burger",
        category: "Burgers",
        price: 890,
        originalPrice: 1050,
        description: "Signature double crispy chicken fillets, spicy mayo, and lettuce.",
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
        inStock: true,
      },
      {
        _id: "p-2",
        id: "kfc-hot-wings",
        name: "Hot Wings (6 Pcs)",
        category: "Sides",
        price: 590,
        originalPrice: 650,
        description: "Crispy coated chicken wings with signature seasoning.",
        image:
          "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
        inStock: true,
      },
    ],
  },
  {
    _id: "mcdonalds-seaview",
    id: "mcdonalds-seaview",
    name: "McDonald's - Sea View",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    banner:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&auto=format&fit=crop&q=80",
    cuisine: "Burgers • Fast Food • Fries",
    rating: 4.7,
    reviews: "2.4k+ reviews",
    deliveryTime: "15-25 min",
    minOrder: 350,
    address: "Sea View Road, Clifton, Karachi",
    location: { lat: 24.8095, lng: 67.0285 },
    status: "Active",
    products: [],
  },
];

// GET /api/restaurants - Fetch customer production restaurants
// STRICT RULE: Only Approved & Active restaurants appear in production.
// Rejected, Suspended, or Pending Review restaurants are strictly excluded!
router.get("/", async (req, res) => {
  try {
    const { approvalStatus, includeAll, category, search } = req.query;
    const filter = {};

    if (includeAll === "true") {
      if (approvalStatus) filter.approvalStatus = approvalStatus;
    } else {
      // Production Customer Filter: Strictly Approved and Active ONLY
      filter.approvalStatus = approvalStatus || "Approved";
      filter.status = { $nin: ["Suspended", "Rejected", "Pending Review"] };
      filter.isOnline = true;
    }

    // Category Filter support
    if (category && category !== "All" && !category.includes("All")) {
      const cleanCat = category.replace(/[^\w\s]/gi, "").trim();
      filter.cuisine = { $regex: cleanCat, $options: "i" };
    }

    // Search Query support
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { cuisine: { $regex: search.trim(), $options: "i" } },
      ];
    }

    if (mongoose.connection.readyState === 1) {
      const dbRestaurants = await Restaurant.find(filter).populate("products");
      return res.json({
        success: true,
        count: dbRestaurants.length,
        restaurants: dbRestaurants,
      });
    }

    // Fallback in-memory list (strictly filtered)
    let list = memoryRestaurants.filter((r) => {
      if (includeAll === "true") {
        return approvalStatus ? r.approvalStatus === approvalStatus : true;
      }
      const isApproved =
        (r.approvalStatus === "Approved" || !r.approvalStatus) &&
        r.status !== "Suspended" &&
        r.status !== "Rejected";

      if (!isApproved) return false;

      if (category && category !== "All" && !category.includes("All")) {
        const cleanCat = category.replace(/[^\w\s]/gi, "").trim().toLowerCase();
        if (!r.cuisine.toLowerCase().includes(cleanCat)) return false;
      }

      if (search && search.trim()) {
        const cleanSearch = search.trim().toLowerCase();
        const matches =
          r.name.toLowerCase().includes(cleanSearch) ||
          r.cuisine.toLowerCase().includes(cleanSearch);
        if (!matches) return false;
      }

      return true;
    });

    res.json({ success: true, count: list.length, restaurants: list });
  } catch (err) {
    console.error("GET /api/restaurants error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/restaurants/:id - Fetch single restaurant with products
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAll } = req.query;

    if (mongoose.connection.readyState === 1) {
      const baseFilter = {
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { id: id },
          { name: new RegExp(`^${id}$`, "i") },
        ],
      };

      if (includeAll !== "true") {
        baseFilter.approvalStatus = { $ne: "Rejected" };
        baseFilter.status = { $nin: ["Suspended", "Rejected"] };
      }

      const restaurant = await Restaurant.findOne(baseFilter).populate("products");

      if (restaurant) {
        return res.json({ success: true, restaurant });
      }

      // Check if it exists but was rejected
      const rejectedRest = await Restaurant.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
          { id: id },
          { name: new RegExp(`^${id}$`, "i") },
        ],
      });

      if (
        rejectedRest &&
        (rejectedRest.approvalStatus === "Rejected" || rejectedRest.status === "Suspended")
      ) {
        return res.status(403).json({
          success: false,
          isRejected: true,
          message: "This restaurant is currently suspended or not available on Foodpanda.",
        });
      }
    }

    const cached = memoryRestaurants.find(
      (r) =>
        (r._id === id || r.id === id) &&
        r.approvalStatus !== "Rejected" &&
        r.status !== "Suspended"
    );

    if (cached) {
      return res.json({ success: true, restaurant: cached });
    }

    res.status(404).json({ success: false, message: "Restaurant not found or inactive." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/restaurants - Add new restaurant
router.post("/", async (req, res) => {
  try {
    const {
      name,
      image,
      banner,
      cuisine,
      address,
      deliveryTime,
      minOrder,
      location,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Restaurant name is required." });
    }

    const newRestaurantData = {
      name,
      image:
        image ||
        "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=800&auto=format&fit=crop&q=80",
      banner:
        banner ||
        "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1000&auto=format&fit=crop&q=80",
      cuisine: cuisine || "Fast Food & Snacks",
      address: address || "Karachi, Pakistan",
      deliveryTime: deliveryTime || "20-30 min",
      minOrder: Number(minOrder) || 299,
      location: location || { lat: 24.8145, lng: 67.0325 },
      status: "Active",
      products: [],
    };

    let created;
    if (mongoose.connection.readyState === 1) {
      created = await Restaurant.create(newRestaurantData);
    } else {
      newRestaurantData._id = `rest-${Date.now()}`;
      newRestaurantData.id = newRestaurantData._id;
      created = newRestaurantData;
    }

    memoryRestaurants.unshift(created);
    console.log(`[Restaurant Created] ${created.name} (ID: ${created._id})`);

    res.status(201).json({ success: true, restaurant: created });
  } catch (err) {
    console.error("POST /api/restaurants error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/restaurants/:id/products - Add product to restaurant menu
router.post("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, originalPrice, category, description, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, message: "Name and price are required." });
    }

    const productData = {
      name,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: category || "Popular",
      description: description || "",
      image:
        image ||
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      inStock: true,
    };

    let createdProduct;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      createdProduct = await Product.create({
        ...productData,
        restaurant: id,
      });

      await Restaurant.findByIdAndUpdate(id, {
        $push: { products: createdProduct._id },
      });
    } else {
      createdProduct = {
        _id: `prod-${Date.now()}`,
        id: `prod-${Date.now()}`,
        ...productData,
      };

      const rest = memoryRestaurants.find((r) => r._id === id || r.id === id);
      if (rest) {
        rest.products.push(createdProduct);
      }
    }

    console.log(`[Product Added] ${createdProduct.name} to Restaurant ${id}`);

    res.status(201).json({ success: true, product: createdProduct });
  } catch (err) {
    console.error("POST /api/restaurants/:id/products error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
