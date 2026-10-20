import "../global.css";
import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLocationStore } from "../store/locationStore";

export default function RootIndex() {
  const [statusText, setStatusText] = useState("Detecting your location...");
  const detectLocation = useLocationStore((state) => state.detectLocation);

  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      try {
        if (isMounted) setStatusText("Locating nearby kitchens...");
        const result = await detectLocation();
        if (isMounted) {
          if (result?.area) {
            setStatusText(`Found you in ${result.area}!`);
          } else {
            setStatusText("Ready to order!");
          }
        }
      } catch (err) {
        console.warn("Location detection notice:", err.message);
      } finally {
        setTimeout(() => {
          if (isMounted) {
            router.replace("/(customer)/(tabs)");
          }
        }, 800);
      }
    }

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View className="flex-1 bg-[#D70F64] items-center justify-center">
      <StatusBar barStyle="light-content" backgroundColor="#D70F64" />
      <SafeAreaView className="items-center justify-center px-6">
        {/* Brand Icon */}
        <View className="w-24 h-24 rounded-3xl bg-white/20 items-center justify-center mb-6 shadow-lg border border-white/30">
          <Ionicons name="fast-food" size={48} color="#FFFFFF" />
        </View>

        {/* Title */}
        <Text className="text-white text-3xl font-black tracking-tight mb-1">
          foodpanda
        </Text>
        <Text className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-8">
          Enterprise Delivery Network
        </Text>

        {/* Loader & Status Indicator */}
        <View className="flex-row items-center bg-white/15 px-4 py-2 rounded-full border border-white/20">
          <ActivityIndicator size="small" color="#FFFFFF" className="mr-2.5" />
          <Text className="text-white text-xs font-bold">
            {statusText}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
