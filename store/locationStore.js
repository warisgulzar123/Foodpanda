import { create } from "zustand";
import { Platform } from "react-native";
import * as Location from "expo-location";

// Helper to reverse geocode on web using Nominatim API or fallback
async function reverseGeocodeWeb(latitude, longitude) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "FoodpandaCloneApp/1.0",
        },
      }
    );
    if (!res.ok) throw new Error("Web geocoding network error");
    const data = await res.json();
    const addr = data.address || {};

    const street =
      addr.road ||
      addr.street ||
      addr.pedestrian ||
      addr.footway ||
      addr.path ||
      addr.house_number ? `${addr.house_number ? addr.house_number + ' ' : ''}${addr.road || ''}` : "Street 4";

    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.quarter ||
      addr.residential ||
      "Clifton";

    const city =
      addr.city ||
      addr.town ||
      addr.state_district ||
      addr.county ||
      "Karachi";

    const fullStreetAddress = [street, area, city].filter(Boolean).join(", ");

    return {
      address: fullStreetAddress || "Street 4, Clifton, Karachi",
      street: street || "Street 4",
      area: area || "Clifton",
      city: city || "Karachi",
    };
  } catch (err) {
    console.warn("[LocationStore] Web reverse geocode fallback:", err.message);
    return {
      address: "Street 4, Clifton, Karachi",
      street: "Street 4",
      area: "Clifton",
      city: "Karachi",
    };
  }
}

// Helper to reverse geocode on native using expo-location
async function reverseGeocodeNative(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (results && results.length > 0) {
      const first = results[0];
      const street =
        (first.streetNumber ? `${first.streetNumber} ` : "") +
        (first.street || first.name || "Street 4");

      const area =
        first.district ||
        first.subregion ||
        first.neighborhood ||
        "Clifton";

      const city = first.city || first.region || "Karachi";

      const formatted = [street, area, city].filter(Boolean).join(", ");

      return {
        address: formatted || "Street 4, Clifton, Karachi",
        street: street || "Street 4",
        area: area || "Clifton",
        city: city || "Karachi",
      };
    }
  } catch (err) {
    console.warn("[LocationStore] Native reverse geocode fallback:", err.message);
  }

  return {
    address: "Street 4, Clifton, Karachi",
    street: "Street 4",
    area: "Clifton",
    city: "Karachi",
  };
}

export const useLocationStore = create((set, get) => ({
  latitude: 24.8145,
  longitude: 67.0325,
  address: "Street 4, Clifton, Karachi",
  street: "Street 4",
  area: "Clifton",
  city: "Karachi",
  permissionGranted: false,
  isDetecting: false,
  error: null,

  setLocation: (data) =>
    set((state) => ({
      ...state,
      ...data,
    })),

  detectLocation: async () => {
    set({ isDetecting: true, error: null });

    // 1. Web Environment: Use browser navigator.geolocation
    if (Platform.OS === "web" && typeof window !== "undefined" && navigator?.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const geoInfo = await reverseGeocodeWeb(latitude, longitude);

            const result = {
              latitude,
              longitude,
              address: geoInfo.address,
              street: geoInfo.street,
              area: geoInfo.area,
              city: geoInfo.city,
              permissionGranted: true,
              isDetecting: false,
              error: null,
            };

            set(result);
            console.log(`[LocationStore] Web location detected: ${result.address}`);
            resolve(result);
          },
          (err) => {
            console.warn("[LocationStore] Browser geolocation denied/unavailable:", err.message);
            const fallback = {
              latitude: 24.8145,
              longitude: 67.0325,
              address: "Street 4, Clifton, Karachi",
              street: "Street 4",
              area: "Clifton",
              city: "Karachi",
              permissionGranted: false,
              isDetecting: false,
              error: err.message,
            };
            set(fallback);
            resolve(fallback);
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
        );
      });
    }

    // 2. Native Mobile Environment: Use expo-location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const fallback = {
          latitude: get().latitude || 24.8145,
          longitude: get().longitude || 67.0325,
          address: get().address || "Street 4, Clifton, Karachi",
          street: "Street 4",
          area: "Clifton",
          city: "Karachi",
          permissionGranted: false,
          isDetecting: false,
          error: "Permission denied",
        };
        set(fallback);
        return fallback;
      }

      set({ permissionGranted: true });

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      const geoInfo = await reverseGeocodeNative(latitude, longitude);

      const result = {
        latitude,
        longitude,
        address: geoInfo.address,
        street: geoInfo.street,
        area: geoInfo.area,
        city: geoInfo.city,
        permissionGranted: true,
        isDetecting: false,
        error: null,
      };

      set(result);
      console.log(`[LocationStore] Native location detected: ${result.address}`);
      return result;
    } catch (err) {
      console.warn("[LocationStore] Geolocation detection error:", err.message);
      const fallback = {
        latitude: 24.8145,
        longitude: 67.0325,
        address: "Street 4, Clifton, Karachi",
        street: "Street 4",
        area: "Clifton",
        city: "Karachi",
        permissionGranted: false,
        isDetecting: false,
        error: err.message,
      };
      set(fallback);
      return fallback;
    }
  },
}));

export default useLocationStore;
