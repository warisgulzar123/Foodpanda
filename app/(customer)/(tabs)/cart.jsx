import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useCartStore } from "../../../store/cartStore";

export default function CartScreen() {
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");

  const {
    items,
    restaurant,
    deliveryFee,
    platformFee,
    voucherDiscount,
    voucherCode,
    addItem,
    removeItem,
    deleteItem,
    clearCart,
    applyVoucher,
    removeVoucher,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const subtotal = getSubtotal();
  const total = getTotal();

  const handleApplyVoucher = () => {
    if (!voucherInput.trim()) return;
    const res = applyVoucher(voucherInput);
    setVoucherMessage(res.message);
    if (res.success) {
      setVoucherInput("");
    }
  };

  const handleCheckout = () => {
    router.push("/(customer)/checkout");
  };

  // 1. EMPTY STATE
  if (items.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <SafeAreaView edges={["top"]} className="flex-1">
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View className="px-4 py-3 border-b border-[#E2E8F0] flex-row items-center">
          <Text className="text-[#1F1F1F] text-lg font-black">My Cart</Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="w-28 h-28 rounded-full bg-[#FFF0F5] items-center justify-center mb-5">
            <Feather name="shopping-bag" size={48} color="#D70F64" />
          </View>
          <Text className="text-[#1F1F1F] text-xl font-extrabold text-center">
            Your cart is empty
          </Text>
          <Text className="text-[#707070] text-sm text-center mt-2 leading-relaxed">
            Good food is always cooking! Add items from your favorite restaurants and pandamart.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.85}
            className="mt-6 bg-[#D70F64] px-7 py-3.5 rounded-full shadow-sm"
          >
            <Text className="text-white text-sm font-bold">Browse restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

  // 2. ACTIVE CART STATE
  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Cart Top Bar */}
      <View className="bg-white px-4 py-3 border-b border-[#E2E8F0] flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-[#1F1F1F] text-lg font-black">My Cart</Text>
          <View className="ml-2 bg-[#FFF0F5] px-2 py-0.5 rounded-full">
            <Text className="text-[#D70F64] text-xs font-bold">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={clearCart} className="p-1">
          <Text className="text-[#707070] text-xs font-semibold">Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Restaurant Banner */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-[#1F1F1F] text-base font-extrabold" numberOfLines={1}>
                {restaurant?.name || "KFC - Clifton Block 4"}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="time-outline" size={13} color="#D70F64" />
                <Text className="text-[#D70F64] text-xs font-bold ml-1">
                  Est. Delivery: {restaurant?.deliveryTime || "20-25 min"}
                </Text>
              </View>
            </View>
            <View className="w-10 h-10 rounded-full bg-[#FFF0F5] items-center justify-center">
              <Ionicons name="restaurant" size={20} color="#D70F64" />
            </View>
          </View>
        </View>

        {/* Itemized List */}
        <View className="bg-white mx-4 mt-3 rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden p-4">
          <Text className="text-[#1F1F1F] text-sm font-extrabold mb-3">
            Item Details
          </Text>

          {items.map((item, index) => (
            <View
              key={item.id}
              className={`flex-row items-center justify-between py-3 ${
                index !== items.length - 1 ? "border-b border-[#F7F7F7]" : ""
              }`}
            >
              {/* Item Info */}
              <View className="flex-1 mr-3">
                <Text className="text-[#1F1F1F] text-sm font-bold" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[#D70F64] text-xs font-semibold mt-0.5">
                  Rs. {item.price} each
                </Text>
              </View>

              {/* Quantity Controller (- count +) */}
              <View className="flex-row items-center bg-[#F7F7F7] border border-[#E2E8F0] rounded-full px-2 py-1 mr-3">
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  activeOpacity={0.7}
                  className="w-6 h-6 rounded-full bg-white items-center justify-center shadow-xs"
                >
                  <Ionicons name="remove" size={14} color="#1F1F1F" />
                </TouchableOpacity>

                <Text className="text-[#1F1F1F] text-xs font-extrabold px-2.5">
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  onPress={() => addItem(item)}
                  activeOpacity={0.7}
                  className="w-6 h-6 rounded-full bg-[#D70F64] items-center justify-center shadow-xs"
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Item Subtotal */}
              <View className="items-end min-w-[65px]">
                <Text className="text-[#1F1F1F] text-sm font-bold">
                  Rs. {item.price * item.quantity}
                </Text>
              </View>
            </View>
          ))}

          {/* Add More Items Link */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.7}
            className="mt-3 pt-3 border-t border-[#F7F7F7] flex-row items-center justify-center"
          >
            <Ionicons name="add-circle-outline" size={16} color="#D70F64" />
            <Text className="text-[#D70F64] text-xs font-bold ml-1">
              Add more items
            </Text>
          </TouchableOpacity>
        </View>

        {/* Promo Voucher Input Bar */}
        <View className="bg-white mx-4 mt-3 rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
          <Text className="text-[#1F1F1F] text-sm font-extrabold mb-2">
            Voucher Code
          </Text>

          {voucherCode ? (
            <View className="flex-row items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <View className="ml-2">
                  <Text className="text-emerald-800 text-xs font-bold">
                    Voucher Applied: {voucherCode}
                  </Text>
                  <Text className="text-emerald-700 text-[10px]">
                    Savings of Rs. {voucherDiscount}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={removeVoucher}>
                <Text className="text-rose-600 text-xs font-bold">Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="flex-1 flex-row items-center bg-[#F7F7F7] border border-[#E2E8F0] rounded-xl px-3 py-2 mr-2">
                <Ionicons name="pricetag-outline" size={16} color="#707070" className="mr-1.5" />
                <TextInput
                  value={voucherInput}
                  onChangeText={setVoucherInput}
                  placeholder="Try: WELCOME50"
                  placeholderTextColor="#9E9E9E"
                  autoCapitalize="characters"
                  className="flex-1 text-[#1F1F1F] text-xs py-0"
                />
              </View>
              <TouchableOpacity
                onPress={handleApplyVoucher}
                activeOpacity={0.8}
                className="bg-[#D70F64] px-4 py-2.5 rounded-xl"
              >
                <Text className="text-white text-xs font-bold">Apply</Text>
              </TouchableOpacity>
            </View>
          )}

          {voucherMessage ? (
            <Text
              className={`text-[11px] mt-1.5 font-medium ${
                voucherCode ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {voucherMessage}
            </Text>
          ) : null}
        </View>

        {/* Bill Details Box */}
        <View className="bg-white mx-4 mt-3 rounded-2xl border border-[#E2E8F0] shadow-sm p-4">
          <Text className="text-[#1F1F1F] text-sm font-extrabold mb-3">
            Bill Summary
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[#707070] text-xs font-medium">Subtotal</Text>
              <Text className="text-[#1F1F1F] text-xs font-semibold">
                Rs. {subtotal}
              </Text>
            </View>

            <View className="flex-row justify-between mb-1.5">
              <Text className="text-[#707070] text-xs font-medium">Standard Delivery</Text>
              <Text className="text-[#1F1F1F] text-xs font-semibold">
                Rs. {deliveryFee}
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
                  Voucher Discount
                </Text>
                <Text className="text-emerald-600 text-xs font-bold">
                  - Rs. {voucherDiscount}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-[#E2E8F0] my-2" />

            <View className="flex-row justify-between items-center">
              <Text className="text-[#1F1F1F] text-sm font-black">Total (incl. VAT)</Text>
              <Text className="text-[#D70F64] text-base font-black">
                Rs. {total}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View className="absolute bottom-16 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3 shadow-lg flex-row items-center justify-between">
        <View>
          <Text className="text-[#707070] text-[11px] font-medium">Total Amount</Text>
          <Text className="text-[#1F1F1F] text-lg font-black leading-tight">
            Rs. {total}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCheckout}
          activeOpacity={0.85}
          className="bg-[#D70F64] px-7 py-3 rounded-full flex-row items-center shadow-md"
        >
          <Text className="text-white text-sm font-black mr-1.5">
            Proceed to Checkout
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </View>
);
}
