import { Platform } from "react-native";
import Constants from "expo-constants";
import { socket, getSocket } from "./socket";

export { socket, getSocket };

// Dynamically resolve backend API base URL for Local, Physical Devices, and Production (Vercel)
export const resolveBackendUrl = () => {
  // 1. Explicit environment variable takes precedence
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    Constants.expoConfig?.extra?.apiUrl;

  if (envUrl && typeof envUrl === "string") {
    return envUrl.replace(/\/+$/, "");
  }

  // 2. Web Browser Environment (Vercel Production & Local Development)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // On local dev, target port 5000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
    // On live production (e.g. Vercel deployment), return empty string for same-origin relative requests
    // so /api/* routes route directly to backend serverless functions without CORS issues
    return "";
  }

  // 3. Physical mobile device running on local network via Expo Go
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:5000`;
  }

  // 4. Android Emulator (10.0.2.2 maps to host machine)
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }

  // 5. Default fallback
  return "http://localhost:5000";
};

export const BACKEND_URL = resolveBackendUrl();
export const getBackendUrl = resolveBackendUrl;

// API Helper Functions
export const createOrderApi = async (orderData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[API Warning] Server unavailable, generating fallback order:", err.message);
    const fallbackId = `FP-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      success: true,
      orderId: fallbackId,
      order: {
        ...orderData,
        orderId: fallbackId,
        status: "Placed",
        createdAt: new Date().toISOString(),
      },
    };
  }
};

export const fetchOrderApi = async (orderId) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API Warning] Could not fetch order ${orderId}:`, err.message);
    return null;
  }
};

export const fetchOrdersApi = async (filters = {}) => {
  try {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${BACKEND_URL}/api/orders?${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchOrdersApi error:", err.message);
    return { success: true, count: 0, orders: [] };
  }
};

export const updateOrderStatusApi = async (orderId, status, note = "") => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    return await res.json();
  } catch (err) {
    console.warn(`[API Warning] Could not update status:`, err.message);
    return null;
  }
};

export const acceptRiderOrderApi = async (orderId, riderData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/accept-rider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(riderData),
    });
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] acceptRiderOrderApi error:", err.message);
    return null;
  }
};

// Rider APIs
export const fetchRiderJobsApi = async (riderId, coords = {}) => {
  try {
    const lat = coords.latitude || coords.lat || 24.8145;
    const lng = coords.longitude || coords.lng || 67.0325;
    const res = await fetch(`${BACKEND_URL}/api/riders/${riderId}/jobs?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchRiderJobsApi error:", err.message);
    return { success: false, activeJob: null, availableJobs: [] };
  }
};

export const updateRiderLocationApi = async (riderId, coords) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/riders/${riderId}/location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords),
    });
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const toggleRiderDutyApi = async (riderId, isOnline) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/riders/${riderId}/duty`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline }),
    });
    return await res.json();
  } catch (err) {
    return null;
  }
};

// Admin Analytics APIs
export const fetchAdminMetricsApi = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/metrics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchAdminMetricsApi error:", err.message);
    return null;
  }
};

// Multipart Image Upload API
export const uploadImageApi = async (formData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[Upload Warning] Could not upload image to backend:", err.message);
    return null;
  }
};

// Restaurants APIs
export const fetchRestaurantsApi = async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/restaurants`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchRestaurantsApi error:", err.message);
    return null;
  }
};

export const fetchRestaurantByIdApi = async (id) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/restaurants/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchRestaurantByIdApi error:", err.message);
    return null;
  }
};

export const createRestaurantApi = async (restaurantData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restaurantData),
    });
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] createRestaurantApi error:", err.message);
    return null;
  }
};

export const createProductApi = async (restaurantId, productData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/restaurants/${restaurantId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] createProductApi error:", err.message);
    return null;
  }
};

// ==========================================
// Authentication & Commercial Onboarding APIs
// ==========================================
export const loginApi = async (email, password) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[Auth API Error]:", err.message);
    return {
      success: false,
      message: err.message || "Failed to reach authentication server.",
    };
  }
};

export const registerRestaurantApi = async (formData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register-restaurant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[Register Restaurant API Error]:", err.message);
    return {
      success: false,
      message: err.message || "Failed to submit restaurant registration.",
    };
  }
};

export const registerRiderApi = async (formData) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register-rider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[Register Rider API Error]:", err.message);
    return {
      success: false,
      message: err.message || "Failed to submit rider registration.",
    };
  }
};

// ==========================================
// Admin Document Inspection & Approvals APIs
// ==========================================
export const fetchAdminRestaurantsApi = async (approvalStatus = "") => {
  try {
    const query = approvalStatus ? `?approvalStatus=${approvalStatus}` : "";
    const res = await fetch(`${BACKEND_URL}/api/admin/restaurants${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchAdminRestaurantsApi error:", err.message);
    return { success: false, restaurants: [] };
  }
};

export const updateAdminRestaurantStatusApi = async (restaurantId, approvalStatus, reason = "") => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/restaurants/${restaurantId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus, reason }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[API Error] updateAdminRestaurantStatusApi:", err.message);
    return { success: false, message: err.message };
  }
};

export const deleteAdminRestaurantApi = async (restaurantId) => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/restaurants/${restaurantId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[API Error] deleteAdminRestaurantApi:", err.message);
    return { success: false, message: err.message };
  }
};

export const fetchAdminRidersApi = async (verificationStatus = "") => {
  try {
    const query = verificationStatus ? `?verificationStatus=${verificationStatus}` : "";
    const res = await fetch(`${BACKEND_URL}/api/admin/riders${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Warning] fetchAdminRidersApi error:", err.message);
    return { success: false, riders: [] };
  }
};

export const updateAdminRiderStatusApi = async (riderId, verificationStatus, reason = "") => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/riders/${riderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationStatus, reason }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[API Error] updateAdminRiderStatusApi:", err.message);
    return { success: false, message: err.message };
  }
};
