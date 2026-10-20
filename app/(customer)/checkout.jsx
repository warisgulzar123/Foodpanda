import "../../global.css";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
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
import useCartStore from "../../store/useCartStore";
import { useLocationStore } from "../../store/locationStore";
import { createOrderApi } from "../../utils/api";
import {
  calculateDistance,
  calculateDeliveryFee,
  calculateETA,
  formatDistance,
} from "../../utils/distance";

export default function CheckoutScreen() {
  const {
    items,
    restaurant,
    deliveryFee,
    platformFee,
    voucherDiscount,
    voucherCode,
    getSubtotal,
    getTotal,
    setDeliveryFee,
    clearCart,
  } = useCartStore();

  const storedAddress = useLocationStore((state) => state.address);
  const storedLat = useLocationStore((state) => state.latitude);
  const storedLng = useLocationStore((state) => state.longitude);

  const subtotal = getSubtotal();
  const total = getTotal();

  // State
  const [address, setAddress] = useState(storedAddress || "Home - Clifton, Block 4");
  const [addressDetail, setAddressDetail] = useState(
    "Apartment 4B, Ocean View Heights, Sea View Road, Karachi"
  );
  const [deliveryNote, setDeliveryNote] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [customerLocation, setCustomerLocation] = useState({
    lat: storedLat || 24.8138,
    lng: storedLng || 67.0298,
  });
  const [gpsStatusText, setGpsStatusText] = useState(
    storedLat ? `GPS Active: ${storedLat.toFixed(4)}, ${storedLng.toFixed(4)}` : "Detecting GPS..."
  );

  // Precise Haversine Distance & Dynamic Fee Engine
  const restLat =
    restaurant?.location?.lat ??
    (restaurant?.location?.coordinates ? restaurant.location.coordinates[1] : 24.8145);
  const restLng =
    restaurant?.location?.lng ??
    (restaurant?.location?.coordinates ? restaurant.location.coordinates[0] : 67.0325);

  const deliveryDistanceKm = calculateDistance(
    restLat,
    restLng,
    customerLocation.lat,
    customerLocation.lng
  );
  const dynamicDeliveryFee = calculateDeliveryFee(deliveryDistanceKm, 50, 25);
  const estimatedETA = calculateETA(deliveryDistanceKm, 25, 10);

  // Sync calculated fee with cart store
  useEffect(() => {
    setDeliveryFee(dynamicDeliveryFee);
  }, [dynamicDeliveryFee]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            setCustomerLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });
            setGpsStatusText(`GPS Active: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
          }
        } else {
          setGpsStatusText("Default Location (Clifton, Karachi)");
        }
      } catch (err) {
        setGpsStatusText("Clifton Block 4 (Default)");
      }
    })();
  }, []);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);

    try {
      const finalTotal = Math.max(0, subtotal + dynamicDeliveryFee + platformFee - voucherDiscount);

      const orderPayload = {
        restaurant: restaurant || {
          id: "kfc-clifton",
          name: "KFC - Clifton Block 4",
          deliveryTime: `${estimatedETA}-${estimatedETA + 5} min`,
        },
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image || "",
        })),
        subtotal,
        deliveryFee: dynamicDeliveryFee,
        distanceKm: deliveryDistanceKm,
        estimatedDurationMinutes: estimatedETA,
        platformFee,
        voucherDiscount,
        total: finalTotal,
        deliveryAddress: address,
        addressDetail,
        deliveryNote,
        customerLocation,
        paymentMethod:
          selectedPayment === "cod"
            ? "Cash on Delivery (COD)"
            : selectedPayment === "pandapay"
            ? "PandaPay / Digital Wallet"
            : "Credit / Debit Card",
      };

      const response = await createOrderApi(orderPayload);
      const newOrderId =
        response?.orderId || `FP-${Math.floor(100000 + Math.random() * 900000)}`;

      clearCart();
      setIsPlacingOrder(false);
      router.replace(`/(customer)/order-tracking/${newOrderId}`);
    } catch (err) {
      console.warn("Order placement fallback:", err);
      const fallbackId = `FP-${Math.floor(100000 + Math.random() * 900000)}`;
      clearCart();
      setIsPlacingOrder(false);
      router.replace(`/(customer)/order-tracking/${fallbackId}`);
    }
  };

  const handleTrackOrder = () => {
    setIsSuccessModalVisible(false);
    if (orderId) {
      router.replace(`/(customer)/order-tracking/${orderId}`);
    } else {
      router.replace("/(customer)/(tabs)");
    }
  };

  const PAYMENT_METHODS = [
    {
      id: "cod",
      title: "Cash on Delivery (COD) 💵",
      subtitle: "Pay in cash upon arrival",
      icon: "cash",
      iconType: "ionicons",
    },
    {
      id: "pandapay",
      title: "PandaPay / Digital Wallet 💳",
      subtitle: "Available Balance: Rs. 450",
      icon: "wallet-outline",
      iconType: "material",
    },
    {
      id: "card",
      title: "Credit / Debit Card 💳",
      subtitle: "Visa ending in 4242",
      icon: "credit-card",
      iconType: "feather",
    },
  ];

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. Header */}
      <View className="bg-white px-4 py-3.5 border-b border-[#E2E8F0] flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-[#F7F7F7] items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={22} color="#1F1F1F" />
          </TouchableOpacity>
          <View>
            <Text className="text-[#1F1F1F] text-lg font-black">Checkout</Text>
            <Text className="text-[#707070] text-xs font-medium" numberOfLines={1}>
              {restaurant?.name || "FoodPanda Order"}
            </Text>
          </View>
        </View>

        {/* Estimated Delivery Time Badge */}
        <View className="bg-[#FFF0F5] border border-[#FFE0EB] px-3 py-1.5 rounded-full flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#D70F64" />
          <Text className="text-[#D70F64] text-xs font-extrabold ml-1">
            15-25 min
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Delivery Location Card */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-[#FFF0F5] items-center justify-center mr-2">
                <Ionicons name="location-sharp" size={18} color="#D70F64" />
              </View>
              <Text className="text-[#1F1F1F] text-sm font-black">
                Delivery Address
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setAddress("Office - Clifton, Block 2");
                setAddressDetail("Suite 701, Fortune Center, Shahrah-e-Faisal");
              }}
              activeOpacity={0.7}
              className="bg-[#F7F7F7] px-3 py-1 rounded-full border border-[#E2E8F0] flex-row items-center"
            >
              <Text className="text-[#D70F64] text-xs font-bold mr-1">Change</Text>
              <Text className="text-xs">📍</Text>
            </TouchableOpacity>
          </View>

          <View className="pl-10">
            <Text className="text-[#1F1F1F] text-sm font-extrabold">
              {address}
            </Text>
            <Text className="text-[#707070] text-xs font-medium mt-0.5 leading-relaxed">
              {addressDetail}
            </Text>
            <View className="mt-2 flex-row items-center">
              <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-row items-center">
                <Ionicons name="navigate-circle" size={13} color="#059669" />
                <Text className="text-emerald-700 text-[10px] font-black ml-1">
                  {gpsStatusText}
                </Text>
              </View>
            </View>
          </View>

          {/* Optional Delivery Instructions Note Input */}
          <View className="mt-3.5 pt-3 border-t border-[#F7F7F7]">
            <View className="flex-row items-center bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5">
              <Feather name="edit-3" size={16} color="#707070" className="mr-2" />
              <TextInput
                value={deliveryNote}
                onChangeText={setDeliveryNote}
                placeholder="Delivery instructions (e.g. Leave at door, don't ring bell)"
                placeholderTextColor="#9E9E9E"
                className="flex-1 text-[#1F1F1F] text-xs py-0"
              />
            </View>
          </View>
        </View>

        {/* 3. Order Summary Section */}
        <View className="bg-white mx-4 mt-3 rounded-3xl border border-[#E2E8F0] shadow-sm p-4">
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-[#F7F7F7]">
            <View>
              <Text className="text-[#1F1F1F] text-sm font-black">
                Order Summary
              </Text>
              <Text className="text-[#707070] text-xs font-medium">
                {restaurant?.name || "KFC - Clifton Block 4"}
              </Text>
            </View>

            <View className="bg-[#FFF0F5] px-2.5 py-1 rounded-full">
              <Text className="text-[#D70F64] text-[11px] font-bold">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </Text>
            </View>
          </View>

          {/* Itemized List */}
          {items.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text className="text-[#707070] text-xs">No items in cart</Text>
            </View>
          ) : (
            items.map((item, idx) => (
              <View
                key={item.id || idx}
                className={`flex-row items-center justify-between py-2.5 ${
                  idx !== items.length - 1 ? "border-b border-[#F7F7F7]" : ""
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-6 h-6 rounded-md bg-[#FFF0F5] items-center justify-center mr-2.5">
                    <Text className="text-[#D70F64] text-xs font-black">
                      {item.quantity}x
                    </Text>
                  </View>
                  <Text
                    className="text-[#1F1F1F] text-xs font-bold flex-1"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>

                <Text className="text-[#1F1F1F] text-xs font-extrabold">
                  Rs. {item.price * item.quantity}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 4. Payment Method Selector */}
        <View className="bg-white mx-4 mt-3 rounded-3xl border border-[#E2E8F0] shadow-sm p-4">
          <Text className="text-[#1F1F1F] text-sm font-black mb-3">
            Payment Method
          </Text>

          <View className="space-y-2.5">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPayment === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setSelectedPayment(method.id)}
                  activeOpacity={0.8}
                  className={`p-3.5 rounded-2xl border flex-row items-center justify-between mb-2 ${
                    isSelected
                      ? "bg-[#FFF0F5] border-[#D70F64]"
                      : "bg-[#F7F7F7] border-[#E2E8F0]"
                  }`}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${
                        isSelected ? "bg-[#D70F64]" : "bg-white border border-[#E2E8F0]"
                      }`}
                    >
                      {method.iconType === "ionicons" && (
                        <Ionicons
                          name={method.icon}
                          size={20}
                          color={isSelected ? "#FFFFFF" : "#707070"}
                        />
                      )}
                      {method.iconType === "material" && (
                        <MaterialCommunityIcons
                          name={method.icon}
                          size={20}
                          color={isSelected ? "#FFFFFF" : "#707070"}
                        />
                      )}
                      {method.iconType === "feather" && (
                        <Feather
                          name={method.icon}
                          size={18}
                          color={isSelected ? "#FFFFFF" : "#707070"}
                        />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-xs font-black ${
                          isSelected ? "text-[#D70F64]" : "text-[#1F1F1F]"
                        }`}
                      >
                        {method.title}
                      </Text>
                      <Text className="text-[#707070] text-[11px] font-medium mt-0.5">
                        {method.subtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Radio Indicator */}
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center border-2 ${
                      isSelected ? "border-[#D70F64] bg-[#D70F64]" : "border-[#B0B0B0]"
                    }`}
                  >
                    {isSelected && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Bill Breakdown Card */}
        <View className="bg-white mx-4 mt-3 rounded-3xl border border-[#E2E8F0] shadow-sm p-4">
          <Text className="text-[#1F1F1F] text-sm font-black mb-3">
            Bill Breakdown
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[#707070] text-xs font-medium">Subtotal</Text>
              <Text className="text-[#1F1F1F] text-xs font-semibold">
                Rs. {subtotal}
              </Text>
            </View>

            <View className="flex-row justify-between items-start mb-1.5">
              <View>
                <Text className="text-[#707070] text-xs font-medium">Delivery Fee</Text>
                <Text className="text-[#9E9E9E] text-[10px] font-medium">
                  Rs. 50 base fare + {deliveryDistanceKm} km @ Rs. 25/km
                </Text>
              </View>
              <Text className="text-[#1F1F1F] text-xs font-semibold">
                Rs. {dynamicDeliveryFee}
              </Text>
            </View>

            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[#707070] text-xs font-medium">Platform Fee</Text>
              <Text className="text-[#1F1F1F] text-xs font-semibold">
                Rs. {platformFee}
              </Text>
            </View>

            {voucherDiscount > 0 && (
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-emerald-600 text-xs font-semibold">
                  Voucher ({voucherCode})
                </Text>
                <Text className="text-emerald-600 text-xs font-bold">
                  - Rs. {voucherDiscount}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-[#E2E8F0] my-2" />

            <View className="flex-row justify-between items-center">
              <Text className="text-[#1F1F1F] text-sm font-black">
                Total Amount
              </Text>
              <Text className="text-[#D70F64] text-base font-black">
                Rs. {total}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 6. Place Order Sticky Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3.5 shadow-2xl">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          activeOpacity={0.85}
          disabled={items.length === 0 || isPlacingOrder}
          className={`rounded-2xl p-4 flex-row items-center justify-between shadow-lg ${
            items.length === 0 || isPlacingOrder ? "bg-gray-300" : "bg-[#D70F64]"
          }`}
        >
          {/* Price & Summary */}
          <View>
            <Text className="text-white/80 text-[11px] font-medium">Total to Pay</Text>
            <Text className="text-white text-lg font-black leading-tight">
              Rs. {total}
            </Text>
          </View>

          {/* CTA */}
          <View className="flex-row items-center bg-white/20 px-4 py-2 rounded-xl">
            {isPlacingOrder ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                <Text className="text-white text-sm font-black">
                  Sending Order...
                </Text>
              </>
            ) : (
              <>
                <Text className="text-white text-sm font-black mr-1.5">
                  Place Order
                </Text>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* 7. Order Success Modal */}
      <Modal
        visible={isSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleTrackOrder}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="bg-white w-full rounded-3xl p-6 items-center shadow-2xl">
            {/* Celebration Icon */}
            <View className="w-20 h-20 rounded-full bg-[#FFF0F5] border-2 border-[#D70F64] items-center justify-center mb-4">
              <Text className="text-4xl">🎉</Text>
            </View>

            <Text className="text-[#1F1F1F] text-xl font-black text-center">
              Order Placed Successfully!
            </Text>

            <View className="bg-[#F7F7F7] px-3 py-1.5 rounded-full my-2.5">
              <Text className="text-[#D70F64] text-xs font-extrabold tracking-wide">
                Order ID: {orderId}
              </Text>
            </View>

            <Text className="text-[#707070] text-xs text-center leading-relaxed px-4">
              Your order has been sent to{" "}
              <Text className="font-bold text-[#1F1F1F]">
                {restaurant?.name || "the restaurant"}
              </Text>
              . Our rider will deliver it in 15-25 minutes!
            </Text>

            {/* Estimated Arrival Box */}
            <View className="bg-[#FFF0F5] border border-[#FFE0EB] w-full rounded-2xl p-3 my-4 flex-row items-center justify-around">
              <View className="items-center">
                <Text className="text-[#707070] text-[10px] font-semibold">
                  ESTIMATED ARRIVAL
                </Text>
                <Text className="text-[#D70F64] text-base font-black">
                  15 - 25 Mins
                </Text>
              </View>
              <View className="h-8 w-[1px] bg-[#FFE0EB]" />
              <View className="items-center">
                <Text className="text-[#707070] text-[10px] font-semibold">
                  PAYMENT
                </Text>
                <Text className="text-[#1F1F1F] text-xs font-bold uppercase">
                  {selectedPayment}
                </Text>
              </View>
            </View>

            {/* CTAs */}
            <TouchableOpacity
              onPress={handleTrackOrder}
              activeOpacity={0.85}
              className="bg-[#D70F64] w-full py-3.5 rounded-2xl items-center shadow-sm mb-2.5"
            >
              <Text className="text-white text-sm font-black">
                Track Order Live 🛵
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTrackOrder}
              activeOpacity={0.7}
              className="py-2"
            >
              <Text className="text-[#707070] text-xs font-bold">
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  </View>
);
}
