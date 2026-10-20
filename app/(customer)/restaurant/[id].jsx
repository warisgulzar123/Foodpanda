import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useCartStore } from "../../../store/cartStore";
import { resolveImageUrl } from "../../../utils/image";
import { fetchRestaurantByIdApi } from "../../../utils/api";
import { socket } from "../../../utils/socket";

const RESTAURANTS_DATA = {
  "kfc-clifton": {
    id: "kfc-clifton",
    name: "KFC - Clifton Block 4",
    banner:
      "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=1000&auto=format&fit=crop&q=80",
    rating: "4.6",
    reviews: "1.2k+ reviews",
    deliveryTime: "20-25 min",
    minOrder: "Min. order Rs. 299",
    cuisine: "Fast Food • Fried Chicken • Burgers",
    menu: [
      {
        id: "kfc-mighty-zinger",
        name: "Mighty Zinger Burger",
        category: "Popular",
        description:
          "Double crispy zinger fillets, spicy mayo, cheese, fresh lettuce in a toasted sesame bun.",
        price: 890,
        originalPrice: 1050,
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "kfc-hot-wings",
        name: "Hot Wings (6 Pcs)",
        category: "Deals",
        description:
          "6 pieces of signature spicy crunchy chicken wings with garlic mayo dip.",
        price: 590,
        originalPrice: 650,
        image:
          "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "kfc-krunch-combo",
        name: "Krunch Burger Combo",
        category: "Burgers",
        description:
          "1 Krunch burger, regular crunchy fries, and 1 chilled beverage 345ml.",
        price: 550,
        originalPrice: 620,
        image:
          "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "kfc-pepsi",
        name: "Chilled Pepsi 500ml",
        category: "Drinks",
        description: "Refreshing ice-cold carbonated beverage.",
        price: 130,
        originalPrice: 150,
        image:
          "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "mcdonalds-seaview": {
    id: "mcdonalds-seaview",
    name: "McDonald's - Sea View",
    banner:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&auto=format&fit=crop&q=80",
    rating: "4.7",
    reviews: "2.5k+ reviews",
    deliveryTime: "15-20 min",
    minOrder: "Min. order Rs. 350",
    cuisine: "Burgers • Fries • Desserts",
    menu: [
      {
        id: "mcd-big-mac",
        name: "Big Mac Meal",
        category: "Popular",
        description:
          "Two 100% pure beef patties, special sauce, crisp shredded lettuce, pickles.",
        price: 980,
        originalPrice: 1100,
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "mcd-spicy-mccrispy",
        name: "Spicy McCrispy",
        category: "Burgers",
        description:
          "Southern-style fried chicken fillet with spicy pepper sauce.",
        price: 790,
        originalPrice: 890,
        image:
          "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "mcd-mcflurry",
        name: "Oreo McFlurry",
        category: "Desserts",
        description:
          "Creamy soft serve swirled with crunchy crushed Oreo pieces.",
        price: 390,
        originalPrice: 420,
        image:
          "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "broadway-pizza": {
    id: "broadway-pizza",
    name: "Broadway Pizza - DHA Phase 5",
    banner: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80",
    rating: "4.6",
    reviews: "1.9k+ reviews",
    deliveryTime: "30-40 min",
    minOrder: "Min. order Rs. 499",
    cuisine: "Pizza • Calzones • Italian • Fast Food",
    menu: [
      {
        id: "bw-wicked",
        name: "Wicked Blend Pizza (Large 14\")",
        category: "Pizza",
        description: "Tikka chunks, sausages, pepperoni, mushrooms, olives with gooey mozzarella.",
        price: 1590,
        originalPrice: 1850,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "bw-fajita",
        name: "Dancing Fajita Pizza (Medium 10\")",
        category: "Pizza",
        description: "Spicy chicken fajita, sweet bell peppers, onions, and jalapeno slice toppings.",
        price: 1090,
        originalPrice: 1250,
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "bw-garlic-bread",
        name: "Cheesy Garlic Bread Sticks",
        category: "Sides",
        description: "Baked bread sticks infused with garlic butter and melted cheddar dip.",
        price: 490,
        originalPrice: 550,
        image: "https://images.unsplash.com/photo-1619895092538-128341789043?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "bw-lava-cake",
        name: "Molten Lava Chocolate Cake",
        category: "Desserts",
        description: "Warm chocolate sponge cake filled with oozing hot Belgian dark chocolate.",
        price: 480,
        originalPrice: 550,
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "student-biryani": {
    id: "student-biryani",
    name: "Student Biryani - Clifton",
    banner: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80",
    rating: "4.7",
    reviews: "3.5k+ reviews",
    deliveryTime: "25-30 min",
    minOrder: "Min. order Rs. 250",
    cuisine: "Biryani • Pakistani • Pulao • Traditional",
    menu: [
      {
        id: "sb-chicken-biryani",
        name: "Special Chicken Biryani (Double)",
        category: "Biryani",
        description: "Authentic Karachi basmati rice layered with juicy chicken, golden potatoes & aromatics.",
        price: 490,
        originalPrice: 550,
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "sb-beef-pulao",
        name: "Special Beef Yakhni Pulao",
        category: "Biryani",
        description: "Tender beef chunks slow-cooked in rich bone broth yakhni with fragrant sela rice.",
        price: 590,
        originalPrice: 650,
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "sb-shami-kabab",
        name: "Crispy Shami Kabab (2 Pcs)",
        category: "Sides",
        description: "Traditional minced beef & lentil kabab fried in egg coating.",
        price: 180,
        originalPrice: 220,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "sb-kheer",
        name: "Shahi Kheer Cup",
        category: "Desserts",
        description: "Traditional slow-simmered rice pudding enriched with cardamom, pistachios and almonds.",
        price: 190,
        originalPrice: 220,
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "bbq-tonight": {
    id: "bbq-tonight",
    name: "BBQ Tonight - Boat Basin",
    banner: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=80",
    rating: "4.9",
    reviews: "5.8k+ reviews",
    deliveryTime: "30-45 min",
    minOrder: "Min. order Rs. 600",
    cuisine: "Pakistani • BBQ • Traditional • Karahi",
    menu: [
      {
        id: "bt-reshmi-kabab",
        name: "Chicken Reshmi Kabab (4 Pcs)",
        category: "BBQ",
        description: "Silky, melt-in-mouth chicken mince skewers char-grilled on live coal embers.",
        price: 850,
        originalPrice: 950,
        image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "bt-chicken-handi",
        name: "Boneless Chicken Handi (Full)",
        category: "Karahi",
        description: "Tender chicken cooked in clay pot with creamy butter gravy, green chilies and ginger.",
        price: 1690,
        originalPrice: 1890,
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "bt-garlic-naan",
        name: "Garlic Butter Naan",
        category: "Sides",
        description: "Fresh tandoori flatbread brushed with garlic cloves and melted desi butter.",
        price: 120,
        originalPrice: 140,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "ginsoy-extreme": {
    id: "ginsoy-extreme",
    name: "Ginsoy Extreme Chinese - Clifton",
    banner: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&auto=format&fit=crop&q=80",
    rating: "4.7",
    reviews: "2.1k+ reviews",
    deliveryTime: "25-35 min",
    minOrder: "Min. order Rs. 450",
    cuisine: "Chinese • Noodles • Asian • Soups",
    menu: [
      {
        id: "gs-manchurian",
        name: "Chicken Manchurian with Egg Rice",
        category: "Chinese",
        description: "Classic sweet and spicy chicken cubes tossed in tomato chili sauce with egg rice.",
        price: 990,
        originalPrice: 1150,
        image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "gs-chowmein",
        name: "Ginsoy Special Chicken Chowmein",
        category: "Chinese",
        description: "Wok-tossed egg noodles with shredded chicken, crunchy carrots, and cabbage.",
        price: 850,
        originalPrice: 950,
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "gs-soup",
        name: "Hot & Sour Soup (Bowl)",
        category: "Soups",
        description: "Thick chicken broth with egg ribbons, wood ear mushrooms, and vinegar kick.",
        price: 490,
        originalPrice: 550,
        image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "dunkin-donuts": {
    id: "dunkin-donuts",
    name: "Dunkin' Donuts - Clifton Block 4",
    banner: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1000&auto=format&fit=crop&q=80",
    rating: "4.7",
    reviews: "1.7k+ reviews",
    deliveryTime: "15-25 min",
    minOrder: "Min. order Rs. 250",
    cuisine: "Desserts • Bakery • Coffee • Donuts",
    menu: [
      {
        id: "dd-box6",
        name: "Assorted Donuts Box (6 Pcs)",
        category: "Donuts",
        description: "Mix of Boston Kreme, Chocolate Frosted with Sprinkles, Glazed, and Strawberry Ring.",
        price: 890,
        originalPrice: 1050,
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "dd-boston-kreme",
        name: "Boston Kreme Donut (Single)",
        category: "Donuts",
        description: "Fluffy yeast shell filled with vanilla custard cream and iced in dark chocolate glaze.",
        price: 180,
        originalPrice: 200,
        image: "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "dd-iced-latte",
        name: "Iced Caramel Macchiato (Large)",
        category: "Beverages",
        description: "Freshly brewed espresso poured over chilled whole milk with sweet vanilla and caramel drizzle.",
        price: 520,
        originalPrice: 580,
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
  "baskin-robbins": {
    id: "baskin-robbins",
    name: "Baskin Robbins - Ocean Mall",
    banner: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1000&auto=format&fit=crop&q=80",
    rating: "4.8",
    reviews: "2.3k+ reviews",
    deliveryTime: "15-20 min",
    minOrder: "Min. order Rs. 300",
    cuisine: "Desserts • Ice Cream • Waffles • Shakes",
    menu: [
      {
        id: "br-double-scoop",
        name: "Pralines 'n Cream (Double Scoop)",
        category: "Ice Cream",
        description: "Vanilla ice cream with caramelized pecan pralines and gooey caramel ribbon.",
        price: 690,
        originalPrice: 780,
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80",
      },
      {
        id: "br-sundae",
        name: "Jamoca Almond Fudge Sundae",
        category: "Sundaes",
        description: "Coffee ice cream with roasted almonds, chocolate fudge drizzle, and whipped cream.",
        price: 850,
        originalPrice: 950,
        image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&auto=format&fit=crop&q=80",
      },
    ],
  },
};

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [dynamicRestaurant, setDynamicRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cart Store bindings
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartRestaurant = useCartStore((state) => state.restaurant);
  const cartItemsCount = useCartStore((state) => state.getItemCount());
  const cartSubtotal = useCartStore((state) => state.getSubtotal());

  useEffect(() => {
    let isMounted = true;

    const checkRestaurant = async () => {
      try {
        const res = await fetchRestaurantByIdApi(id);
        if (!isMounted) return;

        if (
          res?.isRejected ||
          (res?.success === false && res?.message?.toLowerCase().includes("suspended"))
        ) {
          setIsUnavailable(true);
          if (cartRestaurant?.id === id) clearCart();
          return;
        }

        if (res?.restaurant) {
          if (
            res.restaurant.approvalStatus === "Rejected" ||
            res.restaurant.status === "Suspended"
          ) {
            setIsUnavailable(true);
            if (cartRestaurant?.id === id) clearCart();
            return;
          }

          setDynamicRestaurant({
            id: res.restaurant._id || res.restaurant.id,
            name: res.restaurant.name,
            banner: res.restaurant.banner || res.restaurant.image,
            rating: String(res.restaurant.rating || 4.5),
            reviews: res.restaurant.reviews || "500+ reviews",
            deliveryTime: res.restaurant.deliveryTime || "20-30 min",
            minOrder: `Min. order Rs. ${res.restaurant.minOrder || 299}`,
            cuisine: res.restaurant.cuisine || "Fast Food • Karachi",
            menu: (res.restaurant.products || []).map((p) => ({
              id: p._id || p.id,
              name: p.name,
              category: p.category || "Popular",
              description: p.description || "",
              price: p.price,
              originalPrice: p.originalPrice,
              image: p.image,
            })),
          });
        } else if (!RESTAURANTS_DATA[id]) {
          setIsUnavailable(true);
        }
      } catch (e) {
        if (!RESTAURANTS_DATA[id]) {
          setIsUnavailable(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkRestaurant();

    // Real-time socket listener for live rejection / removal
    const handleRemoved = (payload) => {
      const targetId = payload?.restaurantId || payload?.id;
      if (targetId === id || String(targetId) === String(id)) {
        setIsUnavailable(true);
        if (cartRestaurant?.id === id) clearCart();
      }
    };

    const handleStatusUpdated = (payload) => {
      const targetId = payload?.restaurantId || payload?.id;
      if (
        (targetId === id || String(targetId) === String(id)) &&
        (payload?.approvalStatus === "Rejected" || payload?.status === "Suspended")
      ) {
        setIsUnavailable(true);
        if (cartRestaurant?.id === id) clearCart();
      }
    };

    socket.on("restaurant_removed", handleRemoved);
    socket.on("restaurant_status_updated", handleStatusUpdated);

    return () => {
      isMounted = false;
      socket.off("restaurant_removed", handleRemoved);
      socket.off("restaurant_status_updated", handleStatusUpdated);
    };
  }, [id, cartRestaurant]);

  // Restaurant details lookup
  const restaurant = useMemo(() => {
    return dynamicRestaurant || RESTAURANTS_DATA[id] || RESTAURANTS_DATA["kfc-clifton"];
  }, [dynamicRestaurant, id]);

  // Dynamically extract categories from the restaurant's menu
  const availableCategories = useMemo(() => {
    const menuList = restaurant?.menu || [];
    const catSet = new Set(["Popular"]);
    menuList.forEach((item) => {
      if (item.category && item.category.trim()) {
        catSet.add(item.category.trim());
      }
    });
    return Array.from(catSet);
  }, [restaurant]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${restaurant.name} on FoodPanda! Deliver in ${restaurant.deliveryTime}.`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleAddToCart = (item) => {
    if (isUnavailable) return;
    addItem(item, {
      id: restaurant.id,
      name: restaurant.name,
      deliveryTime: restaurant.deliveryTime,
    });
  };

  const displayedMenu = useMemo(() => {
    const menuList = restaurant?.menu || [];
    if (selectedCategory === "Popular") return menuList;
    return menuList.filter((i) => i.category === selectedCategory);
  }, [selectedCategory, restaurant]);

  // If rejected or delisted, completely block access and display official unavailable screen
  if (isUnavailable) {
    return (
      <View className="flex-1 bg-white">
        <SafeAreaView edges={["top"]} className="flex-1 justify-center items-center px-6">
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center mb-4">
            <Ionicons name="storefront-outline" size={38} color="#D70F64" />
          </View>
          <Text className="text-[#1F1F1F] text-xl font-black text-center mb-2">
            Restaurant Unavailable
          </Text>
          <Text className="text-[#707070] text-sm text-center leading-5 mb-8 max-w-[280px]">
            This restaurant is currently closed, rejected, or no longer available on Foodpanda.
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(customer)/(tabs)");
              }
            }}
            activeOpacity={0.85}
            className="bg-[#D70F64] px-8 py-3.5 rounded-2xl shadow-sm"
          >
            <Text className="text-white text-sm font-black">
              Explore Available Restaurants
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Main ScrollView wrapping the entire restaurant detail content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Cover Banner sitting flush at the very top (no extra top safe area padding) */}
        <View className="relative w-full h-64 bg-black">
          <Image
            source={{ uri: resolveImageUrl(restaurant.banner, "banner") }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Semi-transparent dark overlay (bg-black/30) */}
          <View className="absolute inset-0 bg-black/30" />

          {/* Top Action Bar (Back, Favorite, Share) positioned with SafeAreaView edges */}
          <SafeAreaView
            edges={["top"]}
            className="absolute top-0 left-0 right-0 px-4 pt-2"
          >
            <View className="flex-row items-center justify-between">
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full bg-black/40 items-center justify-center backdrop-blur-md"
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Right Action Buttons */}
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  onPress={() => setIsFavorite(!isFavorite)}
                  activeOpacity={0.8}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center mr-2"
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={22}
                    color={isFavorite ? "#D70F64" : "#FFFFFF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  activeOpacity={0.8}
                  className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
                >
                  <Feather name="share-2" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Restaurant Info Card (Overlapping header banner) */}
        <View className="mx-4 -mt-8 bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-md">
          <Text className="text-[#1F1F1F] text-xl font-black">
            {restaurant.name}
          </Text>
          <Text className="text-[#707070] text-xs font-medium mt-1">
            {restaurant.cuisine}
          </Text>

          {/* Rating, Delivery Time & Minimum Order */}
          <View className="flex-row items-center mt-3 pt-3 border-t border-[#F7F7F7] flex-wrap">
            <View className="flex-row items-center mr-3">
              <Ionicons name="star" size={15} color="#FFB800" />
              <Text className="text-[#1F1F1F] text-xs font-black ml-1">
                {restaurant.rating}
              </Text>
              <Text className="text-[#707070] text-xs ml-0.5">
                ({restaurant.reviews})
              </Text>
            </View>

            <Text className="text-[#707070] text-xs mr-3">•</Text>

            <View className="flex-row items-center mr-3">
              <Ionicons name="time-outline" size={14} color="#D70F64" />
              <Text className="text-[#1F1F1F] text-xs font-bold ml-1">
                {restaurant.deliveryTime}
              </Text>
            </View>

            <Text className="text-[#707070] text-xs mr-3">•</Text>

            <Text className="text-[#707070] text-xs font-medium">
              {restaurant.minOrder}
            </Text>
          </View>
        </View>

        {/* Menu Sticky Categories Header */}
        <View className="mt-4 bg-white border-y border-[#E2E8F0] py-2.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.75}
                  className={`mr-2.5 px-4 py-2 rounded-full border ${
                    isSelected
                      ? "bg-[#D70F64] border-[#D70F64]"
                      : "bg-[#F7F7F7] border-[#E2E8F0]"
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected
                        ? "text-white font-bold"
                        : "text-[#1F1F1F] font-semibold"
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Food Menu Items */}
        <View className="px-4 mt-4">
          <Text className="text-[#1F1F1F] text-base font-black mb-3">
            {selectedCategory}
          </Text>

          {displayedMenu.map((item) => (
            <View
              key={item.id}
              className="bg-white rounded-2xl p-3.5 mb-3.5 border border-[#E2E8F0] shadow-sm flex-row justify-between"
            >
              {/* Item Details */}
              <View className="flex-1 pr-3 justify-between">
                <View>
                  <Text className="text-[#1F1F1F] text-sm font-extrabold">
                    {item.name}
                  </Text>
                  <Text
                    className="text-[#707070] text-xs font-normal mt-1 leading-relaxed"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </View>

                {/* Price Row */}
                <View className="flex-row items-center mt-3">
                  <Text className="text-[#D70F64] text-sm font-black mr-2">
                    Rs. {item.price}
                  </Text>
                  {item.originalPrice && (
                    <Text className="text-[#9E9E9E] text-xs line-through">
                      Rs. {item.originalPrice}
                    </Text>
                  )}
                </View>
              </View>

              {/* Item Image with '+' Add Button */}
              <View className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F7F7F7]">
                <Image
                  source={{ uri: resolveImageUrl(item.image, "restaurant") }}
                  className="w-full h-full"
                  resizeMode="cover"
                />

                <TouchableOpacity
                  onPress={() => handleAddToCart(item)}
                  activeOpacity={0.85}
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#D70F64] items-center justify-center shadow-md border-2 border-white"
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* View Cart Floating Bar - OUTSIDE the ScrollView */}
      {cartItemsCount > 0 && (
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/cart")}
          activeOpacity={0.9}
          className="absolute bottom-6 left-4 right-4 bg-[#D70F64] rounded-2xl p-4 flex-row items-center justify-between shadow-xl z-50"
        >
          {/* Left: Badge + Count + Subtotal */}
          <View className="flex-row items-center">
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center mr-2.5">
              <Text className="text-[#D70F64] text-xs font-black">
                {cartItemsCount}
              </Text>
            </View>
            <View>
              <Text className="text-white text-xs font-medium">Subtotal</Text>
              <Text className="text-white text-base font-black">
                Rs. {cartSubtotal}
              </Text>
            </View>
          </View>

          {/* Right: CTA */}
          <View className="flex-row items-center">
            <Text className="text-white text-sm font-black mr-1.5">
              View Cart
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}
