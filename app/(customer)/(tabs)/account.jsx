import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

export default function AccountScreen() {
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          router.replace("/login");
        },
      },
    ]);
  };

  const MENU_SECTIONS = [
    {
      id: "portal",
      title: "Switch Account Role Portal",
      subtitle: "Switch between Customer, Restaurant, Rider, Admin",
      icon: "account-switch-outline",
      iconType: "material",
      badge: "4 Roles",
      onPress: () => router.push("/login"),
    },
    {
      id: "orders",
      title: "Orders & Reordering",
      subtitle: "Past meals & favorite reorders",
      icon: "package-variant-closed",
      iconType: "material",
      badge: "2 Recent",
      onPress: () => router.push("/(customer)/(tabs)/cart"),
    },
    {
      id: "vouchers",
      title: "Vouchers & Offers",
      subtitle: "3 promo coupons active",
      icon: "ticket-percent-outline",
      iconType: "material",
      badge: "3 New",
      onPress: () => Alert.alert("Vouchers", "You have: WELCOME50, PANDALOVE"),
    },
    {
      id: "addresses",
      title: "Saved Addresses",
      subtitle: "Home, Office & Clifton",
      icon: "map-pin",
      iconType: "feather",
      onPress: () => Alert.alert("Saved Addresses", "Primary: Home - Clifton, Karachi"),
    },
    {
      id: "payments",
      title: "Payment Methods",
      subtitle: "Debit Cards, JazzCash, EasyPaisa",
      icon: "credit-card",
      iconType: "feather",
      onPress: () => Alert.alert("Payment Methods", "Cards & Digital Wallets configured"),
    },
    {
      id: "help",
      title: "Help Center",
      subtitle: "24/7 Live chat & order support",
      icon: "help-circle",
      iconType: "feather",
      onPress: () => Alert.alert("Help Center", "Connecting to FoodPanda Support..."),
    },
    {
      id: "terms",
      title: "Terms & Policies",
      subtitle: "Privacy policy & user agreement",
      icon: "file-text",
      iconType: "feather",
      onPress: () => Alert.alert("Terms & Policies", "FoodPanda v51.0.0"),
    },
  ];

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Title */}
      <View className="bg-white px-4 py-3 border-b border-[#E2E8F0]">
        <Text className="text-[#1F1F1F] text-lg font-black">My Account</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Card */}
        <View className="bg-white mx-4 mt-4 p-4 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <View className="flex-row items-center mb-4">
            {/* User Avatar */}
            <View className="w-16 h-16 rounded-full bg-[#D70F64] items-center justify-center mr-3.5 shadow-sm">
              <Text className="text-white text-2xl font-black">FP</Text>
            </View>

            {/* User Details */}
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-[#1F1F1F] text-lg font-black mr-1.5">
                  Foodie Partner
                </Text>
                <View className="bg-pink-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[#D70F64] text-[10px] font-extrabold uppercase">
                    PRO
                  </Text>
                </View>
              </View>
              <Text className="text-[#707070] text-xs font-medium mt-0.5">
                +92 300 1234567 • foodie@partner.com
              </Text>
            </View>
          </View>

          {/* PandaPay Balance Box */}
          <View className="bg-[#FFF0F5] border border-[#FFE0EB] rounded-2xl p-3.5 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#D70F64] items-center justify-center mr-3">
                <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-[#707070] text-[11px] font-semibold">
                  PandaPay Balance
                </Text>
                <Text className="text-[#D70F64] text-base font-black">
                  Rs. 450
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => Alert.alert("PandaPay Top Up", "Choose amount to reload")}
              activeOpacity={0.8}
              className="bg-[#D70F64] px-4 py-2 rounded-full"
            >
              <Text className="text-white text-xs font-bold">Top up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Options List */}
        <View className="bg-white mx-4 mt-3 rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden p-2">
          {MENU_SECTIONS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              activeOpacity={0.7}
              className={`flex-row items-center justify-between p-3.5 ${
                index !== MENU_SECTIONS.length - 1 ? "border-b border-[#F7F7F7]" : ""
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-2xl bg-[#F7F7F7] border border-[#E2E8F0] items-center justify-center mr-3">
                  {item.iconType === "material" ? (
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={20}
                      color="#D70F64"
                    />
                  ) : (
                    <Feather name={item.icon} size={18} color="#D70F64" />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-[#1F1F1F] text-sm font-bold">
                    {item.title}
                  </Text>
                  <Text className="text-[#707070] text-[11px] font-medium mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                {item.badge && (
                  <View className="bg-[#FFF0F5] px-2 py-0.5 rounded-full mr-2">
                    <Text className="text-[#D70F64] text-[10px] font-bold">
                      {item.badge}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View className="mx-4 mt-4 mb-6">
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm flex-row items-center justify-center"
          >
            <Feather name="log-out" size={18} color="#E11D48" />
            <Text className="text-rose-600 text-sm font-black ml-2">
              Log Out
            </Text>
          </TouchableOpacity>
          <Text className="text-center text-[#9E9E9E] text-xs mt-3">
            FoodPanda App Version 51.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);
}
