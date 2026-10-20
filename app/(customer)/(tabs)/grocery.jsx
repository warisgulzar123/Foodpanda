import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCartStore } from "../../../store/cartStore";

const GROCERY_CATEGORIES = [
  { id: "1", name: "Fresh Produce", emoji: "🍎", bg: "bg-red-50", border: "border-red-100" },
  { id: "2", name: "Snacks & Munchies", emoji: "🍿", bg: "bg-amber-50", border: "border-amber-100" },
  { id: "3", name: "Drinks & Beverages", emoji: "🥤", bg: "bg-blue-50", border: "border-blue-100" },
  { id: "4", name: "Dairy & Bakery", emoji: "🥛", bg: "bg-emerald-50", border: "border-emerald-100" },
  { id: "5", name: "Meat & Seafood", emoji: "🥩", bg: "bg-rose-50", border: "border-rose-100" },
  { id: "6", name: "Personal Care", emoji: "🧼", bg: "bg-purple-50", border: "border-purple-100" },
  { id: "7", name: "Instant Noodles", emoji: "🍜", bg: "bg-orange-50", border: "border-orange-100" },
  { id: "8", name: "Household Essentials", emoji: "🧽", bg: "bg-teal-50", border: "border-teal-100" },
];

const FLASH_DEALS = [
  {
    id: "groc-1",
    name: "Farm Fresh Eggs (12 Pcs)",
    price: 280,
    originalPrice: 320,
    discount: "12% OFF",
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80",
    unit: "1 Dozen",
    restaurantName: "pandamart - Clifton",
  },
  {
    id: "groc-2",
    name: "Pure Fresh Milk 1L",
    price: 260,
    originalPrice: 290,
    discount: "10% OFF",
    image:
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80",
    unit: "1000 ml",
    restaurantName: "pandamart - Clifton",
  },
  {
    id: "groc-3",
    name: "Crunchy Masala Potato Crisps",
    price: 110,
    originalPrice: 140,
    discount: "21% OFF",
    image:
      "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80",
    unit: "115g Pack",
    restaurantName: "pandamart - Clifton",
  },
  {
    id: "groc-4",
    name: "Chilled Sparkling Soda 1.5L",
    price: 170,
    originalPrice: 200,
    discount: "15% OFF",
    image:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80",
    unit: "1.5 Liters",
    restaurantName: "pandamart - Clifton",
  },
  {
    id: "groc-5",
    name: "Crisp Red Apples (1kg)",
    price: 340,
    originalPrice: 400,
    discount: "15% OFF",
    image:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80",
    unit: "Approx 1kg",
    restaurantName: "pandamart - Clifton",
  },
];

