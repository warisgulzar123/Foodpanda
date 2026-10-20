import { Platform } from "react-native";
import Constants from "expo-constants";
import io from "socket.io-client";

// Resolve backend URL dynamically across Web, Physical Devices, and Emulators
export const getSocketUrl = () => {
  // 1. Explicit environment variable takes precedence
  const envUrl =
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL;

  if (envUrl && typeof envUrl === "string") {
    return envUrl.replace(/\/+$/, "");
  }

  // 2. Web Browser Environment
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
    return window.location.origin;
  }

  // 2. Expo Go or Development Client on Physical Device
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:5000`;
  }

  // 3. Android Emulator (10.0.2.2 maps to host machine)
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000";
  }

  // 4. Default / iOS Simulator / Localhost
  return "http://localhost:5000";
};

export const SOCKET_URL = getSocketUrl();

console.log(`[Socket Config] Initializing Socket.io targeting: ${SOCKET_URL}`);

// Singleton Socket.io instance with robust auto-reconnection
export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
});

socket.on("connect", () => {
  console.log(`[Socket.io] Connected successfully to ${SOCKET_URL} (ID: ${socket.id})`);
});

socket.on("connect_error", (err) => {
  console.warn(`[Socket.io] Connection error to ${SOCKET_URL}:`, err.message);
});

socket.on("reconnect", (attempt) => {
  console.log(`[Socket.io] Reconnected after ${attempt} attempts.`);
});

socket.on("disconnect", (reason) => {
  console.log(`[Socket.io] Disconnected:`, reason);
});

export const getSocket = () => socket;

export default socket;
