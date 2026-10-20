import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { resolveImageUrl } from "../utils/image";

export default function RestaurantCard({
  restaurant,
  onPress,
  onToggleFavorite,
}) {
  const [isFavorite, setIsFavorite] = useState(restaurant?.isFavorite || false);

  const handleFavoritePress = () => {
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    if (onToggleFavorite) {
      onToggleFavorite(restaurant.id, nextState);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(restaurant)}
      activeOpacity={0.9}
      className="bg-white rounded-2xl mb-4 border border-[#E2E8F0] shadow-sm overflow-hidden"
    >
      {/* Cover Image & Overlays */}
      <View className="relative w-full h-44 bg-[#F2F2F2]">
        <Image
          source={{ uri: resolveImageUrl(restaurant.image, "restaurant") }}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Top-Left Discount Badge */}
        {restaurant.discount && (
          <View className="absolute top-3 left-3 bg-[#D70F64] px-2.5 py-1 rounded-lg shadow-sm">
            <Text className="text-white text-xs font-extrabold uppercase">
              {restaurant.discount}
            </Text>
          </View>
        )}

        {/* Top-Right Heart Favorite Icon */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          activeOpacity={0.8}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 items-center justify-center shadow-sm"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#D70F64" : "#1F1F1F"}
          />
        </TouchableOpacity>

        {/* Bottom Delivery Time Tag overlay */}
        <View className="absolute bottom-3 right-3 bg-white/95 px-2.5 py-1 rounded-full shadow-sm flex-row items-center">
          <Ionicons name="time-outline" size={12} color="#1F1F1F" />
          <Text className="text-[#1F1F1F] text-[11px] font-bold ml-1">
            {restaurant.deliveryTime}
          </Text>
        </View>
      </View>

      {/* Card Content */}
      <View className="p-3.5">
        {/* Title & Featured Indicator */}
        <View className="flex-row items-center justify-between">
          <Text
            className="text-[#1F1F1F] text-base font-extrabold flex-1 mr-2"
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
        </View>

        {/* Rating & Meta Row */}
        <View className="flex-row items-center flex-wrap mt-1.5">
          {/* Rating */}
          <View className="flex-row items-center mr-2">
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text className="text-[#1F1F1F] text-xs font-bold ml-1">
              {restaurant.rating}
            </Text>
            <Text className="text-[#707070] text-xs ml-0.5">
              ({restaurant.reviews})
            </Text>
          </View>

          <Text className="text-[#707070] text-xs mr-2">•</Text>

          {/* Delivery Time */}
          <Text className="text-[#707070] text-xs mr-2 font-medium">
            {restaurant.deliveryTime}
          </Text>

          {/* Free Delivery Badge */}
          {restaurant.hasFreeDelivery && (
            <View className="bg-pink-100 px-2 py-0.5 rounded-full">
              <Text className="text-[#D70F64] text-[11px] font-bold">
                Free Delivery
              </Text>
            </View>
          )}
        </View>

        {/* Tags / Cuisines */}
        <View className="mt-2 pt-2 border-t border-[#F7F7F7]">
          <Text className="text-[#707070] text-xs font-medium" numberOfLines={1}>
            {restaurant.tags}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
