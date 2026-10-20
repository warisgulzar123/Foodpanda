import "../../global.css";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  getSocket,
  updateOrderStatusApi,
  fetchRiderJobsApi,
  updateRiderLocationApi,
  toggleRiderDutyApi,
  acceptRiderOrderApi,
} from "../../utils/api";
import LiveMapView from "../../components/LiveMapView";
import {
  calculateDistance,
  calculateETA,
  calculateRiderEarnings,
  formatDistance,
} from "../../utils/distance";

export default function RiderDashboardScreen() {
  const riderId = "RD-482";
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [completedCount, setCompletedCount] = useState(12);
  const [earnings, setEarnings] = useState(3450);

  // Active Job Workflow
  const [activeJob, setActiveJob] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // GPS & Real-time Location State
  const [riderLocation, setRiderLocation] = useState({
    latitude: 24.8145,
    longitude: 67.0325,
    heading: 45,
    speed: 0,
  });
  const [gpsPermission, setGpsPermission] = useState("unknown");
  const locationSubRef = useRef(null);

  // Helper to load jobs from backend with live GPS coordinates
  const refreshJobs = async (coords = riderLocation) => {
    try {
      const res = await fetchRiderJobsApi(riderId, coords);
      if (res?.success) {
        setActiveJob(res.activeJob || null);
        if (res.availableJobs) {
          setAvailableJobs(res.availableJobs);
        }
      }
    } catch (err) {
      console.warn("Could not fetch rider jobs:", err.message);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // 1. Initialize GPS & Continuous High-Accuracy Position Watch
  useEffect(() => {
    let isMounted = true;

    async function initGps() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (isMounted) setGpsPermission(status);

        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          if (isMounted && loc?.coords) {
            const currentCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading || 0,
              speed: loc.coords.speed || 0,
            };
            setRiderLocation(currentCoords);
            refreshJobs(currentCoords);
            updateRiderLocationApi(riderId, {
              lat: currentCoords.latitude,
              lng: currentCoords.longitude,
            });
          }

          // High-Accuracy Continuous Watcher
          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2500,
              distanceInterval: 3,
            },
            (newLoc) => {
              if (!isMounted || !newLoc?.coords) return;
              const updated = {
                latitude: newLoc.coords.latitude,
                longitude: newLoc.coords.longitude,
                heading: newLoc.coords.heading || 0,
                speed: newLoc.coords.speed || 0,
              };

              setRiderLocation(updated);

              // Broadcast real GPS coordinates to socket server
              try {
                const socket = getSocket();
                socket.emit("rider_location_update", {
                  orderId: activeJob?.orderId || null,
                  riderId,
                  riderLat: updated.latitude,
                  riderLng: updated.longitude,
                  heading: updated.heading,
                  speed: updated.speed,
                });
              } catch (e) {}
            }
          );

          locationSubRef.current = sub;
        } else {
          refreshJobs(riderLocation);
        }
      } catch (err) {
        console.warn("GPS initialization error:", err.message);
        refreshJobs(riderLocation);
      }
    }

    initGps();

    return () => {
      isMounted = false;
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, []);

  // 2. Real-Time Socket Listeners for Auto-Dispatch & Delivery Requests with Polling Fallback
  useEffect(() => {
    let isMounted = true;
    let socket;

    try {
      socket = getSocket();

      const joinRiderRooms = () => {
        socket.emit("join_room", `rider_${riderId}`);
        socket.emit("join_room", riderId);
        console.log(`[Rider Socket] Joined rider rooms: ${riderId} & rider_${riderId}`);
      };

      if (socket.connected) {
        joinRiderRooms();
      }

      socket.on("connect", () => {
        if (isMounted) {
          joinRiderRooms();
        }
      });

      // Join immediately as well
      joinRiderRooms();

      // Listen for incoming delivery dispatch requests from backend
      socket.on("new_delivery_request", (data) => {
        if (!isMounted) return;
        console.log("[Rider Socket] Incoming delivery request:", data);

        const restLat = data.pickupCoord?.lat || 24.8145;
        const restLng = data.pickupCoord?.lng || 67.0325;
        const custLat = data.dropoffCoord?.lat || 24.822;
        const custLng = data.dropoffCoord?.lng || 67.039;

        const pickupDist = calculateDistance(
          riderLocation.latitude,
          riderLocation.longitude,
          restLat,
          restLng
        );
        const deliveryDist =
          data.distanceKm || calculateDistance(restLat, restLng, custLat, custLng);
        const totalTripDist = Number((pickupDist + deliveryDist).toFixed(1));
        const breakdown =
          data.earningsBreakdown || calculateRiderEarnings(deliveryDist, 50, 20);

        // Prepend to available jobs with real distances
        setAvailableJobs((prev) => {
          if (prev.some((j) => j.orderId === data.orderId)) return prev;
          const newJob = {
            id: data.orderId,
            orderId: data.orderId,
            restaurant: data.restaurantName || "Restaurant",
            restaurantCoord: { lat: restLat, lng: restLng },
            restaurantAddress: data.restaurantAddress || "Clifton, Karachi",
            dropoff: data.deliveryAddress || "Customer Address",
            dropoffCoord: { lat: custLat, lng: custLng },
            pickupDistance: `${pickupDist} km`,
            pickupDistanceKm: pickupDist,
            deliveryDistance: `${deliveryDist} km`,
            deliveryDistanceKm: deliveryDist,
            totalDistance: `${totalTripDist} km`,
            totalDistanceKm: totalTripDist,
            earning: breakdown.totalEarning,
            earningsBreakdown: breakdown,
            pickupETA: calculateETA(pickupDist, 25),
            deliveryETA: calculateETA(deliveryDist, 25),
            bonusTip: 0,
            itemsCount: data.itemsCount || 1,
            total: data.total,
          };
          return [newJob, ...prev];
        });

        Alert.alert(
          "🚨 New Delivery Request!",
          `Order #${data.orderId} from ${data.restaurantName || 'Restaurant'}.\nDistance: ${deliveryDist} km • Payout: Rs. ${breakdown.totalEarning}`,
          [{ text: "View Order", style: "default" }]
        );
      });
    } catch (err) {
      console.warn("Rider socket notice:", err.message);
    }

    // Background interval fallback: poll every 8 seconds for new jobs
    const pollInterval = setInterval(() => {
      if (isMounted) {
        refreshJobs();
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (socket) {
        socket.off("new_delivery_request");
      }
    };
  }, [riderId]);

  // Handle Duty Toggle
  const handleToggleDuty = async (val) => {
    setIsOnDuty(val);
    await toggleRiderDutyApi(riderId, val);
  };

  // State Machine Step 1: Accept Order
  const handleAcceptJob = async (job) => {
    try {
      const res = await acceptRiderOrderApi(job.orderId, {
        riderId,
        riderName: "Tariq Mahmood",
        riderPhone: "+92 300 8829102",
      });

      const accepted = res?.order || {
        ...job,
        status: "Accepted",
      };

      setActiveJob(accepted);
      setAvailableJobs((prev) => prev.filter((j) => j.orderId !== job.orderId));

      const socket = getSocket();
      socket.emit("join_room", job.orderId);
      socket.emit("update_order_status", {
        orderId: job.orderId,
        status: "Accepted",
        note: "Rider Tariq accepted delivery and is on the way to restaurant.",
      });

      Alert.alert("Delivery Accepted! 🛵", `Proceed to ${job.restaurant} for pickup.`);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // State Machine Step 2, 3, 4: Sequential Status Transition
  const handleNextStep = async () => {
    if (!activeJob) return;
    const socket = getSocket();
    const orderId = activeJob.orderId;

    if (activeJob.status === "Placed" || activeJob.status === "Accepted") {
      // Step: Mark arrived at restaurant
      const nextStatus = "Preparing";
      setActiveJob({ ...activeJob, status: nextStatus });
      await updateOrderStatusApi(orderId, nextStatus, "Rider arrived at restaurant.");
      socket.emit("update_order_status", {
        orderId,
        status: nextStatus,
        note: "Rider has arrived at kitchen and waiting for food packing.",
      });
      Alert.alert("At Restaurant 🏪", "Waiting for kitchen to pack food.");
    } else if (activeJob.status === "Preparing" || activeJob.status === "Ready") {
      // Step: Picked Up -> On the Way
      const nextStatus = "On the Way";
      setActiveJob({ ...activeJob, status: nextStatus });
      await updateOrderStatusApi(orderId, nextStatus, "Rider picked up order. Heading to customer.");
      socket.emit("update_order_status", {
        orderId,
        status: nextStatus,
        note: "Food picked up. Rider is driving to customer delivery address.",
      });
      Alert.alert("Order Picked Up! 📦", "Live GPS is now streaming to customer map.");
    } else if (activeJob.status === "On the Way") {
      // Step: Arrived at Customer Doorstep
      const nextStatus = "Arrived";
      setActiveJob({ ...activeJob, status: nextStatus });
      await updateOrderStatusApi(orderId, nextStatus, "Rider arrived at destination.");
      socket.emit("update_order_status", {
        orderId,
        status: nextStatus,
        note: "Rider is at the delivery address doorbell.",
      });
      Alert.alert("Arrived at Doorstep 📍", "Ring doorbell or contact customer.");
    } else if (activeJob.status === "Arrived") {
      // Step: Delivered
      const earned = Math.round(activeJob.deliveryFee || 180);
      await updateOrderStatusApi(orderId, "Delivered", "Order successfully delivered!");
      socket.emit("update_order_status", {
        orderId,
        status: "Delivered",
        note: "Order successfully delivered! Thank you for choosing Foodpanda.",
      });

      setEarnings((prev) => prev + earned);
      setCompletedCount((prev) => prev + 1);
      setActiveJob(null);
      refreshJobs();

      Alert.alert(
        "Delivery Completed! 🎉",
        `Rs. ${earned} credited to your rider wallet.`
      );
    }
  };

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Rider Top Header */}
        <View className="bg-white px-4 py-3 border-b border-[#E2E8F0]">
          <View className="flex-row items-center justify-between mb-2">
            {/* Rider Identity */}
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-11 h-11 rounded-full bg-[#D70F64] items-center justify-center mr-2.5 shadow-sm">
                <Text className="text-white text-base font-black">TM</Text>
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-[#1F1F1F] text-base font-black mr-1">
                    Tariq Mahmood
                  </Text>
                  <View className="bg-emerald-100 px-1.5 py-0.2 rounded">
                    <Text className="text-emerald-800 text-[10px] font-bold">
                      ⭐ 4.9
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-[11px] font-medium">
                  Rider ID: #{riderId} • Karachi Fleet
                </Text>
              </View>
            </View>

            {/* Switch Portal */}
            <TouchableOpacity
              onPress={() => router.replace("/login")}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-[#F7F7F7] border border-[#E2E8F0] items-center justify-center mr-2"
            >
              <Feather name="log-out" size={16} color="#707070" />
            </TouchableOpacity>

            {/* Duty Status Switch */}
            <View className="flex-row items-center bg-[#F7F7F7] px-2.5 py-1 rounded-full border border-[#E2E8F0]">
              <Text className="text-[11px] font-bold mr-1.5">
                {isOnDuty ? "🟢 Online" : "🔴 Offline"}
              </Text>
              <Switch
                value={isOnDuty}
                onValueChange={handleToggleDuty}
                trackColor={{ false: "#E2E8F0", true: "#FFD0E0" }}
                thumbColor={isOnDuty ? "#D70F64" : "#A0A0A0"}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>

          {/* Quick Earnings & Trips Summary */}
          <View className="flex-row mt-2 space-x-2">
            <View className="flex-1 mr-1.5 bg-[#FFF0F5] border border-[#FFE0EB] p-3 rounded-2xl">
              <Text className="text-[#707070] text-[10px] font-bold uppercase">
                Today's Earnings
              </Text>
              <Text className="text-[#D70F64] text-lg font-black mt-0.5">
                Rs. {earnings}
              </Text>
              <Text className="text-emerald-600 text-[10px] font-bold mt-0.5">
                + Real-time Wallet Sync
              </Text>
            </View>

            <View className="flex-1 ml-1.5 bg-white border border-[#E2E8F0] p-3 rounded-2xl">
              <Text className="text-[#707070] text-[10px] font-bold uppercase">
                Completed Trips
              </Text>
              <Text className="text-[#1F1F1F] text-lg font-black mt-0.5">
                {completedCount} Trips
              </Text>
              <Text className="text-blue-600 text-[10px] font-bold mt-0.5">
                🎯 100% On-Time Score
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* SECTION 1: ACTIVE ORDER MISSION WITH TRUE GOOGLE MAP */}
          {activeJob ? (
            <View className="px-4 mt-4">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[#1F1F1F] text-base font-black">
                  Active Delivery Mission
                </Text>
                <View className="bg-[#D70F64] px-2.5 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-extrabold">
                    #{activeJob.orderId}
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm">
                {/* Real-Time Live Google Map */}
                <View className="mb-3.5">
                  <LiveMapView
                    riderLocation={{
                      lat: riderLocation.latitude,
                      lng: riderLocation.longitude,
                      heading: riderLocation.heading,
                    }}
                    restaurantLocation={{
                      lat: activeJob.restaurantLocation?.coordinates?.[1] || 24.8145,
                      lng: activeJob.restaurantLocation?.coordinates?.[0] || 67.0325,
                      name: activeJob.restaurant?.name || "Restaurant",
                    }}
                    customerLocation={{
                      lat: activeJob.customerLocation?.coordinates?.[1] || 24.822,
                      lng: activeJob.customerLocation?.coordinates?.[0] || 67.039,
                      address: activeJob.deliveryAddress || "Customer",
                    }}
                    status={activeJob.status}
                    eta="Live GPS"
                    height={200}
                  />
                </View>

                {/* Pickup & Destination Details */}
                <View className="space-y-3 mb-3">
                  {/* Pickup */}
                  <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2.5 mt-0.5">
                      <Ionicons name="storefront" size={16} color="#D70F64" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#707070] text-[10px] font-bold uppercase">
                        PICKUP RESTAURANT
                      </Text>
                      <Text className="text-[#1F1F1F] text-sm font-extrabold">
                        {activeJob.restaurant?.name || "KFC - Clifton"}
                      </Text>
                      <Text className="text-[#707070] text-xs">
                        {activeJob.restaurant?.address || "Sea View Road, Block 4, Karachi"}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery */}
                  <View className="flex-row items-start mt-2">
                    <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-2.5 mt-0.5">
                      <Ionicons name="location" size={16} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#707070] text-[10px] font-bold uppercase">
                        DELIVERY ADDRESS
                      </Text>
                      <Text className="text-[#1F1F1F] text-sm font-extrabold">
                        {activeJob.deliveryAddress || "Home - Clifton"}
                      </Text>
                      <Text className="text-[#707070] text-xs">
                        {activeJob.addressDetail || "Karachi, Pakistan"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Order Package & Collection Note */}
                <View className="bg-[#F7F7F7] p-3 rounded-2xl mb-3.5 border border-[#E2E8F0]">
                  <Text className="text-[#1F1F1F] text-xs font-bold">
                    Payment: {activeJob.paymentMethod || "Cash on Delivery"}
                  </Text>
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-[#D70F64] text-xs font-black">
                      Collect: Rs. {activeJob.total || 0}
                    </Text>
                    <Text className="text-emerald-700 text-xs font-black">
                      Payout: +Rs. {activeJob.riderEarnings || activeJob.deliveryFee || 150} ({activeJob.distanceKm ? `${activeJob.distanceKm} km` : '2.8 km'})
                    </Text>
                  </View>
                </View>

                {/* Customer Contact Action Buttons */}
                <View className="flex-row space-x-2 mb-4">
                  <TouchableOpacity
                    onPress={() => Linking.openURL("tel:+923001234567")}
                    activeOpacity={0.8}
                    className="flex-1 mr-1.5 py-2.5 rounded-2xl bg-white border border-[#E2E8F0] flex-row items-center justify-center shadow-xs"
                  >
                    <Ionicons name="call" size={16} color="#059669" />
                    <Text className="text-[#1F1F1F] text-xs font-bold ml-1.5">
                      Call Customer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => Linking.openURL("sms:+923001234567")}
                    activeOpacity={0.8}
                    className="flex-1 ml-1.5 py-2.5 rounded-2xl bg-white border border-[#E2E8F0] flex-row items-center justify-center shadow-xs"
                  >
                    <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" />
                    <Text className="text-[#1F1F1F] text-xs font-bold ml-1.5">
                      Send Message
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* State Machine Transition CTA */}
                <TouchableOpacity
                  onPress={handleNextStep}
                  activeOpacity={0.85}
                  className="bg-[#D70F64] py-3.5 rounded-2xl items-center shadow-md flex-row justify-center"
                >
                  {(activeJob.status === "Placed" || activeJob.status === "Accepted") && (
                    <>
                      <Text className="text-white text-sm font-black mr-2">
                        Arrived at Restaurant 🏪
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                  {(activeJob.status === "Preparing" || activeJob.status === "Ready") && (
                    <>
                      <Text className="text-white text-sm font-black mr-2">
                        Confirm Picked Up 📦
                      </Text>
                      <Ionicons name="navigate" size={18} color="#FFFFFF" />
                    </>
                  )}
                  {activeJob.status === "On the Way" && (
                    <>
                      <Text className="text-white text-sm font-black mr-2">
                        Arrived at Customer Doorstep 📍
                      </Text>
                      <Ionicons name="location" size={18} color="#FFFFFF" />
                    </>
                  )}
                  {activeJob.status === "Arrived" && (
                    <>
                      <Text className="text-white text-sm font-black mr-2">
                        Confirm Delivered ✅
                      </Text>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* SECTION 2: LIVE AVAILABLE DELIVERY JOBS FEED */}
          <View className="px-4 mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#1F1F1F] text-base font-black">
                Nearby Orders (5km Radius)
              </Text>
              <TouchableOpacity onPress={() => refreshJobs()}>
                <Text className="text-[#D70F64] text-xs font-bold">Refresh 🔄</Text>
              </TouchableOpacity>
            </View>

            {isLoadingJobs ? (
              <View className="bg-white p-8 rounded-3xl border border-[#E2E8F0] items-center">
                <ActivityIndicator size="small" color="#D70F64" />
                <Text className="text-[#707070] text-xs font-medium mt-2">
                  Scanning active orders near your GPS...
                </Text>
              </View>
            ) : availableJobs.length === 0 ? (
              <View className="bg-white p-6 rounded-3xl border border-[#E2E8F0] items-center justify-center">
                <Text className="text-3xl mb-1">🛵</Text>
                <Text className="text-[#1F1F1F] text-sm font-bold">
                  No pending delivery orders
                </Text>
                <Text className="text-[#707070] text-xs text-center mt-1">
                  You are in the Clifton hotspot. Incoming orders will be automatically dispatched to you.
                </Text>
              </View>
            ) : (
              availableJobs.map((job) => {
                const pickupDistanceKm =
                  job.pickupDistanceKm ??
                  calculateDistance(
                    riderLocation.latitude,
                    riderLocation.longitude,
                    job.restaurantCoord?.lat || 24.8145,
                    job.restaurantCoord?.lng || 67.0325
                  );
                const deliveryDistanceKm =
                  job.deliveryDistanceKm ??
                  calculateDistance(
                    job.restaurantCoord?.lat || 24.8145,
                    job.restaurantCoord?.lng || 67.0325,
                    job.dropoffCoord?.lat || 24.822,
                    job.dropoffCoord?.lng || 67.039
                  );
                const totalTripKm =
                  job.totalDistanceKm ??
                  Number((pickupDistanceKm + deliveryDistanceKm).toFixed(1));
                const breakdown =
                  job.earningsBreakdown ??
                  calculateRiderEarnings(deliveryDistanceKm, 50, 20);

                return (
                  <View
                    key={job.orderId || job.id}
                    className="bg-white rounded-3xl p-4 mb-4 border border-[#E2E8F0] shadow-sm"
                  >
                    {/* Card Header: Restaurant & Total Payout Badge */}
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center mb-1">
                          <View className="bg-[#FFF0F5] px-2 py-0.5 rounded-full border border-[#FFE0EB] mr-2">
                            <Text className="text-[#D70F64] text-[10px] font-black">
                              ORDER #{job.orderId}
                            </Text>
                          </View>
                          <Text className="text-[#707070] text-[11px] font-semibold">
                            {job.itemsCount || 2} Items
                          </Text>
                        </View>
                        <Text className="text-[#1F1F1F] text-base font-black">
                          {job.restaurant}
                        </Text>
                      </View>

                      <View className="bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200 items-end">
                        <Text className="text-emerald-800 text-sm font-black">
                          Rs. {breakdown.totalEarning}
                        </Text>
                        <Text className="text-emerald-600 text-[10px] font-bold">
                          Guaranteed Payout
                        </Text>
                      </View>
                    </View>

                    {/* Route & Distance Flow */}
                    <View className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] mb-3 space-y-2.5">
                      {/* 1. Restaurant distance from rider's current location */}
                      <View className="flex-row items-start">
                        <View className="w-6 h-6 rounded-full bg-pink-100 items-center justify-center mr-2.5 mt-0.5">
                          <Ionicons name="storefront" size={13} color="#D70F64" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[#707070] text-[10px] font-bold uppercase tracking-wider">
                            1. PICKUP RESTAURANT
                          </Text>
                          <Text className="text-[#1F1F1F] text-xs font-bold">
                            {job.restaurant}
                          </Text>
                          <Text className="text-[#D70F64] text-[11px] font-extrabold mt-0.5">
                            📍 {pickupDistanceKm} km away from your location (~{calculateETA(pickupDistanceKm, 25)} mins ride)
                          </Text>
                        </View>
                      </View>

                      {/* Connecting line */}
                      <View className="ml-3 pl-3 border-l border-dashed border-[#CBD5E1] my-0.5" />

                      {/* 2. Total delivery distance (Restaurant to Customer) */}
                      <View className="flex-row items-start">
                        <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mr-2.5 mt-0.5">
                          <Ionicons name="location" size={13} color="#059669" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[#707070] text-[10px] font-bold uppercase tracking-wider">
                            2. CUSTOMER DELIVERY
                          </Text>
                          <Text className="text-[#1F1F1F] text-xs font-bold" numberOfLines={1}>
                            {job.dropoff}
                          </Text>
                          <Text className="text-emerald-700 text-[11px] font-extrabold mt-0.5">
                            🏁 {deliveryDistanceKm} km delivery distance (~{calculateETA(deliveryDistanceKm, 25)} mins ride)
                          </Text>
                        </View>
                      </View>

                      <View className="pt-2 border-t border-[#E2E8F0] flex-row items-center justify-between">
                        <Text className="text-[#707070] text-[11px] font-semibold">
                          Total Trip Distance:
                        </Text>
                        <Text className="text-[#1F1F1F] text-xs font-black">
                          🛣️ {totalTripKm} km total trip
                        </Text>
                      </View>
                    </View>

                    {/* 3. Total Calculated Earnings Breakdown based on per-KM rates */}
                    <View className="bg-[#FFF8FA] p-3 rounded-2xl border border-[#FFE0EB] mb-3">
                      <Text className="text-[#D70F64] text-[11px] font-black uppercase tracking-wider mb-2">
                        💵 Earnings Breakdown (Foodpanda Rate Card)
                      </Text>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-[#707070] text-xs">Base Pickup Fare:</Text>
                        <Text className="text-[#1F1F1F] text-xs font-bold">
                          Rs. {breakdown.baseFare}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-[#707070] text-xs">
                          Distance Fare ({deliveryDistanceKm} km × Rs. {breakdown.ratePerKm || 20}/km):
                        </Text>
                        <Text className="text-emerald-700 text-xs font-bold">
                          + Rs. {breakdown.distancePay}
                        </Text>
                      </View>
                      {breakdown.bonusTip > 0 && (
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-blue-600 text-xs">Performance / Tip Bonus:</Text>
                          <Text className="text-blue-700 text-xs font-bold">
                            + Rs. {breakdown.bonusTip}
                          </Text>
                        </View>
                      )}
                      <View className="h-[1px] bg-[#FFE0EB] my-1.5" />
                      <View className="flex-row justify-between items-center">
                        <Text className="text-[#1F1F1F] text-xs font-black">Net Rider Payout:</Text>
                        <Text className="text-[#D70F64] text-sm font-black">
                          Rs. {breakdown.totalEarning}
                        </Text>
                      </View>
                    </View>

                    {/* Accept Job CTA */}
                    <TouchableOpacity
                      onPress={() => handleAcceptJob({ ...job, earning: breakdown.totalEarning })}
                      activeOpacity={0.85}
                      className="bg-[#D70F64] py-3.5 rounded-2xl items-center shadow-md flex-row justify-center"
                    >
                      <Text className="text-white text-xs font-black mr-1.5">
                        Accept Delivery • Earn Rs. {breakdown.totalEarning}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
