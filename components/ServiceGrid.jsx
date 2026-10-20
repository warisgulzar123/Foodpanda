import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function ServiceGrid({ onSelectService }) {
  return (
    <View className="px-4 mt-5">
      {/* Top 2 Primary Large Cards */}
      <View className="flex-row space-x-3 mb-3">
        {/* Food Delivery - Large Card */}
        <TouchableOpacity
          onPress={() => onSelectService && onSelectService("food_delivery")}
          activeOpacity={0.85}
          className="flex-1 mr-1.5 bg-[#FFF0F5] border border-[#FFE0EB] rounded-2xl p-4 flex-row items-center justify-between overflow-hidden relative"
        >
          {/* Text Content Wrapped to prevent overlap */}
          <View className="flex-1 pr-2">
            <View className="bg-[#D70F64] self-start px-2 py-0.5 rounded-full mb-1.5 shadow-sm">
              <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">
                Up to 50% OFF
              </Text>
            </View>
            <Text className="text-[#1F1F1F] text-base font-extrabold leading-tight">
              Food Delivery
            </Text>
            <Text
              className="text-[#707070] text-xs font-medium mt-0.5"
              numberOfLines={1}
            >
              Fresh food to your door
            </Text>
          </View>

          {/* Right Graphic Container (No Absolute Positioning) */}
          <View className="w-[60px] h-[60px] items-center justify-center">
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
              }}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* pandamart - Large Card */}
        <TouchableOpacity
          onPress={() => onSelectService && onSelectService("pandamart")}
          activeOpacity={0.85}
          className="flex-1 ml-1.5 bg-[#F2F8F5] border border-[#D5EFE3] rounded-2xl p-4 flex-row items-center justify-between overflow-hidden relative"
        >
          {/* Text Content Wrapped to prevent overlap */}
          <View className="flex-1 pr-2">
            <View className="bg-[#00875A] self-start px-2 py-0.5 rounded-full mb-1.5 shadow-sm">
              <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">
                15 Min Delivery
              </Text>
            </View>
            <Text className="text-[#1F1F1F] text-base font-extrabold leading-tight">
              pandamart
            </Text>
            <Text
              className="text-[#707070] text-xs font-medium mt-0.5"
              numberOfLines={1}
            >
              Groceries & essentials
            </Text>
          </View>

          {/* Right Graphic Container (No Absolute Positioning) */}
          <View className="w-[60px] h-[60px] items-center justify-center">
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
              }}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom 2 Smaller Service Cards */}
      <View className="flex-row space-x-3">
        {/* Pick-up - Small Card */}
        <TouchableOpacity
          onPress={() => onSelectService && onSelectService("pickup")}
          activeOpacity={0.85}
          className="flex-1 mr-1.5 bg-[#F7F7F7] border border-[#E2E8F0] rounded-xl p-3 flex-row items-center justify-between"
        >
          <View className="flex-1 pr-2">
            <Text className="text-[#1F1F1F] text-sm font-bold">Pick-up</Text>
            <View className="bg-[#FFF0F5] self-start px-1.5 py-0.5 rounded mt-1">
              <Text className="text-[#D70F64] text-[10px] font-bold">
                Save 15%
              </Text>
            </View>
          </View>
          <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#E2E8F0]">
            <Ionicons name="bag-check-outline" size={20} color="#D70F64" />
          </View>
        </TouchableOpacity>

        {/* Shops - Small Card */}
        <TouchableOpacity
          onPress={() => onSelectService && onSelectService("shops")}
          activeOpacity={0.85}
          className="flex-1 ml-1.5 bg-[#F7F7F7] border border-[#E2E8F0] rounded-xl p-3 flex-row items-center justify-between"
        >
          <View className="flex-1 pr-2">
            <Text className="text-[#1F1F1F] text-sm font-bold">Shops</Text>
            <Text
              className="text-[#707070] text-[11px] font-medium mt-0.5"
              numberOfLines={1}
            >
              Pharmacies & Stores
            </Text>
          </View>
          <View className="w-9 h-9 rounded-full bg-white items-center justify-center border border-[#E2E8F0]">
            <Feather name="shopping-bag" size={18} color="#D70F64" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
