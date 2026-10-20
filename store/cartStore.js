import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  restaurant: {
    id: "kfc-clifton",
    name: "KFC - Clifton Block 4",
    deliveryTime: "20-25 min",
  },
  items: [
    {
      id: "kfc-mighty-zinger",
      name: "Mighty Zinger Burger",
      price: 890,
      originalPrice: 1050,
      quantity: 1,
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      restaurantName: "KFC - Clifton Block 4",
    },
    {
      id: "kfc-hot-wings",
      name: "Hot Wings (6 Pcs)",
      price: 590,
      originalPrice: 650,
      quantity: 1,
      image:
        "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
      restaurantName: "KFC - Clifton Block 4",
    },
  ],
  deliveryFee: 99,
  platformFee: 15,
  voucherDiscount: 0,
  voucherCode: "",

  addItem: (item, restaurantInfo = null) => {
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.id === item.id);
      let updatedItems;

      if (existingIndex > -1) {
        updatedItems = state.items.map((i, index) =>
          index === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updatedItems = [...state.items, { ...item, quantity: 1 }];
      }

      return {
        items: updatedItems,
        restaurant: restaurantInfo || state.restaurant || {
          id: "general",
          name: item.restaurantName || "Food Delivery",
          deliveryTime: "20-25 min",
        },
      };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === itemId);
      if (!existing) return state;

      if (existing.quantity <= 1) {
        const remaining = state.items.filter((i) => i.id !== itemId);
        return {
          items: remaining,
          restaurant: remaining.length === 0 ? null : state.restaurant,
        };
      }

      return {
        items: state.items.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    });
  },

  deleteItem: (itemId) => {
    set((state) => {
      const remaining = state.items.filter((i) => i.id !== itemId);
      return {
        items: remaining,
        restaurant: remaining.length === 0 ? null : state.restaurant,
      };
    });
  },

  clearCart: () => {
    set({
      items: [],
      restaurant: null,
      voucherDiscount: 0,
      voucherCode: "",
    });
  },

  applyVoucher: (code) => {
    const clean = (code || "").trim().toUpperCase();
    if (clean === "WELCOME50" || clean === "PANDALOVE") {
      set({ voucherDiscount: 150, voucherCode: clean });
      return { success: true, message: "Voucher applied! Rs. 150 OFF" };
    }
    return { success: false, message: "Invalid promo code" };
  },

  removeVoucher: () => {
    set({ voucherDiscount: 0, voucherCode: "" });
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getTotal: () => {
    const { getSubtotal, deliveryFee, platformFee, voucherDiscount, items } = get();
    if (items.length === 0) return 0;
    const subtotal = getSubtotal();
    const finalTotal = subtotal + deliveryFee + platformFee - voucherDiscount;
    return finalTotal > 0 ? finalTotal : 0;
  },

  setDeliveryFee: (fee) => set({ deliveryFee: Number(fee) || 50 }),

  placeOrder: async (extraData = {}) => {
    const { items, restaurant, getSubtotal, getTotal, deliveryFee, platformFee, voucherDiscount, clearCart } = get();
    if (items.length === 0) return null;

    const payload = {
      restaurant: restaurant || {
        id: "kfc-clifton",
        name: "KFC - Clifton Block 4",
        deliveryTime: "20-25 min",
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image || "",
      })),
      subtotal: getSubtotal(),
      deliveryFee,
      platformFee,
      voucherDiscount,
      total: getTotal(),
      ...extraData,
    };

    try {
      const { createOrderApi } = require("../utils/api");
      const result = await createOrderApi(payload);
      if (result?.success) {
        clearCart();
      }
      return result;
    } catch {
      const fallbackId = `FP-${Math.floor(100000 + Math.random() * 900000)}`;
      clearCart();
      return { success: true, orderId: fallbackId };
    }
  },
}));

export default useCartStore;
