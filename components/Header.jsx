import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLocationStore } from "../store/locationStore";

/**
 * Production-grade Header Component
 * Matches FoodPanda brand with top location picker, action icons, and search bar.
 */
export default function Header({
  location: propLocation,
  cartCount = 2,
  onPressLocation,
  onPressFavorites,
  onPressCart,
  onPressFilter,
  searchQuery,
  onChangeSearch,
}) {
  const storeAddress = useLocationStore((state) => state.address);
  const location = propLocation || storeAddress || "Street 4, Clifton, Karachi";
  return (
    <View className="bg-[#D70F64] pt-2 pb-4 px-4 shadow-md">
      {/* Top Row: Location & Actions */}
      <View className="flex-row items-center justify-between mb-3.5">
        {/* Location Picker */}
        <TouchableOpacity
          onPress={onPressLocation}
          activeOpacity={0.7}
          className="flex-1 mr-3"
        >
          <View className="flex-row items-center">
            <Ionicons name="location-sharp" size={16} color="#FFFFFF" />
            <Text className="text-white/80 text-xs font-medium ml-1">
              Deliver to
            </Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            <Text
              className="text-white text-base font-bold tracking-tight"
              numberOfLines={1}
            >
              {location}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color="#FFFFFF"
              className="ml-1"
            />
          </View>
        </TouchableOpacity>

        {/* Right Actions: Heart & Shopping Bag */}
        <View className="flex-row items-center space-x-3">
          {/* Favorites Button */}
          <TouchableOpacity
            onPress={onPressFavorites}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mr-2"
          >
            <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Cart with Badge */}
          <TouchableOpacity
            onPress={onPressCart}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center relative"
          >
            <Ionicons name="bag-handle-outline" size={22} color="#FFFFFF" />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-white rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border border-[#D70F64]">
                <Text className="text-[#D70F64] text-[10px] font-extrabold leading-none">
                  {cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Row */}
      <View className="flex-row items-center bg-white rounded-full px-3.5 py-2.5 shadow-sm">
        <Ionicons name="search" size={20} color="#707070" className="mr-2" />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearch}
          placeholder="Search for food, groceries, deals..."
          placeholderTextColor="#9E9E9E"
          className="flex-1 text-[#1F1F1F] text-sm py-0 font-normal"
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={onPressFilter}
          activeOpacity={0.7}
          className="pl-2 border-l border-[#E2E8F0]"
        >
          <Feather name="sliders" size={18} color="#D70F64" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