export default function GroceryScreen() {
  const [search, setSearch] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const cartCount = useCartStore((state) => state.getItemCount());
  const [addedToast, setAddedToast] = useState("");

  const handleAddToCart = (product) => {
    addItem(product, {
      id: "pandamart-clifton",
      name: "pandamart - Clifton",
      deliveryTime: "15 min",
    });
    setAddedToast(`Added ${product.name}!`);
    setTimeout(() => setAddedToast(""), 2000);
  };

  return (
    <View className="flex-1 bg-[#D70F64]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="light-content" backgroundColor="#D70F64" />

      {/* Grocery Header */}
      <View className="bg-[#D70F64] px-4 pt-2 pb-4 shadow-md">
        {/* Top Row: Title, Badge & Cart */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-white text-2xl font-black tracking-tight">
              pandamart
            </Text>
            {/* 15 Mins Badge */}
            <View className="ml-2.5 bg-white/20 px-2.5 py-1 rounded-full flex-row items-center">
              <Ionicons name="flash" size={13} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold ml-1">
                Delivery in 15 mins
              </Text>
            </View>
          </View>

          {/* Cart Icon */}
          <TouchableOpacity
            onPress={() => router.push("/(customer)/(tabs)/cart")}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center relative"
          >
            <Feather name="shopping-bag" size={20} color="#FFFFFF" />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-white rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border border-[#D70F64]">
                <Text className="text-[#D70F64] text-[10px] font-extrabold">
                  {cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-full px-3.5 py-2.5 shadow-sm">
          <Ionicons name="search" size={20} color="#707070" className="mr-2" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search essentials, dairy, snacks, drinks..."
            placeholderTextColor="#9E9E9E"
            className="flex-1 text-[#1F1F1F] text-sm py-0"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#707070" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Toast Notification */}
      {addedToast ? (
        <View className="bg-emerald-600 px-4 py-2 flex-row items-center justify-center">
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold ml-1.5" numberOfLines={1}>
            {addedToast}
          </Text>
        </View>
      ) : null}

      {/* Main Grocery Content */}
      <ScrollView
        className="flex-1 bg-[#F7F7F7]"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Promo Banner */}
        <View className="mx-4 mt-4 bg-emerald-700 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <View className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10" />
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="bg-white/20 self-start px-2 py-0.5 rounded-full mb-1">
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                  Super Savings
                </Text>
              </View>
              <Text className="text-white text-lg font-black leading-snug">
                Up to 40% OFF on Fresh Groceries & Snacks
              </Text>
              <Text className="text-white/80 text-xs font-medium mt-1">
                Supermarket prices delivered to your doorstep
              </Text>
            </View>
            <Text className="text-5xl">🛍️</Text>
          </View>
        </View>

        {/* Flash Deals Section (Horizontal Scroll) */}
        <View className="mt-6">
          <View className="px-4 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-[#1F1F1F] text-lg font-extrabold tracking-tight">
                ⚡ Flash Deals
              </Text>
              <View className="ml-2 bg-[#FFF0F5] px-2 py-0.5 rounded-full">
                <Text className="text-[#D70F64] text-[10px] font-bold">
                  Ends soon
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push("/(customer)/(tabs)/search")}>
              <Text className="text-[#D70F64] text-xs font-bold">See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {FLASH_DEALS.map((deal) => (
              <View
                key={deal.id}
                className="w-40 mr-3.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden p-2.5 justify-between"
              >
                {/* Image & Discount */}
                <View className="relative w-full h-28 bg-[#F7F7F7] rounded-xl overflow-hidden mb-2">
                  <Image
                    source={{ uri: deal.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute top-1.5 left-1.5 bg-[#D70F64] px-1.5 py-0.5 rounded-md">
                    <Text className="text-white text-[9px] font-extrabold">
                      {deal.discount}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View className="mb-2">
                  <Text className="text-[#707070] text-[10px] font-semibold">
                    {deal.unit}
                  </Text>
                  <Text
                    className="text-[#1F1F1F] text-xs font-bold mt-0.5"
                    numberOfLines={2}
                  >
                    {deal.name}
                  </Text>
                </View>

                {/* Price and Add Button */}
                <View className="flex-row items-center justify-between pt-1 border-t border-[#F7F7F7]">
                  <View>
                    <Text className="text-[#D70F64] text-xs font-extrabold">
                      Rs. {deal.price}
                    </Text>
                    <Text className="text-[#9E9E9E] text-[10px] line-through">
                      Rs. {deal.originalPrice}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAddToCart(deal)}
                    activeOpacity={0.8}
                    className="w-8 h-8 rounded-full bg-[#D70F64] items-center justify-center shadow-sm"
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Category Grid (2x4 Cards) */}
        <View className="px-4 mt-6">
          <View className="mb-3">
            <Text className="text-[#1F1F1F] text-lg font-extrabold tracking-tight">
              Explore Categories
            </Text>
            <Text className="text-[#707070] text-xs font-medium">
              Everything for your daily pantry
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {GROCERY_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.75}
                onPress={() => router.push("/(customer)/(tabs)/search")}
                className={`w-[48%] mb-3 rounded-2xl p-3 border ${cat.bg} ${cat.border} flex-row items-center justify-between shadow-sm`}
              >
                <View className="flex-1 pr-1">
                  <Text className="text-[#1F1F1F] text-xs font-bold leading-tight">
                    {cat.name}
                  </Text>
                </View>
                <Text className="text-3xl">{cat.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);
}
