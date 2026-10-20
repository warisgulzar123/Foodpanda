import "../../../global.css";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

// Modular Components
import Header from "../../../components/Header";
import HeroPromoSlider from "../../../components/HeroPromoSlider";
import ServiceGrid from "../../../components/ServiceGrid";
import CuisineCategories from "../../../components/CuisineCategories";
import FeaturedRestaurants from "../../../components/FeaturedRestaurants";
import { useCartStore } from "../../../store/cartStore";
import { useLocationStore } from "../../../store/locationStore";
import { fetchRestaurantsApi } from "../../../utils/api";
import { socket } from "../../../utils/socket";

export default function FoodHomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All 🍔");
  const [refreshing, setRefreshing] = useState(false);
  const [dynamicRestaurants, setDynamicRestaurants] = useState(undefined);
  const cartCount = useCartStore((state) => state.getItemCount());
  const detectedAddress = useLocationStore((state) => state.address);
  const detectLocation = useLocationStore((state) => state.detectLocation);

  const loadRestaurants = async () => {
    try {
      const data = await fetchRestaurantsApi();
      if (data && data.restaurants && data.restaurants.length > 0) {
        // Strictly filter out any rejected or suspended restaurants
        const approvedOnly = data.restaurants.filter(
          (r) =>
            r.approvalStatus !== "Rejected" &&
            r.status !== "Suspended" &&
            r.status !== "Rejected"
        );

        const formatted = approvedOnly.map((r) => ({
          id: r._id || r.id,
          name: r.name,
          image: r.image,
          discount: r.discount || "20% OFF",
          rating: String(r.rating || 4.5),
          reviews: r.reviews || "500+ reviews",
          deliveryTime: r.deliveryTime || "20-30 min",
          hasFreeDelivery: true,
          tags: r.cuisine || "$$ • Fast Food",
          isFavorite: false,
        }));
        setDynamicRestaurants(formatted);
      }
    } catch (e) {
      // Keep curated defaults
    }
  };

  useEffect(() => {
    loadRestaurants();

    // Real-time listener: Instantly remove rejected or purged restaurant from customer UI
    const handleRestaurantRemoved = (payload) => {
      const targetId = payload?.restaurantId || payload?.id;
      if (!targetId) return;
      setDynamicRestaurants((prev) =>
        prev ? prev.filter((r) => r.id !== targetId && String(r.id) !== String(targetId)) : prev
      );
    };

    const handleStatusUpdated = (payload) => {
      if (payload?.approvalStatus === "Rejected" || payload?.status === "Suspended") {
        handleRestaurantRemoved(payload);
      } else if (payload?.approvalStatus === "Approved") {
        loadRestaurants();
      }
    };

    const handleRestaurantAdded = () => {
      loadRestaurants();
    };

    socket.on("restaurant_removed", handleRestaurantRemoved);
    socket.on("restaurant_status_updated", handleStatusUpdated);
    socket.on("restaurant_added", handleRestaurantAdded);

    return () => {
      socket.off("restaurant_removed", handleRestaurantRemoved);
      socket.off("restaurant_status_updated", handleStatusUpdated);
      socket.off("restaurant_added", handleRestaurantAdded);
    };
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadRestaurants();
    setRefreshing(false);
  }, []);

  // Real-time dynamic category and search filter
  const filteredRestaurants = useMemo(() => {
    const list = dynamicRestaurants || [];
    return list.filter((r) => {
      // 1. Category Matching
      let matchesCategory = true;
      if (selectedCategory && selectedCategory !== "All 🍔" && selectedCategory !== "All") {
        const catClean = selectedCategory
          .replace(/[^\w\s]/gi, "")
          .trim()
          .toLowerCase();

        const cuisineText = (r.tags || r.cuisine || r.name || "").toLowerCase();

        if (catClean.includes("burger")) {
          matchesCategory =
            cuisineText.includes("burger") ||
            cuisineText.includes("fast food") ||
            cuisineText.includes("fried chicken");
        } else if (catClean.includes("pizza")) {
          matchesCategory =
            cuisineText.includes("pizza") ||
            cuisineText.includes("calzone") ||
            cuisineText.includes("italian");
        } else if (catClean.includes("biryani")) {
          matchesCategory =
            cuisineText.includes("biryani") ||
            cuisineText.includes("pulao");
        } else if (catClean.includes("pakistani")) {
          matchesCategory =
            cuisineText.includes("pakistani") ||
            cuisineText.includes("bbq") ||
            cuisineText.includes("karahi") ||
            cuisineText.includes("handi") ||
            cuisineText.includes("desi");
        } else if (catClean.includes("chinese")) {
          matchesCategory =
            cuisineText.includes("chinese") ||
            cuisineText.includes("asian") ||
            cuisineText.includes("noodle") ||
            cuisineText.includes("wok") ||
            cuisineText.includes("soup");
        } else if (catClean.includes("dessert")) {
          matchesCategory =
            cuisineText.includes("dessert") ||
            cuisineText.includes("donut") ||
            cuisineText.includes("ice cream") ||
            cuisineText.includes("waffle") ||
            cuisineText.includes("bakery") ||
            cuisineText.includes("sweet") ||
            cuisineText.includes("cake") ||
            cuisineText.includes("coffee");
        } else {
          matchesCategory = cuisineText.includes(catClean);
        }
      }

      // 2. Search Query Matching
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase().trim();
        const combined = `${r.name || ""} ${r.tags || ""} ${r.cuisine || ""}`.toLowerCase();
        matchesSearch = combined.includes(queryClean);
      }

      return matchesCategory && matchesSearch;
    });
  }, [dynamicRestaurants, selectedCategory, searchQuery]);

  const handleSelectService = (serviceId) => {
    if (serviceId === "pandamart" || serviceId === "shops") {
      router.push("/(customer)/(tabs)/grocery");
    } else {
      router.push("/(customer)/(tabs)/search");
    }
  };

  const handleClaimPromo = (promo) => {
    router.push("/(customer)/restaurant/kfc-clifton");
  };

  const handleRestaurantPress = (restaurant) => {
    router.push(`/(customer)/restaurant/${restaurant.id}`);
  };

  return (
    <View className="flex-1 bg-[#D70F64]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="light-content" backgroundColor="#D70F64" />

        {/* FoodPanda Brand Header */}
        <Header
          location={detectedAddress || "Home - Clifton, Karachi"}
          cartCount={cartCount}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          onPressLocation={() => detectLocation()}
          onPressFavorites={() => router.push("/(customer)/(tabs)/account")}
          onPressCart={() => router.push("/(customer)/(tabs)/cart")}
          onPressFilter={() => router.push("/(customer)/(tabs)/search")}
        />

        {/* Main Content Area */}
        <ScrollView
          className="flex-1 bg-[#F7F7F7]"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D70F64"
              colors={["#D70F64"]}
            />
          }
        >
          {/* Hero Promo Slider */}
          <HeroPromoSlider onClaimPress={handleClaimPromo} />

          {/* 4 Primary Service Touchpoints */}
          <ServiceGrid onSelectService={handleSelectService} />

          {/* Cuisine Carousel */}
          <CuisineCategories
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Featured Restaurant Deals Filtered in Real Time */}
          <FeaturedRestaurants
            restaurants={dynamicRestaurants === undefined ? undefined : filteredRestaurants}
            selectedCategory={selectedCategory}
            onResetCategory={() => setSelectedCategory("All 🍔")}
            onPressSeeAll={() => router.push("/(customer)/(tabs)/search")}
            onPressRestaurant={handleRestaurantPress}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
