import "../../global.css";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  getSocket,
  fetchRestaurantByIdApi,
  createProductApi,
  uploadImageApi,
  fetchOrdersApi,
  updateOrderStatusApi,
} from "../../utils/api";
import { resolveImageUrl } from "../../utils/image";

export default function RestaurantDashboardScreen() {
  const restaurantId = "kfc-clifton";
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "menu"
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Menu Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Burgers");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemImage, setNewItemImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Real Orders & Menu from Database
  const loadDashboardData = async () => {
    try {
      // 1. Fetch Orders from Backend
      const ordersRes = await fetchOrdersApi({ restaurantId });
      if (ordersRes?.orders) {
        setOrders(ordersRes.orders);
      }

      // 2. Fetch Menu from Backend
      const restRes = await fetchRestaurantByIdApi(restaurantId);
      if (restRes?.restaurant?.products?.length > 0) {
        const formatted = restRes.restaurant.products.map((p) => ({
          id: p._id || p.id,
          name: p.name,
          category: p.category || "Popular",
          price: p.price,
          image:
            p.image ||
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
          inStock: p.inStock !== false,
        }));
        setMenuItems(formatted);
      }
    } catch (err) {
      console.warn("Dashboard sync notice:", err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadDashboardData();

    // 3. Connect Real-Time Socket
    let socket;
    try {
      socket = getSocket();

      // Join restaurant's private room
      socket.emit("join_room", `restaurant_${restaurantId}`);
      socket.emit("join_room", restaurantId);

      // Listen for incoming live customer orders
      socket.on("new_order", (newOrder) => {
        if (!mounted) return;
        console.log("[Restaurant Socket] New incoming order:", newOrder);

        setOrders((prev) => {
          if (prev.some((o) => o.orderId === newOrder.orderId)) return prev;
          return [newOrder, ...prev];
        });

        Alert.alert(
          "🔔 New Order Placed!",
          `Order #${newOrder.orderId} received.\nTotal: Rs. ${newOrder.total}`,
          [{ text: "View Order", style: "default" }]
        );
      });

      // Listen for status changes
      socket.on("order_status_updated", (data) => {
        if (!mounted) return;
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === data.orderId ? { ...o, status: data.status } : o
          )
        );
      });
    } catch (e) {
      console.warn("Socket initialization error:", e.message);
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.off("new_order");
        socket.off("order_status_updated");
      }
    };
  }, [restaurantId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Live Accept/Reject Action Handlers
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      // Optimistic state update
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
      );

      // Persist in MongoDB
      await updateOrderStatusApi(orderId, newStatus, `Status updated to ${newStatus} by Restaurant.`);

      // Broadcast to socket room
      const socket = getSocket();
      socket.emit("update_order_status", {
        orderId,
        status: newStatus,
        note: `Kitchen updated status to ${newStatus}`,
      });
    } catch (err) {
      console.warn("Status update error:", err.message);
    }
  };

  const handleRejectOrder = (orderId) => {
    Alert.alert("Reject Order", "Are you sure you want to reject this order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          await handleUpdateOrderStatus(orderId, "Rejected");
          setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
        },
      },
    ]);
  };

  const handleToggleStock = (itemId) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, inStock: !item.inStock } : item
      )
    );
  };

  // Pick Food Image using expo-image-picker
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to upload food photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);

        const formData = new FormData();
        const filename = asset.fileName || `food_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";

        formData.append("image", {
          uri: asset.uri,
          name: filename,
          type: mimeType,
        });

        const uploadRes = await uploadImageApi(formData);
        setIsUploading(false);

        if (uploadRes && uploadRes.url) {
          setNewItemImage(uploadRes.url);
          Alert.alert("Upload Successful", "Food photo uploaded to backend!");
        } else {
          setNewItemImage(asset.uri);
          Alert.alert("Notice", "Backend upload timed out. Using local preview image.");
        }
      }
    } catch (err) {
      setIsUploading(false);
      Alert.alert("Image Picker Error", err.message);
    }
  };

  // Submit New Item to Backend
  const handleAddMenuItem = async () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      Alert.alert("Incomplete Form", "Please provide dish name and price.");
      return;
    }

    setIsSubmitting(true);
    const parsedPrice = parseInt(newItemPrice, 10) || 500;
    const finalImage =
      newItemImage ||
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80";

    const payload = {
      name: newItemName.trim(),
      category: newItemCategory,
      price: parsedPrice,
      description: newItemDesc.trim(),
      image: finalImage,
    };

    const res = await createProductApi(restaurantId, payload);
    setIsSubmitting(false);

    const newItem = {
      id: res?.product?._id || `m-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      price: payload.price,
      image: payload.image,
      inStock: true,
    };

    setMenuItems([newItem, ...menuItems]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemDesc("");
    setNewItemImage("");
    setIsModalOpen(false);

    Alert.alert("Item Added", `${newItem.name} has been added to your live menu!`);
  };

  // Real Metric Calculations
  const pendingOrdersCount = orders.filter(
    (o) => o.status === "Placed" || o.status === "Pending"
  ).length;

  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Vendor Header */}
        <View className="bg-white px-4 py-3 border-b border-[#E2E8F0]">
          <View className="flex-row items-center justify-between mb-2">
            {/* Restaurant Identity */}
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-2xl bg-[#D70F64] items-center justify-center mr-2.5 shadow-sm">
                <MaterialCommunityIcons name="chef-hat" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-[#1F1F1F] text-base font-black">
                  KFC - Clifton Branch
                </Text>
                <Text className="text-[#707070] text-[11px] font-medium">
                  Store ID #FP-KFC-04 • Karachi
                </Text>
              </View>
            </View>

            {/* Switch Portal Button */}
            <TouchableOpacity
              onPress={() => router.replace("/login")}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-[#F7F7F7] border border-[#E2E8F0] items-center justify-center mr-2"
            >
              <Feather name="log-out" size={16} color="#707070" />
            </TouchableOpacity>

            {/* Online/Offline Toggle Switch */}
            <View className="flex-row items-center bg-[#F7F7F7] px-2.5 py-1 rounded-full border border-[#E2E8F0]">
              <Text className="text-[11px] font-bold mr-1.5">
                {isOnline ? "🟢 Online" : "🔴 Offline"}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                trackColor={{ false: "#E2E8F0", true: "#FFD0E0" }}
                thumbColor={isOnline ? "#D70F64" : "#A0A0A0"}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>

          {/* Tab Navigation: Orders vs Menu */}
          <View className="flex-row mt-2 bg-[#F7F7F7] p-1 rounded-2xl border border-[#E2E8F0]">
            <TouchableOpacity
              onPress={() => setActiveTab("orders")}
              activeOpacity={0.8}
              className={`flex-1 py-2 rounded-xl items-center justify-center ${
                activeTab === "orders" ? "bg-[#D70F64]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  activeTab === "orders" ? "text-white" : "text-[#707070]"
                }`}
              >
                Live Orders ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("menu")}
              activeOpacity={0.8}
              className={`flex-1 py-2 rounded-xl items-center justify-center ${
                activeTab === "menu" ? "bg-[#D70F64]" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-xs font-black ${
                  activeTab === "menu" ? "text-white" : "text-[#707070]"
                }`}
              >
                Menu Management ({menuItems.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D70F64"
              colors={["#D70F64"]}
            />
          }
        >
          {/* Top Key Metrics Cards */}
          <View className="px-4 mt-4">
            <View className="flex-row space-x-2.5">
              {/* Today's Revenue */}
              <View className="flex-1 mr-1.5 bg-white p-3.5 rounded-3xl border border-[#E2E8F0] shadow-sm">
                <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mb-2">
                  <Ionicons name="trending-up" size={16} color="#059669" />
                </View>
                <Text className="text-[#707070] text-[10px] font-bold uppercase">
                  Total GMV
                </Text>
                <Text className="text-[#1F1F1F] text-base font-black mt-0.5">
                  Rs. {totalRevenue.toLocaleString()}
                </Text>
                <Text className="text-emerald-600 text-[10px] font-bold mt-0.5">
                  Live DB Synced
                </Text>
              </View>

              {/* Total Orders */}
              <View className="flex-1 ml-0.5 mr-0.5 bg-white p-3.5 rounded-3xl border border-[#E2E8F0] shadow-sm">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mb-2">
                  <Ionicons name="receipt-outline" size={16} color="#2563EB" />
                </View>
                <Text className="text-[#707070] text-[10px] font-bold uppercase">
                  Orders Count
                </Text>
                <Text className="text-[#1F1F1F] text-base font-black mt-0.5">
                  {orders.length} Orders
                </Text>
                <Text className="text-blue-600 text-[10px] font-bold mt-0.5">
                  Active Queue
                </Text>
              </View>

              {/* Pending Orders */}
              <View className="flex-1 ml-1.5 bg-white p-3.5 rounded-3xl border border-[#E2E8F0] shadow-sm">
                <View className="w-8 h-8 rounded-full bg-[#FFF0F5] items-center justify-center mb-2">
                  <Ionicons name="time-outline" size={16} color="#D70F64" />
                </View>
                <Text className="text-[#707070] text-[10px] font-bold uppercase">
                  Pending
                </Text>
                <Text className="text-[#D70F64] text-base font-black mt-0.5">
                  {pendingOrdersCount} Active
                </Text>
                <Text className="text-[#707070] text-[10px] font-medium mt-0.5">
                  Action required
                </Text>
              </View>
            </View>
          </View>

          {/* TAB 1: LIVE ORDERS STREAM */}
          {activeTab === "orders" && (
            <View className="px-4 mt-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[#1F1F1F] text-base font-black">
                  Live Kitchen Queue
                </Text>
                <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                  <Text className="text-emerald-700 text-[10px] font-extrabold">
                    Socket Auto-Sync On
                  </Text>
                </View>
              </View>

              {isLoading ? (
                <View className="bg-white p-8 rounded-3xl border border-[#E2E8F0] items-center justify-center">
                  <ActivityIndicator size="small" color="#D70F64" />
                  <Text className="text-[#707070] text-xs font-medium mt-2">
                    Loading live orders from MongoDB...
                  </Text>
                </View>
              ) : orders.length === 0 ? (
                <View className="bg-white p-8 rounded-3xl border border-[#E2E8F0] items-center justify-center">
                  <Text className="text-3xl mb-2">🎉</Text>
                  <Text className="text-[#1F1F1F] text-sm font-bold">
                    All Caught Up!
                  </Text>
                  <Text className="text-[#707070] text-xs text-center mt-1">
                    No pending orders right now. New customer orders will appear instantly.
                  </Text>
                </View>
              ) : (
                orders.map((order) => {
                  const isPending =
                    order.status === "Placed" || order.status === "Pending";
                  const isPreparing = order.status === "Preparing";
                  const isReady = order.status === "Ready";
                  const isOnTheWay = order.status === "On the Way";
                  const isDelivered = order.status === "Delivered";

                  return (
                    <View
                      key={order.orderId || order._id}
                      className="bg-white rounded-3xl p-4 mb-3.5 border border-[#E2E8F0] shadow-sm"
                    >
                      {/* Header Row with Order ID, Time and Status Badge */}
                      <View className="flex-row items-center justify-between pb-3 border-b border-[#F7F7F7]">
                        <View className="flex-row items-center">
                          <Text className="text-[#1F1F1F] text-sm font-black mr-2">
                            #{order.orderId}
                          </Text>
                          <Text className="text-[#707070] text-xs font-medium">
                            • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        {/* Status Badges */}
                        {isPending && (
                          <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                            <Text className="text-amber-800 text-[10px] font-black uppercase">
                              Pending Approval
                            </Text>
                          </View>
                        )}
                        {isPreparing && (
                          <View className="bg-blue-100 px-2.5 py-1 rounded-full">
                            <Text className="text-blue-800 text-[10px] font-black uppercase">
                              In Preparation
                            </Text>
                          </View>
                        )}
                        {isReady && (
                          <View className="bg-purple-100 px-2.5 py-1 rounded-full">
                            <Text className="text-purple-800 text-[10px] font-black uppercase">
                              Ready for Pickup
                            </Text>
                          </View>
                        )}
                        {isOnTheWay && (
                          <View className="bg-teal-100 px-2.5 py-1 rounded-full">
                            <Text className="text-teal-800 text-[10px] font-black uppercase">
                              Rider On The Way
                            </Text>
                          </View>
                        )}
                        {isDelivered && (
                          <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                            <Text className="text-emerald-800 text-[10px] font-black uppercase">
                              Delivered
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Customer & Location */}
                      <View className="my-3">
                        <Text className="text-[#1F1F1F] text-sm font-bold">
                          {order.deliveryAddress || "Home - Clifton"}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                          <Ionicons name="location-outline" size={13} color="#707070" />
                          <Text className="text-[#707070] text-xs ml-1 flex-1" numberOfLines={1}>
                            {order.addressDetail || "Karachi, Pakistan"}
                          </Text>
                        </View>
                      </View>

                      {/* Items Breakdown */}
                      <View className="bg-[#F7F7F7] p-3 rounded-2xl mb-3">
                        {order.items?.map((it, idx) => (
                          <View
                            key={idx}
                            className="flex-row items-center justify-between py-1"
                          >
                            <Text className="text-[#1F1F1F] text-xs font-semibold">
                              {it.quantity}x {it.name}
                            </Text>
                            <Text className="text-[#707070] text-xs font-medium">
                              Rs. {it.price * it.quantity}
                            </Text>
                          </View>
                        ))}
                        <View className="h-[1px] bg-[#E2E8F0] my-2" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-[#707070] text-xs font-bold">
                            {order.paymentMethod || "COD"}
                          </Text>
                          <Text className="text-[#D70F64] text-sm font-black">
                            Rs. {order.total}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons based on status */}
                      {isPending && (
                        <View className="flex-row space-x-2">
                          <TouchableOpacity
                            onPress={() => handleRejectOrder(order.orderId)}
                            activeOpacity={0.7}
                            className="flex-1 mr-1.5 py-3 rounded-2xl border border-rose-300 items-center justify-center bg-rose-50"
                          >
                            <Text className="text-rose-600 text-xs font-black">
                              Reject
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateOrderStatus(order.orderId, "Preparing")
                            }
                            activeOpacity={0.85}
                            className="flex-2 ml-1.5 py-3 px-5 rounded-2xl bg-[#059669] items-center justify-center shadow-sm"
                          >
                            <Text className="text-white text-xs font-black">
                              Accept & Start Kitchen
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {isPreparing && (
                        <TouchableOpacity
                          onPress={() =>
                            handleUpdateOrderStatus(order.orderId, "Ready")
                          }
                          activeOpacity={0.85}
                          className="w-full py-3 rounded-2xl bg-[#2563EB] items-center justify-center shadow-sm"
                        >
                          <Text className="text-white text-xs font-black">
                            Mark as Ready for Rider Pickup 🛵
                          </Text>
                        </TouchableOpacity>
                      )}

                      {isReady && (
                        <View className="bg-purple-50 p-2.5 rounded-2xl border border-purple-200 flex-row items-center justify-center">
                          <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
                          <Text className="text-purple-700 text-xs font-bold ml-1.5">
                            Order Packed • Awaiting Rider Pickup
                          </Text>
                        </View>
                      )}

                      {(isOnTheWay || isDelivered) && (
                        <View className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200 flex-row items-center justify-center">
                          <Ionicons name="checkmark-done" size={16} color="#059669" />
                          <Text className="text-emerald-700 text-xs font-bold ml-1.5">
                            Rider Assigned • {order.rider?.name || "Muhammad Tariq"}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: MENU MANAGEMENT */}
          {activeTab === "menu" && (
            <View className="px-4 mt-5">
              <View className="flex-row items-center justify-between mb-3.5">
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    Menu Items Catalog
                  </Text>
                  <Text className="text-[#707070] text-xs font-medium">
                    Upload photos & update menu items
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setIsModalOpen(true)}
                  activeOpacity={0.85}
                  className="bg-[#D70F64] px-3.5 py-2 rounded-2xl flex-row items-center shadow-sm"
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text className="text-white text-xs font-bold ml-1">
                    Add Item
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Menu List */}
              {menuItems.map((item) => (
                <View
                  key={item.id}
                  className="bg-white rounded-3xl p-3.5 mb-3 border border-[#E2E8F0] shadow-sm flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <Image
                      source={{ uri: resolveImageUrl(item.image, "restaurant") }}
                      className="w-14 h-14 rounded-2xl bg-[#F7F7F7] mr-3"
                      resizeMode="cover"
                    />

                    <View className="flex-1">
                      <View className="flex-row items-center mb-0.5">
                        <Text className="text-[#1F1F1F] text-sm font-black mr-2" numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-0.5">
                        <View className="bg-[#F7F7F7] px-2 py-0.5 rounded-full border border-[#E2E8F0] mr-2">
                          <Text className="text-[#707070] text-[10px] font-semibold">
                            {item.category}
                          </Text>
                        </View>
                        <Text className="text-[#D70F64] text-xs font-extrabold">
                          Rs. {item.price}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Stock Toggle Switch */}
                  <View className="items-end">
                    <Text
                      className={`text-[10px] font-bold mb-1 ${
                        item.inStock ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {item.inStock ? "In Stock 🟢" : "Out 🔴"}
                    </Text>
                    <Switch
                      value={item.inStock}
                      onValueChange={() => handleToggleStock(item.id)}
                      trackColor={{ false: "#FECDD3", true: "#A7F3D0" }}
                      thumbColor={item.inStock ? "#059669" : "#E11D48"}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add New Menu Item Modal with Photo Picker */}
        <Modal
          visible={isModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[90%]">
              <View className="flex-row items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                <Text className="text-[#1F1F1F] text-lg font-black">
                  Add New Dish to Menu
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle" size={24} color="#707070" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo Upload Section */}
                <View className="mb-4">
                  <Text className="text-[#1F1F1F] text-xs font-bold mb-1.5">
                    Dish Photo (Multer Upload)
                  </Text>
                  <View className="flex-row items-center space-x-3">
                    {newItemImage ? (
                      <View className="relative w-20 h-20 rounded-2xl overflow-hidden mr-3 border border-[#E2E8F0]">
                        <Image
                          source={{ uri: resolveImageUrl(newItemImage, "restaurant") }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          onPress={() => setNewItemImage("")}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="w-20 h-20 rounded-2xl bg-[#F7F7F7] border border-dashed border-[#CBD5E1] items-center justify-center mr-3">
                        {isUploading ? (
                          <ActivityIndicator size="small" color="#D70F64" />
                        ) : (
                          <Ionicons name="camera-outline" size={24} color="#94A3B8" />
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={handlePickImage}
                      disabled={isUploading}
                      activeOpacity={0.8}
                      className="flex-1 bg-pink-50 border border-pink-200 py-3 px-4 rounded-2xl flex-row items-center justify-center"
                    >
                      <Feather name="upload-cloud" size={18} color="#D70F64" />
                      <Text className="text-[#D70F64] text-xs font-bold ml-2">
                        {isUploading ? "Uploading..." : "Pick Food Photo"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dish Name */}
                <View className="mb-3">
                  <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                    Dish Name *
                  </Text>
                  <TextInput
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholder="e.g. Crispy Zinger Burger"
                    placeholderTextColor="#9E9E9E"
                    className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm"
                  />
                </View>

                {/* Category Selection */}
                <View className="mb-3">
                  <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                    Category
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {["Burgers", "Sides", "Deals", "Beverages", "Desserts"].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setNewItemCategory(cat)}
                        className={`px-3 py-1.5 rounded-full border mr-1.5 ${
                          newItemCategory === cat
                            ? "bg-[#D70F64] border-[#D70F64]"
                            : "bg-[#F7F7F7] border-[#E2E8F0]"
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            newItemCategory === cat
                              ? "text-white font-bold"
                              : "text-[#1F1F1F]"
                          }`}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Price */}
                <View className="mb-3">
                  <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                    Price (Rs.) *
                  </Text>
                  <TextInput
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    placeholder="e.g. 650"
                    placeholderTextColor="#9E9E9E"
                    keyboardType="numeric"
                    className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm"
                  />
                </View>

                {/* Description */}
                <View className="mb-5">
                  <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                    Description (Optional)
                  </Text>
                  <TextInput
                    value={newItemDesc}
                    onChangeText={setNewItemDesc}
                    placeholder="Crispy seasoned breast fillet, spicy mayo, iceberg lettuce"
                    placeholderTextColor="#9E9E9E"
                    multiline
                    numberOfLines={2}
                    className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleAddMenuItem}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                  className="bg-[#D70F64] py-3.5 rounded-2xl items-center shadow-md mb-4 flex-row justify-center"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                  ) : null}
                  <Text className="text-white text-sm font-black">
                    {isSubmitting ? "Saving to Database..." : "Confirm & Add Item"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
