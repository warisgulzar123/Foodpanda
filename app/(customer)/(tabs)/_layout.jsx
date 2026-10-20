import React from "react";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import {
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useCartStore } from "../../../store/cartStore";

export default function TabLayout() {
  const cartCount = useCartStore((state) => state.getItemCount());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#D70F64",
        tabBarInactiveTintColor: "#707070",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Food",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-bag" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Carts",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#D70F64",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "bold",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 14,
          },
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-cart" size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size || 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
