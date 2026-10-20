import "../../../global.css";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { getSocket, fetchOrderApi } from "../../../utils/api";
import LiveMapView from "../../../components/LiveMapView";
import {
  calculateDistance,
  calculateETA,
  formatDistance,
  formatETABanner,
} from "../../../utils/distance";

const STATUS_STEPS = [
  {
    key: "Placed",
    title: "Order Placed",
    subtitle: "We have received your order",
    icon: "receipt-outline",
    iconType: "ionicons",
  },
  {
    key: "Preparing",
    title: "Food Being Prepared",
    subtitle: "Kitchen is preparing your fresh meal",
    icon: "chef-hat",
    iconType: "material",
  },
  {
    key: "On the Way",
    title: "Rider Picked Up",
    subtitle: "Your food is on the way with the rider",
    icon: "moped-outline",
    iconType: "material",
  },
  {
    key: "Delivered",
    title: "Delivered 🎉",
    subtitle: "Enjoy your delicious meal!",
    icon: "checkmark-circle-outline",
    iconType: "ionicons",
  },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const orderId = id || "FP-100234";

  // State
  const [currentStatus, setCurrentStatus] = useState("Placed");
  const [orderDetails, setOrderDetails] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [riderCoords, setRiderCoords] = useState({ lat: 24.8145, lng: 67.0325, heading: 45 });
  
  // Real-Time Dynamic Distance & ETA State
  const [liveDistanceKm, setLiveDistanceKm] = useState(2.8);
  const [liveETAMinutes, setLiveETAMinutes] = useState(14);
  const [etaBannerText, setEtaBannerText] = useState("Estimated Arrival: 14 mins (2.8 km away)");

  // Helper to recompute live ETA & distance whenever rider moves or status changes
  const updateMetrics = (status, currentCoords, order) => {
    if (status === "Delivered") {
      setLiveDistanceKm(0);
      setLiveETAMinutes(0);
      setEtaBannerText("Delivered 🎉");
      return;
    }
    if (status === "Arrived") {
      setLiveDistanceKm(0.1);
      setLiveETAMinutes(1);
      setEtaBannerText("Rider Arrived (At your doorstep)");
      return;
    }

    const restLat = order?.restaurantLocation?.coordinates?.[1] || 24.8145;
    const restLng = order?.restaurantLocation?.coordinates?.[0] || 67.0325;
    const custLat = order?.customerLocation?.coordinates?.[1] || 24.822;
    const custLng = order?.customerLocation?.coordinates?.[0] || 67.039;

    let targetDist = 0;
    let prepBuffer = 0;

    if (status === "On the Way") {
      // Rider is driving from current GPS location to customer location
      targetDist = calculateDistance(
        currentCoords?.lat ?? restLat,
        currentCoords?.lng ?? restLng,
        custLat,
        custLng
      );
      prepBuffer = 0; // Already picked up
    } else {
      // Placed, Accepted, Preparing, Ready (Kitchen is preparing)
      targetDist =
        order?.distanceKm || calculateDistance(restLat, restLng, custLat, custLng);
      prepBuffer = status === "Ready" ? 2 : 10;
    }

    const mins = calculateETA(targetDist, 25, prepBuffer);
    setLiveDistanceKm(targetDist);
    setLiveETAMinutes(mins);
    setEtaBannerText(`Estimated Arrival: ${mins} mins (${formatDistance(targetDist)} away)`);
  };

  // Pulse animation for live indicators
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Load Order Details & Connect Socket
  useEffect(() => {
    let socket;
    let isMounted = true;

    const initTracking = async () => {
      // 1. Fetch initial order data from API
      const apiData = await fetchOrderApi(orderId);
      if (isMounted && apiData?.order) {
        setOrderDetails(apiData.order);
        const order = apiData.order;
        if (order.status) {
          setCurrentStatus(order.status);
        }
        let initialRiderCoords = { lat: 24.8145, lng: 67.0325, heading: 45 };
        if (order.rider?.location) {
          initialRiderCoords = {
            lat: order.rider.location.lat,
            lng: order.rider.location.lng,
            heading: 45,
          };
          setRiderCoords(initialRiderCoords);
        }
        updateMetrics(order.status || "Placed", initialRiderCoords, order);
      }

      // 2. Connect Socket.io & Join Order Room
      try {
        socket = getSocket();

        const joinOrderRooms = () => {
          socket.emit("join_room", orderId);
          socket.emit("join_room", `order_${orderId}`);
          console.log(`[Socket] Joined order rooms: ${orderId} & order_${orderId}`);
        };

        if (socket.connected) {
          if (isMounted) setIsConnected(true);
          joinOrderRooms();
        }

        socket.on("connect", () => {
          if (isMounted) setIsConnected(true);
          joinOrderRooms();
        });

        socket.on("disconnect", () => {
          if (isMounted) setIsConnected(false);
        });

        // Also emit directly to ensure registration
        joinOrderRooms();

        // Listen for live status changes
        socket.on("order_status_updated", (data) => {
          if (!isMounted) return;
          console.log("[Socket Event Received] order_status_updated:", data);
          if (data.status) {
            setCurrentStatus(data.status);
            setOrderDetails((prev) => {
              const updated = prev ? { ...prev, status: data.status } : prev;
              updateMetrics(data.status, riderCoords, updated);
              return updated;
            });
          }
          if (data.rider) {
            setOrderDetails((prev) => (prev ? { ...prev, rider: data.rider } : prev));
          }
        });

        // Listen for real-time GPS stream from Rider
        const handleLocationUpdate = (data) => {
          if (!isMounted) return;
          const lat = data.riderLat ?? data.coords?.lat ?? data.latitude;
          const lng = data.riderLng ?? data.coords?.lng ?? data.longitude;
          if (lat !== undefined && lng !== undefined) {
            const updatedCoords = {
              lat: Number(lat),
              lng: Number(lng),
              heading: data.heading || 0,
            };
            setRiderCoords(updatedCoords);

            // Smoothly update ETA and distance
            if (data.liveEtaText) {
              setEtaBannerText(data.liveEtaText);
              if (data.distanceKm) setLiveDistanceKm(data.distanceKm);
              if (data.etaMinutes) setLiveETAMinutes(data.etaMinutes);
            } else {
              setOrderDetails((prev) => {
                updateMetrics(currentStatus, updatedCoords, prev);
                return prev;
              });
            }
          }
        };

        socket.on("live_order_location", handleLocationUpdate);
        socket.on("rider_location_updated", handleLocationUpdate);
      } catch (err) {
        console.warn("Socket initialization notice:", err.message);
      }
    };

    initTracking();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off("order_status_updated");
        socket.off("live_order_location");
        socket.off("rider_location_updated");
      }
    };
  }, [orderId]);

  const handleCallRider = () => {
    const phone = orderDetails?.rider?.phone || "+923001234567";
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Call Rider", `Dialing ${phone}...`);
    });
  };

  const handleMessageRider = () => {
    const phone = orderDetails?.rider?.phone || "+923001234567";
    Linking.openURL(`sms:${phone}`).catch(() => {
      Alert.alert("SMS Rider", `Opening messaging to ${phone}...`);
    });
  };

  const handleContactSupport = () => {
    Alert.alert(
      "Foodpanda 24/7 Support",
      `Connecting you to order assistance for #${orderId}...`,
      [{ text: "Close", style: "cancel" }]
    );
  };

  // Find step progression
  const getStepIndex = (status) => {
    switch (status) {
      case "Placed":
      case "Accepted":
        return 0;
      case "Preparing":
        return 1;
      case "Ready":
      case "On the Way":
      case "Arrived":
        return 2;
      case "Delivered":
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex(currentStatus);

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Header */}
        <View className="bg-white px-4 py-3.5 border-b border-[#E2E8F0] flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.replace("/(customer)/(tabs)")}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-[#F7F7F7] border border-[#E2E8F0] items-center justify-center mr-3"
            >
              <Feather name="arrow-left" size={18} color="#1F1F1F" />
            </TouchableOpacity>
            <View>
              <Text className="text-[#1F1F1F] text-base font-black">
                Order #{orderId}
              </Text>
              <Text className="text-[#707070] text-xs font-medium">
                {orderDetails?.restaurant?.name || "KFC - Clifton Block 4"}
              </Text>
            </View>
          </View>

          {/* Socket Connection Live Badge */}
          <View className="flex-row items-center bg-[#F7F7F7] px-2.5 py-1 rounded-full border border-[#E2E8F0]">
            <View
              className={`w-2 h-2 rounded-full mr-1.5 ${
                isConnected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <Text className="text-[11px] font-bold text-[#1F1F1F]">
              {isConnected ? "Live Connected 🟢" : "Connecting... 🟡"}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Estimated Arrival Banner Card */}
          <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider">
                    {currentStatus === "On the Way"
                      ? "LIVE GPS TRACKING • 25 KM/H"
                      : currentStatus === "Delivered"
                      ? "ORDER COMPLETED"
                      : "ESTIMATED DELIVERY"}
                  </Text>
                </View>

                {/* Requirement: "Estimated Arrival: X mins (Y.Y km away)" */}
                <Text className="text-[#D70F64] text-xl font-black mt-0.5">
                  {etaBannerText}
                </Text>

                <Text className="text-[#707070] text-xs font-medium mt-1">
                  {currentStatus === "On the Way"
                    ? `Rider is ${formatDistance(liveDistanceKm)} from your door • Updating live via GPS`
                    : currentStatus === "Delivered"
                    ? "Delivered successfully to your address"
                    : `Kitchen distance: ${formatDistance(liveDistanceKm)} • ${liveETAMinutes} mins estimated trip`}
                </Text>
              </View>

              <View className="w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center">
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialCommunityIcons
                    name={
                      currentStatus === "Delivered"
                        ? "check-decagram"
                        : "clock-fast"
                    }
                    size={26}
                    color="#D70F64"
                  />
                </Animated.View>
              </View>
            </View>

            <View className="bg-[#F7F7F7] p-2.5 rounded-xl border border-[#E2E8F0] flex-row items-center mt-2">
              <Ionicons name="sparkles" size={15} color="#D70F64" />
              <Text className="text-[#1F1F1F] text-xs font-semibold ml-2">
                {currentStatus === "Placed" && "Restaurant is confirming your order"}
                {currentStatus === "Accepted" && "Restaurant accepted your order"}
                {currentStatus === "Preparing" && "Chef is preparing your hot meal"}
                {currentStatus === "Ready" && "Food is packed and ready for rider pickup"}
                {currentStatus === "On the Way" && `Rider ${orderDetails?.rider?.name || 'Muhammad Tariq'} is driving to you (${formatDistance(liveDistanceKm)} away)`}
                {currentStatus === "Arrived" && "Rider has arrived at your delivery address"}
                {currentStatus === "Delivered" && "Order successfully delivered to your door"}
              </Text>
            </View>
          </View>

          {/* Interactive Live Delivery Map with react-native-maps */}
          <View className="mx-4 mt-4">
            <LiveMapView
              riderLocation={riderCoords}
              restaurantLocation={{
                lat: orderDetails?.restaurantLocation?.coordinates?.[1] || 24.8145,
                lng: orderDetails?.restaurantLocation?.coordinates?.[0] || 67.0325,
                name: orderDetails?.restaurant?.name || "Restaurant",
              }}
              customerLocation={{
                lat: orderDetails?.customerLocation?.coordinates?.[1] || 24.822,
                lng: orderDetails?.customerLocation?.coordinates?.[0] || 67.039,
                address: orderDetails?.deliveryAddress || "Home - Clifton",
              }}
              status={currentStatus}
              eta={etaBannerText}
              height={260}
            />
          </View>

          {/* Progress Timeline Section */}
          <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
            <Text className="text-[#1F1F1F] text-base font-black mb-4">
              Order Timeline
            </Text>

            {STATUS_STEPS.map((step, idx) => {
              const isDone = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <View key={step.key} className="flex-row items-start relative mb-4">
                  {/* Vertical connecting line */}
                  {idx < STATUS_STEPS.length - 1 && (
                    <View
                      className={`absolute left-4 top-8 w-0.5 h-10 ${
                        currentStepIndex > idx ? "bg-[#D70F64]" : "bg-[#E2E8F0]"
                      }`}
                    />
                  )}

                  {/* Step Icon Badge */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-3 z-10 ${
                      isDone
                        ? "bg-[#D70F64] shadow-xs"
                        : "bg-[#F7F7F7] border border-[#E2E8F0]"
                    }`}
                  >
                    {step.iconType === "material" ? (
                      <MaterialCommunityIcons
                        name={step.icon}
                        size={16}
                        color={isDone ? "#FFFFFF" : "#A0A0A0"}
                      />
                    ) : (
                      <Ionicons
                        name={step.icon}
                        size={16}
                        color={isDone ? "#FFFFFF" : "#A0A0A0"}
                      />
                    )}
                  </View>

                  {/* Step Text Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-black ${
                          isDone ? "text-[#1F1F1F]" : "text-[#9E9E9E]"
                        }`}
                      >
                        {step.title}
                      </Text>
                      {isCurrent && (
                        <View className="bg-[#FFF0F5] px-2 py-0.5 rounded-full border border-[#FFE0EB]">
                          <Text className="text-[#D70F64] text-[10px] font-black uppercase">
                            In Progress
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[#707070] text-xs font-medium mt-0.5">
                      {step.subtitle}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rider Profile Card & Action Buttons */}
          <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="account-tie-hat" size={26} color="#D70F64" />
                </View>
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    {orderDetails?.rider?.name || "Muhammad Tariq"}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text className="text-[#1F1F1F] text-xs font-black ml-1">
                      {orderDetails?.rider?.rating || 4.9}
                    </Text>
                    <Text className="text-[#707070] text-xs font-medium ml-1.5">
                      • {orderDetails?.rider?.vehicle || "Honda CD 70"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Text className="text-emerald-700 text-[10px] font-extrabold">
                  Assigned Rider
                </Text>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View className="flex-row space-x-2 pt-1">
              <TouchableOpacity
                onPress={handleCallRider}
                activeOpacity={0.8}
                className="flex-1 mr-1.5 bg-[#059669] py-3 rounded-2xl flex-row items-center justify-center shadow-xs"
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text className="text-white text-xs font-black ml-1.5">Call Rider</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMessageRider}
                activeOpacity={0.8}
                className="flex-1 ml-1.5 mr-1.5 bg-[#1F1F1F] py-3 rounded-2xl flex-row items-center justify-center shadow-xs"
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
                <Text className="text-white text-xs font-black ml-1.5">Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleContactSupport}
                activeOpacity={0.8}
                className="flex-1 ml-1.5 bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
              >
                <Feather name="help-circle" size={16} color="#D70F64" />
                <Text className="text-[#D70F64] text-xs font-black ml-1">Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary Dropdown/Card */}
          {orderDetails?.items && orderDetails.items.length > 0 && (
            <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
              <Text className="text-[#1F1F1F] text-base font-black mb-3">
                Order Items ({orderDetails.items.length})
              </Text>

              {orderDetails.items.map((item, index) => (
                <View
                  key={item.id || index}
                  className="flex-row items-center justify-between py-2 border-b border-[#F7F7F7]"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-6 h-6 rounded-lg bg-[#FFF0F5] items-center justify-center mr-2.5">
                      <Text className="text-[#D70F64] text-xs font-extrabold">
                        {item.quantity}x
                      </Text>
                    </View>
                    <Text className="text-[#1F1F1F] text-xs font-bold flex-1" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text className="text-[#1F1F1F] text-xs font-extrabold ml-2">
                    Rs. {item.price * item.quantity}
                  </Text>
                </View>
              ))}

              <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-[#E2E8F0]">
                <Text className="text-[#1F1F1F] text-sm font-black">Total Paid</Text>
                <Text className="text-[#D70F64] text-base font-black">
                  Rs. {orderDetails.total}
                </Text>
              </View>
            </View>
          )}

          {/* Back to Home Button */}
          <View className="mx-4 mt-5">
            <TouchableOpacity
              onPress={() => router.replace("/(customer)/(tabs)")}
              activeOpacity={0.8}
              className="bg-white border border-[#E2E8F0] py-3.5 rounded-2xl items-center shadow-xs"
            >
              <Text className="text-[#707070] text-sm font-bold">
                Return to Foodpanda Home
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
