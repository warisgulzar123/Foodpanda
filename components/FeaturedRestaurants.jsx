import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import RestaurantCard from "./RestaurantCard";

const FEATURED_RESTAURANTS = [
  // Burgers
  {
    id: "kfc-clifton",
    name: "KFC - Clifton Marine Drive",
    image:
      "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=800&auto=format&fit=crop&q=80",
    discount: "50% OFF",
    rating: "4.7",
    reviews: "2.4k+ reviews",
    deliveryTime: "20-25 min",
    hasFreeDelivery: true,
    tags: "Burgers • Fried Chicken • Fast Food",
    isFavorite: false,
  },
  {
    id: "mcdonalds-seaview",
    name: "McDonald's - Sea View",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    discount: "40% OFF",
    rating: "4.8",
    reviews: "3.1k+ reviews",
    deliveryTime: "15-20 min",
    hasFreeDelivery: true,
    tags: "Burgers • Fast Food • Fries",
    isFavorite: true,
  },
  // Pizza
  {
    id: "broadway-pizza",
    name: "Broadway Pizza - DHA Phase 5",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
    discount: "Buy 1 Get 1 Free",
    rating: "4.6",
    reviews: "1.9k+ reviews",
    deliveryTime: "30-40 min",
    hasFreeDelivery: true,
    tags: "Pizza • Calzones • Italian",
    isFavorite: false,
  },
  // Biryani
  {
    id: "student-biryani",
    name: "Student Biryani - Clifton",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
    discount: "20% OFF",
    rating: "4.7",
    reviews: "3.5k+ reviews",
    deliveryTime: "25-30 min",
    hasFreeDelivery: true,
    tags: "Biryani • Pakistani • Pulao",
    isFavorite: false,
  },
  // Pakistani & BBQ
  {
    id: "bbq-tonight",
    name: "BBQ Tonight - Boat Basin",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    discount: "Free Dessert",
    rating: "4.9",
    reviews: "5.8k+ reviews",
    deliveryTime: "30-45 min",
    hasFreeDelivery: false,
    tags: "Pakistani • BBQ • Karahi",
    isFavorite: false,
  },
  // Chinese
  {
    id: "ginsoy-extreme",
    name: "Ginsoy Extreme Chinese - Clifton",
    image:
      "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&auto=format&fit=crop&q=80",
    discount: "15% OFF",
    rating: "4.7",
    reviews: "2.1k+ reviews",
    deliveryTime: "25-35 min",
    hasFreeDelivery: true,
    tags: "Chinese • Noodles • Soups",
    isFavorite: false,
  },
  // Desserts
  {
    id: "dunkin-donuts",
    name: "Dunkin' Donuts - Clifton Block 4",
    image:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
    discount: "30% OFF",
    rating: "4.7",
    reviews: "1.7k+ reviews",
    deliveryTime: "15-25 min",
    hasFreeDelivery: true,
    tags: "Desserts • Bakery • Coffee",
    isFavorite: false,
  },
];

export default function FeaturedRestaurants({
  restaurants = FEATURED_RESTAURANTS,
  selectedCategory = "All 🍔",
  onResetCategory,
  onPressSeeAll,
  onPressRestaurant,
}) {
  const isFiltered = selectedCategory && selectedCategory !== "All 🍔" && selectedCategory !== "All";

  return (
    <View className="px-4 mt-6 mb-8">
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="text-[#1F1F1F] text-lg font-extrabold tracking-tight">
            {isFiltered ? `${selectedCategory} Spots` : "Top Restaurant Deals"}
          </Text>
          <Text className="text-[#707070] text-xs font-medium">
            {isFiltered
              ? `${restaurants.length} place${restaurants.length === 1 ? "" : "s"} ready to deliver`
              : "Handpicked popular spots near you"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onPressSeeAll}
          activeOpacity={0.7}
          className="bg-[#FFF0F5] px-3 py-1.5 rounded-full"
        >
          <Text className="text-[#D70F64] text-xs font-bold">See All</Text>
        </TouchableOpacity>
      </View>

      {/* Empty Filter State */}
      {restaurants.length === 0 ? (
        <View className="bg-white rounded-3xl p-6 items-center justify-center border border-[#E2E8F0] my-2">
          <Text className="text-3xl mb-2">🍽️</Text>
          <Text className="text-[#1F1F1F] text-sm font-bold text-center mb-1">
            No {selectedCategory} spots found
          </Text>
          <Text className="text-[#707070] text-xs text-center mb-4">
            Try choosing a different category to see delicious options.
          </Text>
          {onResetCategory && (
            <TouchableOpacity
              onPress={onResetCategory}
              activeOpacity={0.8}
              className="bg-[#D70F64] px-4 py-2 rounded-full"
            >
              <Text className="text-white text-xs font-bold">
                View All Categories 🍔
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Vertical Restaurant Flow */
        restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onPress={onPressRestaurant}
          />
        ))
      )}
    </View>
  );
}
