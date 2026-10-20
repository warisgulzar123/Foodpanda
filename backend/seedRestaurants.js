const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
if (!process.env.MONGODB_URI) {
  require("dotenv").config({ path: path.join(__dirname, "../.env") });
}

const Restaurant = require("./models/Restaurant");
const Product = require("./models/Product");

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

const DEMO_RESTAURANTS = [
  // 1. BURGERS 🍔
  {
    name: "KFC - Clifton Marine Drive",
    image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Burgers • Fried Chicken • Fast Food",
    rating: 4.7,
    reviews: "2.4k+ reviews",
    deliveryTime: "20-25 min",
    minOrder: 299,
    address: "Marine Drive, Block 4, Clifton, Karachi",
    location: { type: "Point", coordinates: [67.0325, 24.8145] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Mighty Zinger Burger",
        price: 890,
        originalPrice: 1050,
        category: "Burgers",
        description: "Signature double crispy chicken fillets, spicy mayo, cheese, and lettuce.",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Hot Wings (6 Pcs)",
        price: 590,
        originalPrice: 650,
        category: "Deals",
        description: "Crispy coated chicken wings with signature fiery hot seasoning.",
        image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Zinger Stacker Combo",
        price: 950,
        originalPrice: 1100,
        category: "Burgers",
        description: "Double zinger fillets with jalapeno sauce, fries, and chilled soft drink.",
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Chilled Pepsi 500ml",
        price: 130,
        originalPrice: 150,
        category: "Drinks",
        description: "Refreshing cold carbonated beverage.",
        image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "McDonald's - Sea View",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Burgers • Fast Food • Fries",
    rating: 4.8,
    reviews: "3.1k+ reviews",
    deliveryTime: "15-20 min",
    minOrder: 350,
    address: "Sea View Road, Clifton, Karachi",
    location: { type: "Point", coordinates: [67.0285, 24.8095] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Big Mac Meal",
        price: 980,
        originalPrice: 1150,
        category: "Burgers",
        description: "Two 100% pure beef patties, special sauce, shredded lettuce, pickles, fries & drink.",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Spicy McCrispy",
        price: 790,
        originalPrice: 890,
        category: "Burgers",
        description: "Crispy chicken fillet with spicy pepper sauce and crinkle-cut pickles.",
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "World Famous Large Fries",
        price: 420,
        originalPrice: 470,
        category: "Sides",
        description: "Golden crispy fries salted to perfection.",
        image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Oreo McFlurry",
        price: 450,
        originalPrice: 500,
        category: "Desserts",
        description: "Soft serve vanilla ice cream blended with crushed Oreo cookies.",
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Burger Lab - Badar Commercial",
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Gourmet Burgers • Smashed Burgers • Fast Food",
    rating: 4.6,
    reviews: "1.8k+ reviews",
    deliveryTime: "25-30 min",
    minOrder: 400,
    address: "26th Street, Badar Commercial, DHA Phase 5, Karachi",
    location: { type: "Point", coordinates: [67.0585, 24.8195] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "The Doppler Burger",
        price: 990,
        originalPrice: 1150,
        category: "Burgers",
        description: "Double crispy fried chicken fillet, melted cheese, fiery buffalo sauce.",
        image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Quadra Reloaded",
        price: 1190,
        originalPrice: 1350,
        category: "Burgers",
        description: "Four smashed beef patties, cheddar slices, caramelized onions, lab sauce.",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Animal Style Fries",
        price: 590,
        originalPrice: 690,
        category: "Sides",
        description: "Fries loaded with minced meat, cheese sauce, and secret chili glaze.",
        image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },

  // 2. PIZZA 🍕
  {
    name: "Broadway Pizza - DHA Phase 5",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Pizza • Calzones • Italian • Fast Food",
    rating: 4.6,
    reviews: "1.9k+ reviews",
    deliveryTime: "30-40 min",
    minOrder: 499,
    address: "Khayaban-e-Shamsheer, DHA Phase 5, Karachi",
    location: { type: "Point", coordinates: [67.061, 24.818] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Wicked Blend Pizza (Large 14\")",
        price: 1590,
        originalPrice: 1850,
        category: "Pizza",
        description: "Tikka chunks, sausages, pepperoni, mushrooms, olives with gooey mozzarella.",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Dancing Fajita Pizza (Medium 10\")",
        price: 1090,
        originalPrice: 1250,
        category: "Pizza",
        description: "Spicy chicken fajita, sweet bell peppers, onions, and jalapeno slice toppings.",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Cheesy Garlic Bread Sticks",
        price: 490,
        originalPrice: 550,
        category: "Sides",
        description: "Baked bread sticks infused with garlic butter and melted cheddar dip.",
        image: "https://images.unsplash.com/photo-1619895092538-128341789043?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Molten Lava Chocolate Cake",
        price: 480,
        originalPrice: 550,
        category: "Desserts",
        description: "Warm chocolate sponge cake filled with oozing hot Belgian dark chocolate.",
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Pizza Max - Clifton Block 2",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Pizza • Fast Food • Wings • Cheesy",
    rating: 4.5,
    reviews: "1.4k+ reviews",
    deliveryTime: "25-35 min",
    minOrder: 399,
    address: "Block 2, Clifton, Near Bilawal Chowrangi, Karachi",
    location: { type: "Point", coordinates: [67.025, 24.817] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Creamy Super Max (Large 14\")",
        price: 1450,
        originalPrice: 1690,
        category: "Pizza",
        description: "Loaded creamy sauce base with smoked chicken, oregano herbs and cheese crust.",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Max Spicy Buffalo Wings (8 Pcs)",
        price: 650,
        originalPrice: 750,
        category: "Sides",
        description: "Juicy wings tossed in fiery red hot buffalo sauce with ranch dip.",
        image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },

  // 3. BIRYANI 🍛
  {
    name: "Student Biryani - Clifton",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Biryani • Pakistani • Pulao • Traditional",
    rating: 4.7,
    reviews: "3.5k+ reviews",
    deliveryTime: "25-30 min",
    minOrder: 250,
    address: "Near Schon Circle, Clifton, Karachi",
    location: { type: "Point", coordinates: [67.0345, 24.821] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Special Chicken Biryani (Double)",
        price: 490,
        originalPrice: 550,
        category: "Biryani",
        description: "Authentic Karachi basmati rice layered with juicy chicken, golden potatoes & aromatics.",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Special Beef Yakhni Pulao",
        price: 590,
        originalPrice: 650,
        category: "Biryani",
        description: "Tender beef chunks slow-cooked in rich bone broth yakhni with fragrant sela rice.",
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Crispy Shami Kabab (2 Pcs)",
        price: 180,
        originalPrice: 220,
        category: "Sides",
        description: "Traditional minced beef & lentil kabab fried in egg coating.",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Shahi Kheer Cup",
        price: 190,
        originalPrice: 220,
        category: "Desserts",
        description: "Traditional slow-simmered rice pudding enriched with cardamom, pistachios and almonds.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Al-Rehman Biryani - Saddar & Kharadar",
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Biryani • Spicy Desi • Pulao • Pakistani",
    rating: 4.8,
    reviews: "4.2k+ reviews",
    deliveryTime: "30-35 min",
    minOrder: 300,
    address: "Burns Road, Saddar, Karachi",
    location: { type: "Point", coordinates: [67.0195, 24.856] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Double Masala Chicken Biryani",
        price: 520,
        originalPrice: 580,
        category: "Biryani",
        description: "Extra spicy, juicy Karachi street biryani with plum sauce, fried onions and tender chicken.",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Mutton Dum Biryani",
        price: 890,
        originalPrice: 990,
        category: "Biryani",
        description: "Succulent mutton shanks steamed in fragrant saffron and ghee-infused long grain rice.",
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Hot Gulab Jamun (4 Pcs)",
        price: 240,
        originalPrice: 280,
        category: "Desserts",
        description: "Warm golden fried dough spheres steeped in fragrant rose-cardamom sugar syrup.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },

  // 4. PAKISTANI & BBQ 🍲
  {
    name: "BBQ Tonight - Boat Basin",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Pakistani • BBQ • Traditional • Karahi",
    rating: 4.9,
    reviews: "5.8k+ reviews",
    deliveryTime: "30-45 min",
    minOrder: 600,
    address: "Boat Basin, Clifton Block 5, Karachi",
    location: { type: "Point", coordinates: [67.031, 24.825] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Chicken Reshmi Kabab (4 Pcs)",
        price: 850,
        originalPrice: 950,
        category: "BBQ",
        description: "Silky, melt-in-mouth chicken mince skewers char-grilled on live coal embers.",
        image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Boneless Chicken Handi (Full)",
        price: 1690,
        originalPrice: 1890,
        category: "Karahi",
        description: "Tender chicken cooked in clay pot with creamy butter gravy, green chilies and ginger.",
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Mutton Ribs Charcoal BBQ",
        price: 1950,
        originalPrice: 2200,
        category: "BBQ",
        description: "Tender marinated lamb chops and ribs grilled crisp on skewers.",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Garlic Butter Naan",
        price: 120,
        originalPrice: 140,
        category: "Sides",
        description: "Fresh tandoori flatbread brushed with garlic cloves and melted desi butter.",
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Kolachi Restaurant - Do Darya",
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Pakistani • Karahi • Desi Seafood • BBQ",
    rating: 4.8,
    reviews: "3.9k+ reviews",
    deliveryTime: "35-45 min",
    minOrder: 700,
    address: "Captain Farhan Ali Shaheed Park, Do Darya, Phase 8, Karachi",
    location: { type: "Point", coordinates: [67.078, 24.765] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Chicken Karahi Special (1 KG)",
        price: 1850,
        originalPrice: 2100,
        category: "Karahi",
        description: "Cooked in fresh tomato gravy, black pepper, julienned ginger, and green chilies.",
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Grilled Jumbo Red Snapper Fish",
        price: 2450,
        originalPrice: 2800,
        category: "Seafood",
        description: "Fresh Arabian sea red snapper marinated with tamarind spices and grilled whole.",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },

  // 5. CHINESE 🥢
  {
    name: "Ginsoy Extreme Chinese - Clifton",
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Chinese • Noodles • Asian • Soups",
    rating: 4.7,
    reviews: "2.1k+ reviews",
    deliveryTime: "25-35 min",
    minOrder: 450,
    address: "Plot 12-C, 7th Commercial Lane, Zamzama, Clifton, Karachi",
    location: { type: "Point", coordinates: [67.039, 24.823] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Chicken Manchurian with Egg Fried Rice",
        price: 990,
        originalPrice: 1150,
        category: "Chinese",
        description: "Classic sweet and spicy chicken cubes tossed in tomato chili sauce with egg rice.",
        image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Ginsoy Special Chicken Chowmein",
        price: 850,
        originalPrice: 950,
        category: "Chinese",
        description: "Wok-tossed egg noodles with shredded chicken, crunchy carrots, and cabbage.",
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Dragon Crispy Beef",
        price: 1190,
        originalPrice: 1350,
        category: "Chinese",
        description: "Crispy fried beef strips coated in a sticky spicy chili honey reduction.",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Hot & Sour Soup (Bowl)",
        price: 490,
        originalPrice: 550,
        category: "Soups",
        description: "Thick chicken broth with egg ribbons, wood ear mushrooms, and vinegar kick.",
        image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Chop Chop Wok - DHA Phase 6",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Chinese • Asian Wok • Noodles • Bowls",
    rating: 4.8,
    reviews: "2.8k+ reviews",
    deliveryTime: "20-30 min",
    minOrder: 500,
    address: "Khayaban-e-Bukhari, Phase 6, DHA, Karachi",
    location: { type: "Point", coordinates: [67.068, 24.811] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "3-Step Wok Bowl (Chicken + Egg Noodles)",
        price: 1090,
        originalPrice: 1250,
        category: "Asian Bowls",
        description: "Choose your base, protein, and signature Pan-Asian sauce tossed in high wok flame.",
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Crispy Honey Chili Sesame Prawns",
        price: 1390,
        originalPrice: 1550,
        category: "Asian Bowls",
        description: "Tempura battered prawns tossed in spicy honey chili with toasted sesame seeds.",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },

  // 6. DESSERTS & BAKERY 🍰
  {
    name: "Dunkin' Donuts - Clifton Block 4",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Desserts • Bakery • Coffee • Donuts",
    rating: 4.7,
    reviews: "1.7k+ reviews",
    deliveryTime: "15-25 min",
    minOrder: 250,
    address: "Block 4, Near marine promenade, Clifton, Karachi",
    location: { type: "Point", coordinates: [67.0315, 24.816] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Assorted Donuts Box (6 Pcs)",
        price: 890,
        originalPrice: 1050,
        category: "Donuts",
        description: "Mix of Boston Kreme, Chocolate Frosted with Sprinkles, Glazed, and Strawberry Ring.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Boston Kreme Donut (Single)",
        price: 180,
        originalPrice: 200,
        category: "Donuts",
        description: "Fluffy yeast shell filled with vanilla custard cream and iced in dark chocolate glaze.",
        image: "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Iced Caramel Macchiato (Large)",
        price: 520,
        originalPrice: 580,
        category: "Beverages",
        description: "Freshly brewed espresso poured over chilled whole milk with sweet vanilla and caramel drizzle.",
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Baskin Robbins - Ocean Mall",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&auto=format&fit=crop&q=80",
    cuisine: "Desserts • Ice Cream • Waffles • Shakes",
    rating: 4.8,
    reviews: "2.3k+ reviews",
    deliveryTime: "15-20 min",
    minOrder: 300,
    address: "Food Court, Ocean Mall, Clifton Block 9, Karachi",
    location: { type: "Point", coordinates: [67.037, 24.821] },
    approvalStatus: "Approved",
    status: "Active",
    isOnline: true,
    products: [
      {
        name: "Pralines 'n Cream (Double Scoop)",
        price: 690,
        originalPrice: 780,
        category: "Ice Cream",
        description: "Vanilla ice cream with caramelized pecan pralines and gooey caramel ribbon.",
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Jamoca Almond Fudge Sundae",
        price: 850,
        originalPrice: 950,
        category: "Sundaes",
        description: "Coffee ice cream with roasted almonds, chocolate fudge drizzle, and whipped cream.",
        image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop&q=80",
      },
      {
        name: "Warm Belgian Waffle Bowl with Scoop",
        price: 790,
        originalPrice: 890,
        category: "Desserts",
        description: "Crispy waffle bowl filled with any premium scoop of your choice and maple syrup.",
        image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
];

async function seedData() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI.split("@")[1] || "Localhost");
    await mongoose.connect(MONGO_URI, { family: 4 });
    console.log("Connected successfully!");

    for (const item of DEMO_RESTAURANTS) {
      const { products, ...restData } = item;

      // Upsert restaurant by name
      let restaurant = await Restaurant.findOne({ name: restData.name });
      if (!restaurant) {
        restaurant = new Restaurant(restData);
        await restaurant.save();
        console.log(`[Created Restaurant] ${restaurant.name} (${restaurant.cuisine})`);
      } else {
        Object.assign(restaurant, restData);
        await restaurant.save();
        console.log(`[Updated Restaurant] ${restaurant.name}`);
      }

      // Add / sync products
      const productIds = [];
      for (const prodData of products) {
        let product = await Product.findOne({
          restaurant: restaurant._id,
          name: prodData.name,
        });
        if (!product) {
          product = new Product({
            ...prodData,
            restaurant: restaurant._id,
            inStock: true,
          });
          await product.save();
        } else {
          Object.assign(product, prodData);
          product.inStock = true;
          await product.save();
        }
        productIds.push(product._id);
      }

      restaurant.products = productIds;
      await restaurant.save();
    }

    console.log(`\n✅ Successfully seeded ${DEMO_RESTAURANTS.length} demo restaurants across all categories with full menus!`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedData();
