# 🐼 Foodpanda Clone - Full-Stack Real-Time Delivery Platform

A production-ready full-stack Foodpanda Clone featuring a multi-role architecture: **Customer**, **Restaurant Partner**, **Delivery Rider**, and **Super Admin**.

The project features a unified monorepo containing:
- **Frontend Source Code (`app/`, `components/`, `store/`, `utils/`)**: Built with **Expo Router**, **React Native for Web & Mobile**, NativeWind (Tailwind CSS), Zustand, and Leaflet / react-native-maps.
- **Compiled Web Distribution (`dist/`)**: Production-ready static web bundle for fast, zero-configuration hosting on Vercel / Netlify / Cloudflare.
- **Backend API & Real-time Server (`backend/`)**: Node.js, Express, MongoDB Mongoose, and Socket.IO for live location tracking and real-time order status updates.

---

## 📁 Repository Structure

```text
foodpanda-clone/
├── app/                             # Expo Router Frontend Screens & Layouts
│   ├── (admin)/                     # Admin verification dashboard & user management
│   ├── (auth)/                      # Restaurant and Rider registration flows
│   ├── (customer)/                  # Customer browsing, checkout, live order tracking
│   │   ├── (tabs)/                  # Bottom tab navigation (Home, Grocery, Search, Cart, Account)
│   │   ├── checkout.jsx             # Checkout with delivery address & payment options
│   │   ├── order-tracking/[id].jsx  # Real-time animated delivery map tracking
│   │   └── restaurant/[id].jsx      # Restaurant menu, categories & item modifiers
│   ├── (restaurant)/                # Restaurant owner order management & menu controls
│   ├── (rider)/                     # Rider order acceptance, navigation & delivery completion
│   ├── login.jsx                    # Unified multi-role authentication
│   └── _layout.jsx                  # Root layout & providers
├── components/                      # Modular UI & Map components
│   ├── LiveMapView.jsx              # Mobile interactive map (react-native-maps)
│   ├── LiveMapView.web.jsx          # Web interactive map (Leaflet / OpenStreetMap)
│   ├── FeaturedRestaurants.jsx      # Top restaurants carousel
│   ├── CuisineCategories.jsx        # Category filtering bar
│   ├── Header.jsx                   # Sticky header with address selector & cart badge
│   └── RestaurantCard.jsx           # Restaurant preview cards with ratings & delivery times
├── store/                           # Zustand Client State Management
│   ├── authStore.js                 # Authentication & current user session
│   ├── cartStore.js                 # Persistent cart state & price calculation
│   └── locationStore.js             # User & delivery GPS coordinates
├── utils/                           # Client helpers (API client, Socket.IO, Distance, Image)
├── dist/                            # Pre-compiled static web frontend bundle (Production)
├── backend/                         # Express REST API & WebSockets
│   ├── models/                      # MongoDB Schemas (User, Restaurant, Rider, Order, Product)
│   ├── routes/                      # API Endpoints (auth, restaurants, orders, riders, admin)
│   ├── utils/                       # Haversine distance & coordinate utilities
│   ├── uploads/                     # Uploaded media (restaurant banners, rider CNIC/licenses)
│   └── server.js                    # Express + Socket.IO server entry point
├── vercel.json                      # Vercel serverless deployment config
└── package.json                     # Root dependencies & build scripts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or newer recommended)
- MongoDB database (local or MongoDB Atlas connection string)
- Expo CLI (`npm install -g expo-cli` or via `npx expo`)

### 2. Backend Setup
1. Open the backend folder and create your `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Configure your environment variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/foodpanda?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key
   ```
3. Install dependencies and start the backend:
   ```bash
   npm install
   node server.js
   ```

### 3. Frontend Setup (Web & Mobile)
1. Install frontend dependencies from the root directory:
   ```bash
   npm install
   ```
2. Start the development server:
   - **For Web Browser:**
     ```bash
     npm run web
     # Or: npx expo start --web
     ```
   - **For Android / iOS:**
     ```bash
     npm run android
     # Or: npm run ios
     ```
3. Build static web production bundle:
   ```bash
   npm run build
   # Outputs optimized production build to /dist
   ```

---

## ⚡ Deployment to Vercel

The repository is configured for one-click deployment to **Vercel** via [`vercel.json`](file:///d:/foodpanda-clone/vercel.json):
- `/api/*` is routed to the serverless backend (`backend/server.js`).
- `/*` serves the compiled frontend static assets (`dist/`).

In your Vercel Project Settings, add the following Environment Variables:
- `MONGO_URI`: Your MongoDB Atlas connection URI.
- `JWT_SECRET`: A secure random secret string.
- `EXPO_PUBLIC_API_URL`: `/api` (or your full domain URL).

---

## 🔑 Multi-Role Demo Credentials

| Role | Email | Password | Access Path |
|---|---|---|---|
| **Customer** | `customer@demo.com` | `password123` | Home Tab / Cart / Tracking |
| **Restaurant** | `restaurant@demo.com` | `password123` | `/(restaurant)/dashboard` |
| **Rider** | `rider@demo.com` | `password123` | `/(rider)/dashboard` |
| **Admin** | `admin@demo.com` | `password123` | `/(admin)/dashboard` |
