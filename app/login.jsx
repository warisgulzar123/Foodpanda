import "../global.css";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { loginApi } from "../utils/api";
import { useAuthStore } from "../store/authStore";

const DEMO_PRESETS = [
  {
    role: "customer",
    label: "Customer",
    email: "user@foodpanda.com",
    pass: "123456",
    badge: "Food & Mart",
  },
  {
    role: "restaurant",
    label: "Vendor (Approved)",
    email: "vendor@kfc.com",
    pass: "123456",
    badge: "KFC Portal",
  },
  {
    role: "rider",
    label: "Rider (Verified)",
    email: "rider@foodpanda.com",
    pass: "123456",
    badge: "Karachi Fleet",
  },
  {
    role: "admin",
    label: "Super Admin",
    email: "admin@foodpanda.com",
    pass: "123456",
    badge: "Operations",
  },
  {
    role: "restaurant",
    label: "Vendor (Pending)",
    email: "pending.vendor@foodpanda.com",
    pass: "123456",
    badge: "Under Review",
    isPending: true,
  },
  {
    role: "rider",
    label: "Rider (Pending)",
    email: "pending.rider@foodpanda.com",
    pass: "123456",
    badge: "Under Review",
    isPending: true,
  },
];

export default function LoginScreen() {
  const [email, setEmail] = useState("user@foodpanda.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewBanner, setReviewBanner] = useState(null);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSelectPreset = (preset) => {
    setEmail(preset.email);
    setPassword(preset.pass);
    setErrorMessage("");
    setReviewBanner(null);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage("");
    setReviewBanner(null);
    setIsLoading(true);

    try {
      const result = await loginApi(email.trim(), password);
      setIsLoading(false);

      if (!result || !result.success) {
        setErrorMessage(result?.message || "Invalid email or password.");
        return;
      }

      const { user, token } = result;

      // Save authenticated session in Zustand / localStorage
      setAuth(user, token);

      // Check Verification & Approval State Machines
      if (user.role === "restaurant") {
        const isApproved = user.approvalStatus === "Approved";
        if (!isApproved) {
          setReviewBanner({
            title: "Restaurant Account Under Review",
            status: user.approvalStatus || "Pending",
            message:
              "Your commercial food partner onboarding is currently pending verification by Foodpanda Operations. Please ensure your CNIC, NTN, and Bank IBAN documents are uploaded.",
            actionText: "Check Registration Documents",
            onAction: () => router.push("/(auth)/register-restaurant"),
          });
          return;
        }
        router.replace("/(restaurant)/dashboard");
      } else if (user.role === "rider") {
        const isVerified = user.verificationStatus === "Verified";
        if (!isVerified) {
          setReviewBanner({
            title: "Rider Account Under Review",
            status: user.verificationStatus || "Pending",
            message:
              "Your delivery partner verification is currently in progress. The Karachi fleet operations desk will review your driving license, vehicle card, and CNIC before enabling active shifts.",
            actionText: "Update Driver Documents",
            onAction: () => router.push("/(auth)/register-rider"),
          });
          return;
        }
        router.replace("/(rider)/dashboard");
      } else if (user.role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        // Customer default
        router.replace("/(customer)/(tabs)");
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || "An unexpected network error occurred.");
    }
  };

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Header */}
        <View className="bg-white px-4 py-3.5 border-b border-[#E2E8F0] flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-2xl bg-[#D70F64] items-center justify-center mr-2.5 shadow-sm">
              <Text className="text-white text-xl font-black">fp</Text>
            </View>
            <View>
              <Text className="text-[#1F1F1F] text-lg font-black tracking-tight">
                foodpanda
              </Text>
              <Text className="text-[#707070] text-[11px] font-medium">
                Unified Authentication Gateway
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/(customer)/(tabs)")}
            activeOpacity={0.7}
            className="bg-[#FFF0F5] px-3.5 py-1.5 rounded-full border border-[#FFE0EB]"
          >
            <Text className="text-[#D70F64] text-xs font-bold">Skip as Guest</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Demo Role Autofill Carousel */}
          <View className="bg-white px-4 pt-3 pb-3.5 border-b border-[#E2E8F0]">
            <Text className="text-[#707070] text-[10px] font-bold uppercase tracking-wider mb-2">
              Quick Role Test Accounts (Tap to Load)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row space-x-2"
            >
              {DEMO_PRESETS.map((preset, idx) => {
                const isSelected = email === preset.email;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelectPreset(preset)}
                    activeOpacity={0.8}
                    className={`px-3 py-2 mr-2 rounded-2xl border ${
                      isSelected
                        ? "bg-[#D70F64] border-[#D70F64]"
                        : preset.isPending
                        ? "bg-amber-50 border-amber-200"
                        : "bg-[#F7F7F7] border-[#E2E8F0]"
                    }`}
                  >
                    <Text
                      className={`text-xs font-black ${
                        isSelected
                          ? "text-white"
                          : preset.isPending
                          ? "text-amber-800"
                          : "text-[#1F1F1F]"
                      }`}
                    >
                      {preset.label}
                    </Text>
                    <Text
                      className={`text-[9px] font-semibold mt-0.5 ${
                        isSelected ? "text-white/80" : "text-[#707070]"
                      }`}
                    >
                      {preset.badge}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Account Under Review Banner if pending status detected */}
          {reviewBanner && (
            <View className="mx-4 mt-4 bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 shadow-sm">
              <View className="flex-row items-center mb-2">
                <View className="w-10 h-10 rounded-2xl bg-amber-100 items-center justify-center mr-3">
                  <Ionicons name="time" size={24} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-amber-950 text-base font-black">
                    {reviewBanner.title}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <View className="bg-amber-200 px-2 py-0.5 rounded-full mr-2">
                      <Text className="text-amber-900 text-[10px] font-black uppercase">
                        Status: {reviewBanner.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text className="text-amber-900 text-xs font-medium leading-relaxed mb-4">
                {reviewBanner.message}
              </Text>

              {reviewBanner.onAction && (
                <TouchableOpacity
                  onPress={reviewBanner.onAction}
                  activeOpacity={0.8}
                  className="bg-amber-600 py-3 rounded-2xl items-center shadow-xs"
                >
                  <Text className="text-white text-xs font-black">
                    {reviewBanner.actionText}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Login Form Box */}
          <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
            <Text className="text-[#1F1F1F] text-lg font-black mb-1">
              Sign In to Your Workspace
            </Text>
            <Text className="text-[#707070] text-xs font-medium mb-4">
              Enter your credentials to access customer, partner, or fleet dashboards.
            </Text>

            {/* Error Message Box */}
            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex-row items-center">
                <Ionicons name="alert-circle" size={18} color="#DC2626" className="mr-2" />
                <Text className="text-red-700 text-xs font-bold flex-1">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-3.5">
              <Text className="text-[#1F1F1F] text-xs font-bold mb-1.5">
                Email Address
              </Text>
              <View className="flex-row items-center bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-3">
                <Feather name="mail" size={18} color="#707070" className="mr-2" />
                <TextInput
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage("");
                  }}
                  placeholder="Enter email address"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-[#1F1F1F] text-sm py-0 font-medium"
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-[#1F1F1F] text-xs font-bold mb-1.5">
                Password
              </Text>
              <View className="flex-row items-center bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-3">
                <Feather name="lock" size={18} color="#707070" className="mr-2" />
                <TextInput
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage("");
                  }}
                  placeholder="Enter password"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry={!showPassword}
                  className="flex-1 text-[#1F1F1F] text-sm py-0 font-medium"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#707070"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              className="bg-[#D70F64] rounded-2xl py-4 items-center justify-center shadow-lg flex-row mt-1"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
              ) : (
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" className="mr-2" />
              )}
              <Text className="text-white text-base font-black">
                {isLoading ? "Authenticating..." : "Sign In & Auto-Route"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Onboarding & Registration CTA Cards */}
          <View className="mx-4 mt-5">
            <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mb-3">
              New Commercial Onboarding
            </Text>

            {/* 1. Register Restaurant */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register-restaurant")}
              activeOpacity={0.85}
              className="bg-white rounded-3xl p-4 mb-3 border border-[#E2E8F0] shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="storefront-plus" size={24} color="#D70F64" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    Become a Restaurant Partner
                  </Text>
                  <Text className="text-[#707070] text-xs mt-0.5">
                    Submit CNIC, NTN & Bank Cheque to sell food on Foodpanda.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D70F64" />
            </TouchableOpacity>

            {/* 2. Register Rider */}
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register-rider")}
              activeOpacity={0.85}
              className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center mr-3">
                  <MaterialCommunityIcons name="moped-electric" size={24} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    Deliver with Foodpanda (Rider)
                  </Text>
                  <Text className="text-[#707070] text-xs mt-0.5">
                    Upload Driving License, CNIC & Vehicle papers to join fleet.
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
