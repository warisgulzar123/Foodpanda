import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { resolveImageUrl } from "../../../utils/image";
import { fetchRestaurantsApi } from "../../../utils/api";
import { socket } from "../../../utils/socket";

const RECENT_SEARCHES = ["Biryani", "KFC", "Pizza Deals", "Burgers"];

const CUISINES = [
  {
    id: "c1",
    name: "Burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80",
    deals: "25+ places",
  },
  {
    id: "c2",
    name: "Pizza",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80",
    deals: "18+ places",
  },
  {
    id: "c3",
    name: "Biryani",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80",
    deals: "30+ places",
  },
  {
    id: "c4",
    name: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80",
    deals: "12+ places",
  },
  {
    id: "c5",
    name: "Chinese",
    image:
      "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&auto=format&fit=crop&q=80",
    deals: "15+ places",
  },
  {
    id: "c6",
    name: "Pakistani",
    image:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80",
    deals: "40+ places",
  },
];

const ALL_RESTAURANTS = [
  {
    id: "kfc-clifton",
    name: "KFC - Clifton Block 4",
    image:
      "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600&auto=format&fit=crop&q=80",
    rating: "4.6",
    reviews: "1.2k+",
    deliveryTime: "20-25 min",
    cuisine: "Fast Food • Fried Chicken • Burgers",
    deal: "50% OFF",
    deliveryFee: "Free Delivery",
  },
  {
    id: "mcdonalds-seaview",
    name: "McDonald's - Sea View",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
    rating: "4.7",
    reviews: "2.5k+",
    deliveryTime: "15-20 min",
    cuisine: "Burgers • Fries • Desserts",
    deal: "40% OFF",
    deliveryFee: "Free Delivery",
  },
  {
    id: "student-biryani",
    name: "Student Biryani - Clifton",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    rating: "4.5",
    reviews: "950+",
    deliveryTime: "25-35 min",
    cuisine: "Biryani • Pakistani • Pulao",
    deal: "20% OFF",
    deliveryFee: "Rs. 49 Delivery",
  },
  {
    id: "optp-badar",
    name: "OPTP - Badar Commercial",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    rating: "4.4",
    reviews: "600+",
    deliveryTime: "20-30 min",
    cuisine: "Burgers • Loaded Fries • Wings",
    deal: "30% OFF",
    deliveryFee: "Rs. 69 Delivery",
  },
  {
    id: "broadway-pizza",
    name: "Broadway Pizza - DHA Phase 5",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
    rating: "4.3",
    reviews: "820+",
    deliveryTime: "30-40 min",
    cuisine: "Pizza Deals • Calzones • Pasta",
    deal: "Buy 1 Get 1 Free",
    deliveryFee: "Free Delivery",
  },
];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(RECENT_SEARCHES);
  const [restaurantsList, setRestaurantsList] = useState(ALL_RESTAURANTS);

  useEffect(() => {
    // Fetch live approved restaurants from backend
    const loadLiveRestaurants = async () => {
      try {
        const data = await fetchRestaurantsApi();
        if (data?.restaurants && data.restaurants.length > 0) {
          const approvedOnly = data.restaurants
            .filter(
              (r) =>
                r.approvalStatus !== "Rejected" &&
                r.status !== "Suspended" &&
                r.status !== "Rejected"
            )
            .map((r) => ({
              id: r._id || r.id,
              name: r.name,
              image: r.image,
              rating: String(r.rating || 4.5),
              reviews: r.reviews || "500+",
              deliveryTime: r.deliveryTime || "20-30 min",
              cuisine: r.cuisine || "Fast Food • Karachi",
              deal: r.discount || "Special Deal",
              deliveryFee: "Free Delivery",
            }));
          if (approvedOnly.length > 0) {
            setRestaurantsList(approvedOnly);
          }
        }
      } catch (err) {
        // Fallback to ALL_RESTAURANTS
      }
    };

    loadLiveRestaurants();

    // Real-time listener: remove rejected restaurant from search immediately
    const handleRestaurantRemoved = (payload) => {
      const targetId = payload?.restaurantId || payload?.id;
      if (!targetId) return;
      setRestaurantsList((prev) =>
        prev.filter((r) => r.id !== targetId && String(r.id) !== String(targetId))
      );
    };

    const handleStatusUpdated = (payload) => {
      if (payload?.approvalStatus === "Rejected" || payload?.status === "Suspended") {
        handleRestaurantRemoved(payload);
      }
    };

    socket.on("restaurant_removed", handleRestaurantRemoved);
    socket.on("restaurant_status_updated", handleStatusUpdated);

    return () => {
      socket.off("restaurant_removed", handleRestaurantRemoved);
      socket.off("restaurant_status_updated", handleStatusUpdated);
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    if (!query.trim()) return restaurantsList;
    const clean = query.toLowerCase().trim();
    return restaurantsList.filter(
      (r) =>
        r.name.toLowerCase().includes(clean) ||
        r.cuisine.toLowerCase().includes(clean) ||
        (r.deal && r.deal.toLowerCase().includes(clean))
    );
  }, [query, restaurantsList]);

  const handleSelectRecent = (term) => {
    setQuery(term);
  };

  const handleSelectCuisine = (cuisineName) => {
    setQuery(cuisineName);
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Full-width Search Bar Header */}
      <View className="px-4 pt-2 pb-3 border-b border-[#E2E8F0] bg-white">
        <View className="flex-row items-center bg-[#F7F7F7] rounded-full px-3.5 py-2.5">
          {/* Back Navigation Button */}
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/(customer)/(tabs)");
              }
            }}
            className="mr-2"
          >
            <Ionicons name="arrow-back" size={22} color="#1F1F1F" />
          </TouchableOpacity>

          {/* Auto-focused input */}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for restaurants, dishes, groceries..."
            placeholderTextColor="#9E9E9E"
            autoFocus
            className="flex-1 text-[#1F1F1F] text-sm py-0 font-medium"
            returnKeyType="search"
          />

          {/* Clear Button */}
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} className="pl-1">
              <Ionicons name="close-circle" size={18} color="#707070" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#F7F7F7]"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Recent Searches (Interactive Chips) */}
        {!query && (
          <View className="px-4 pt-4 pb-2 bg-white mb-2">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-[#1F1F1F] text-sm font-bold">
                Recent Searches
              </Text>
              <TouchableOpacity onPress={() => setRecents([])}>
                <Text className="text-[#707070] text-xs">Clear all</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap">
              {recents.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectRecent(item)}
                  activeOpacity={0.7}
                  className="mr-2 mb-2 bg-[#F7F7F7] border border-[#E2E8F0] px-3.5 py-1.5 rounded-full flex-row items-center"
                >
                  <Ionicons name="time-outline" size={13} color="#707070" />
                  <Text className="text-[#1F1F1F] text-xs font-semibold ml-1.5">
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Cuisine Grid for Quick Filtering */}
        {!query && (
          <View className="px-4 py-3 bg-white mb-2">
            <Text className="text-[#1F1F1F] text-sm font-bold mb-3">
              Popular Cuisines
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {CUISINES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => handleSelectCuisine(c.name)}
                  activeOpacity={0.8}
                  className="w-[31%] mb-3 rounded-xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm"
                >
                  <View className="h-20 w-full relative">
                    <Image
                      source={{ uri: c.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/25" />
                    <View className="absolute bottom-1.5 left-2">
                      <Text className="text-white text-xs font-black">
                        {c.name}
                      </Text>
                      <Text className="text-white/80 text-[10px] font-medium">
                        {c.deals}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Trending / Filtered Restaurants */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1F1F1F] text-base font-extrabold">
              {query ? `Results for "${query}"` : "Trending Restaurants"}
            </Text>
            <Text className="text-[#707070] text-xs font-medium">
              {filteredRestaurants.length} spots
            </Text>
          </View>

          {filteredRestaurants.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-4xl mb-2">🔍</Text>
              <Text className="text-[#1F1F1F] text-base font-bold">
                No matching results
              </Text>
              <Text className="text-[#707070] text-xs mt-1 text-center px-8">
                Try searching for something else like "Burgers", "KFC" or "Pizza"
              </Text>
            </View>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                onPress={() => router.push(`/(customer)/restaurant/${restaurant.id}`)}
                activeOpacity={0.85}
                className="bg-white rounded-2xl p-3 mb-3 border border-[#E2E8F0] shadow-sm flex-row items-center"
              >
                {/* Thumbnail */}
                <View className="w-20 h-20 rounded-xl overflow-hidden bg-[#F7F7F7] mr-3 relative">
                  <Image
                    source={{ uri: resolveImageUrl(restaurant.image, "restaurant") }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute top-1 left-1 bg-[#D70F64] px-1 py-0.5 rounded">
                    <Text className="text-white text-[9px] font-extrabold">
                      {restaurant.deal}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View className="flex-1 justify-between">
                  <Text
                    className="text-[#1F1F1F] text-sm font-extrabold"
                    numberOfLines={1}
                  >
                    {restaurant.name}
                  </Text>
                  <Text
                    className="text-[#707070] text-[11px] font-medium mt-0.5"
                    numberOfLines={1}
                  >
                    {restaurant.cuisine}
                  </Text>

                  {/* Rating & Delivery */}
                  <View className="flex-row items-center mt-1.5 flex-wrap">
                    <View className="flex-row items-center mr-2">
                      <Ionicons name="star" size={13} color="#FFB800" />
                      <Text className="text-[#1F1F1F] text-xs font-bold ml-1">
                        {restaurant.rating}
                      </Text>
                    </View>
                    <Text className="text-[#707070] text-xs mr-2">•</Text>
                    <Text className="text-[#707070] text-xs font-medium mr-2">
                      {restaurant.deliveryTime}
                    </Text>
                    <View className="bg-pink-50 px-1.5 py-0.5 rounded">
                      <Text className="text-[#D70F64] text-[10px] font-bold">
                        {restaurant.deliveryFee}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);
}
