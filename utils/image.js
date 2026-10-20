import { Platform } from "react-native";
import { BACKEND_URL } from "./api";

export const DEFAULT_RESTAURANT_IMAGE =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80";
export const DEFAULT_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1000&auto=format&fit=crop&q=80";
export const DEFAULT_DOCUMENT_IMAGE =
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80";

/**
 * Safely resolves an image URL across Web and Mobile platforms.
 * Prevents browser security exceptions: "Not allowed to load local resource: file:///..."
 *
 * @param {string} url - The URL or file URI to resolve
 * @param {'restaurant' | 'banner' | 'document' | 'avatar'} type - Type of image fallback
 * @returns {string} Clean, loadable image URI
 */
export const resolveImageUrl = (url, type = "restaurant") => {
  const defaultFallback =
    type === "document"
      ? DEFAULT_DOCUMENT_IMAGE
      : type === "banner"
      ? DEFAULT_BANNER_IMAGE
      : DEFAULT_RESTAURANT_IMAGE;

  if (!url || typeof url !== "string") {
    return defaultFallback;
  }

  const clean = url.trim();
  if (!clean) return defaultFallback;

  // On Web, browsers strictly disallow file:/// local filesystem scheme
  if (Platform.OS === "web" && clean.startsWith("file://")) {
    return defaultFallback;
  }

  // Valid remote URL or base64 data URI
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }

  // Native mobile local file URI
  if (clean.startsWith("file://")) {
    return clean;
  }

  // Relative backend static asset path (e.g. /uploads/image.png)
  const normalizedPath = clean.startsWith("/") ? clean : `/${clean}`;
  if (BACKEND_URL) {
    return `${BACKEND_URL.replace(/\/+$/, "")}${normalizedPath}`;
  }
  return normalizedPath;
};
