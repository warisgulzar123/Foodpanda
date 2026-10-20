import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

const PROMOS = [
  {
    id: "promo-1",
    badge: "Limited Time Offer",
    title: "50% OFF on First 3 Orders!",
    subtitle: "Use voucher: WELCOME50",
    cta: "Claim Now",
    icon: "flash",
    accentColor: "#B00B50",
  },
  {
    id: "promo-2",
    badge: "Free Delivery",
    title: "Zero Delivery Fees All Weekend",
    subtitle: "On all orders above Rs. 999",
    cta: "Order Now",
    icon: "bicycle",
    accentColor: "#93003F",
  },
  {
    id: "promo-3",
    badge: "pandamart Flash Sale",
    title: "Get Groceries in 15 Minutes!",
    subtitle: "Up to 40% OFF fresh snacks & dairy",
    cta: "Shop Now",
    icon: "cart",
    accentColor: "#D70F64",
  },
];

export default function HeroPromoSlider({ onClaimPress }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    if (index !== activeIndex && index >= 0 && index < PROMOS.length) {
      setActiveIndex(index);
    }
  };

  return (
    <View className="mt-4 px-4">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
      >
        {PROMOS.map((promo, idx) => (
          <View
            key={promo.id}
            style={{ width: CARD_WIDTH }}
            className={`mr-3 rounded-2xl p-5 bg-[#D70F64] shadow-sm relative overflow-hidden justify-between min-h-[148px]`}
          >
            {/* Background Decorative Circles */}
            <View className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <View className="absolute right-12 -bottom-10 w-28 h-28 rounded-full bg-black/10" />

            {/* Top Badge */}
            <View className="flex-row items-center justify-between z-10">
              <View className="bg-white/20 self-start px-2.5 py-1 rounded-full flex-row items-center">
                <Ionicons name={promo.icon} size={13} color="#FFFFFF" />
                <Text className="text-white text-xs font-semibold ml-1">
                  {promo.badge}
                </Text>
              </View>

              <Text className="text-white/60 text-xs font-medium">
                {idx + 1}/{PROMOS.length}
              </Text>
            </View>

            {/* Promo Content */}
            <View className="my-2 z-10">
              <Text className="text-white text-xl font-extrabold tracking-tight">
                {promo.title}
              </Text>
              <Text className="text-white/90 text-xs font-medium mt-1">
                {promo.subtitle}
              </Text>
            </View>

            {/* CTA Button */}
            <View className="flex-row items-center justify-between z-10 pt-1">
              <TouchableOpacity
                onPress={() => onClaimPress && onClaimPress(promo)}
                activeOpacity={0.85}
                className="bg-white px-4 py-2 rounded-full self-start shadow-sm flex-row items-center"
              >
                <Text className="text-[#D70F64] text-xs font-bold mr-1">
                  {promo.cta}
                </Text>
                <Ionicons name="arrow-forward" size={13} color="#D70F64" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View className="flex-row justify-center items-center mt-2.5 space-x-1.5">
        {PROMOS.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full mx-0.5 ${
              activeIndex === i ? "w-5 bg-[#D70F64]" : "w-1.5 bg-[#E2E8F0]"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
