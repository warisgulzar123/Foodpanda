import "../../global.css";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { uploadImageApi, registerRiderApi } from "../../utils/api";
import { useAuthStore } from "../../store/authStore";

const STEPS = [
  { step: 1, title: "Personal", subtitle: "Name & contact info" },
  { step: 2, title: "Vehicle", subtitle: "Vehicle & license" },
  { step: 3, title: "Documents", subtitle: "Upload CNIC & License" },
  { step: 4, title: "Review", subtitle: "Submit fleet application" },
];

const VEHICLE_TYPES = ["Motorbike", "Bicycle", "Car / Van"];

export default function RegisterRiderScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Step 1: Rider Personal Details
  const [formData, setFormData] = useState({
    name: "Zubair Ahmed",
    email: "rider.applicant@foodpanda.com",
    password: "Password@123",
    phone: "+92 345 9988112",
    cityZone: "Clifton & Defence, Karachi",
  });

  // Step 2: Vehicle & License Data
  const [vehicleData, setVehicleData] = useState({
    vehicleType: "Motorbike",
    vehicle: "Honda CD 70 • KHI-4819",
    licenseNumber: "DL-KHI-829104",
    cnicNumber: "42201-9876543-1",
  });

  // Step 3: Document URLs
  const [documents, setDocuments] = useState({
    cnicDocUrl: "",
    licenseDocUrl: "",
    vehicleDocUrl: "",
  });

  // Helper to pick & upload document
  const handlePickDocument = async (fieldKey, label) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to upload rider verification documents."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingField(fieldKey);

        const uploadFormData = new FormData();
        const filename = asset.fileName || `${fieldKey}_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || "image/jpeg";

        if (Platform.OS === "web") {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          uploadFormData.append("image", blob, filename);
        } else {
          uploadFormData.append("image", {
            uri: asset.uri,
            name: filename,
            type: mimeType,
          });
        }

        const uploadRes = await uploadImageApi(uploadFormData);
        setUploadingField(null);

        if (uploadRes && uploadRes.url) {
          setDocuments((prev) => ({ ...prev, [fieldKey]: uploadRes.url }));
          Alert.alert("Upload Successful", `${label} uploaded successfully.`);
        } else {
          setDocuments((prev) => ({ ...prev, [fieldKey]: asset.uri }));
          Alert.alert("Notice", `Loaded preview for ${label}.`);
        }
      }
    } catch (err) {
      setUploadingField(null);
      Alert.alert("Upload Error", err.message);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        Alert.alert("Validation", "Please fill in all personal contact details.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!vehicleData.licenseNumber.trim() || !vehicleData.cnicNumber.trim()) {
        Alert.alert("Validation", "Please specify License Number and CNIC.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        ...vehicleData,
        ...documents,
      };

      const res = await registerRiderApi(payload);
      setIsSubmitting(false);

      if (res && res.success) {
        if (res.user && res.token) {
          setAuth(res.user, res.token);
        }
        setIsSuccessModalVisible(true);
      } else {
        Alert.alert("Submission Notice", res?.message || "Rider application received.");
        setIsSuccessModalVisible(true);
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View className="flex-1 bg-[#F7F7F7]">
      <SafeAreaView edges={["top"]} className="flex-1">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Top Header */}
        <View className="bg-white px-4 py-3 border-b border-[#E2E8F0] flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handlePrev}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-[#F7F7F7] border border-[#E2E8F0] items-center justify-center mr-3"
            >
              <Feather name="arrow-left" size={18} color="#1F1F1F" />
            </TouchableOpacity>
            <View>
              <Text className="text-[#1F1F1F] text-base font-black">
                Rider Fleet Onboarding
              </Text>
              <Text className="text-[#707070] text-[11px] font-medium">
                Step {currentStep} of 4: {STEPS[currentStep - 1].title}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            className="bg-[#FFF0F5] px-3 py-1.5 rounded-full border border-[#FFE0EB]"
          >
            <Text className="text-[#D70F64] text-xs font-bold">Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Step Progress Bar */}
        <View className="bg-white px-4 py-2.5 border-b border-[#E2E8F0] flex-row items-center space-x-2">
          {STEPS.map((s) => {
            const isActive = s.step === currentStep;
            const isDone = s.step < currentStep;
            return (
              <View key={s.step} className="flex-1 flex-row items-center">
                <View
                  className={`h-1.5 flex-1 rounded-full ${
                    isDone
                      ? "bg-[#D70F64]"
                      : isActive
                      ? "bg-[#D70F64]/70"
                      : "bg-[#E2E8F0]"
                  }`}
                />
              </View>
            );
          })}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: PERSONAL DETAILS */}
          {currentStep === 1 && (
            <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="motorbike" size={22} color="#D70F64" />
                </View>
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    Rider Identity
                  </Text>
                  <Text className="text-[#707070] text-xs font-medium">
                    Personal profile and operating delivery zone
                  </Text>
                </View>
              </View>

              {/* Name */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Full Name (as per CNIC) *
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(val) => setFormData({ ...formData, name: val })}
                  placeholder="e.g. Zubair Ahmed"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Email */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Email Address *
                </Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(val) => setFormData({ ...formData, email: val })}
                  placeholder="rider@example.com"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Password */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Account Password *
                </Text>
                <TextInput
                  value={formData.password}
                  onChangeText={(val) => setFormData({ ...formData, password: val })}
                  placeholder="Enter login password"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Phone */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Active Mobile Number (WhatsApp) *
                </Text>
                <TextInput
                  value={formData.phone}
                  onChangeText={(val) => setFormData({ ...formData, phone: val })}
                  placeholder="+92 300 0000000"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="phone-pad"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Delivery Zone */}
              <View className="mb-1">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Preferred Delivery Zone *
                </Text>
                <TextInput
                  value={formData.cityZone}
                  onChangeText={(val) => setFormData({ ...formData, cityZone: val })}
                  placeholder="e.g. Clifton, Karachi"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>
            </View>
          )}

          {/* STEP 2: VEHICLE & LICENSE DETAILS */}
          {currentStep === 2 && (
            <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="card-account-details-outline" size={22} color="#D70F64" />
                </View>
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    Vehicle & Driving License
                  </Text>
                  <Text className="text-[#707070] text-xs font-medium">
                    Fleet registration specifications
                  </Text>
                </View>
              </View>

              {/* Vehicle Type Pills */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1.5">
                  Vehicle Type *
                </Text>
                <View className="flex-row space-x-2">
                  {VEHICLE_TYPES.map((type) => {
                    const isSelected = vehicleData.vehicleType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setVehicleData({ ...vehicleData, vehicleType: type })}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
                          isSelected
                            ? "bg-[#D70F64] border-[#D70F64]"
                            : "bg-[#F7F7F7] border-[#E2E8F0]"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white" : "text-[#1F1F1F]"
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Vehicle Model & Registration Plate */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Vehicle Model & Plate Number *
                </Text>
                <TextInput
                  value={vehicleData.vehicle}
                  onChangeText={(val) => setVehicleData({ ...vehicleData, vehicle: val })}
                  placeholder="e.g. Honda CD 70 • KHI-4819"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Driving License Number */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Driving License Number *
                </Text>
                <TextInput
                  value={vehicleData.licenseNumber}
                  onChangeText={(val) => setVehicleData({ ...vehicleData, licenseNumber: val })}
                  placeholder="DL-KHI-XXXXXX"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* CNIC Number */}
              <View className="mb-1">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Rider CNIC / National ID *
                </Text>
                <TextInput
                  value={vehicleData.cnicNumber}
                  onChangeText={(val) => setVehicleData({ ...vehicleData, cnicNumber: val })}
                  placeholder="42201-XXXXXXX-X"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="numeric"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>
            </View>
          )}

          {/* STEP 3: DOCUMENT UPLOADS */}
          {currentStep === 3 && (
            <View className="mx-4 mt-4 space-y-4">
              <View className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center mb-1">
                  <View className="w-10 h-10 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                    <Ionicons name="document-attach" size={22} color="#D70F64" />
                  </View>
                  <View>
                    <Text className="text-[#1F1F1F] text-base font-black">
                      Verification Documents
                    </Text>
                    <Text className="text-[#707070] text-xs font-medium">
                      Upload clear photos of your original documents
                    </Text>
                  </View>
                </View>
              </View>

              {/* 1. CNIC Front/Back */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    1. National Identity Card (CNIC) *
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      documents.cnicDocUrl ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        documents.cnicDocUrl ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {documents.cnicDocUrl ? "Uploaded ✅" : "Required"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-xs mb-3">
                  Clear front/back image matching CNIC #{vehicleData.cnicNumber}
                </Text>

                {documents.cnicDocUrl ? (
                  <View className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] mb-3">
                    <Image
                      source={{ uri: documents.cnicDocUrl }}
                      className="w-full h-36 bg-[#F7F7F7]"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => handlePickDocument("cnicDocUrl", "CNIC Document")}
                  disabled={uploadingField === "cnicDocUrl"}
                  activeOpacity={0.8}
                  className="bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
                >
                  {uploadingField === "cnicDocUrl" ? (
                    <ActivityIndicator size="small" color="#D70F64" className="mr-2" />
                  ) : (
                    <Feather name="upload-cloud" size={16} color="#D70F64" className="mr-2" />
                  )}
                  <Text className="text-[#D70F64] text-xs font-black">
                    {documents.cnicDocUrl ? "Replace CNIC Photo" : "Upload CNIC Image"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 2. Driving License */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    2. Valid Driving License *
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      documents.licenseDocUrl ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        documents.licenseDocUrl ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {documents.licenseDocUrl ? "Uploaded ✅" : "Required"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-xs mb-3">
                  Original Sindh/Punjab/National driving license #{vehicleData.licenseNumber}
                </Text>

                {documents.licenseDocUrl ? (
                  <View className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] mb-3">
                    <Image
                      source={{ uri: documents.licenseDocUrl }}
                      className="w-full h-36 bg-[#F7F7F7]"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => handlePickDocument("licenseDocUrl", "Driving License")}
                  disabled={uploadingField === "licenseDocUrl"}
                  activeOpacity={0.8}
                  className="bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
                >
                  {uploadingField === "licenseDocUrl" ? (
                    <ActivityIndicator size="small" color="#D70F64" className="mr-2" />
                  ) : (
                    <Feather name="upload-cloud" size={16} color="#D70F64" className="mr-2" />
                  )}
                  <Text className="text-[#D70F64] text-xs font-black">
                    {documents.licenseDocUrl ? "Replace License Photo" : "Upload License Image"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. Vehicle Registration Card */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    3. Vehicle Registration Card / Book *
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      documents.vehicleDocUrl ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        documents.vehicleDocUrl ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {documents.vehicleDocUrl ? "Uploaded ✅" : "Required"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-xs mb-3">
                  Excise registration smart card or book for {vehicleData.vehicle}
                </Text>

                {documents.vehicleDocUrl ? (
                  <View className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] mb-3">
                    <Image
                      source={{ uri: documents.vehicleDocUrl }}
                      className="w-full h-36 bg-[#F7F7F7]"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => handlePickDocument("vehicleDocUrl", "Vehicle Registration")}
                  disabled={uploadingField === "vehicleDocUrl"}
                  activeOpacity={0.8}
                  className="bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
                >
                  {uploadingField === "vehicleDocUrl" ? (
                    <ActivityIndicator size="small" color="#D70F64" className="mr-2" />
                  ) : (
                    <Feather name="upload-cloud" size={16} color="#D70F64" className="mr-2" />
                  )}
                  <Text className="text-[#D70F64] text-xs font-black">
                    {documents.vehicleDocUrl ? "Replace Vehicle Card" : "Upload Vehicle Card Image"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {currentStep === 4 && (
            <View className="mx-4 mt-4 space-y-4">
              <View className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm mb-3">
                <Text className="text-[#1F1F1F] text-base font-black mb-1">
                  Confirm Fleet Registration
                </Text>
                <Text className="text-[#707070] text-xs font-medium mb-4">
                  Please review your credentials before submitting.
                </Text>

                <View className="bg-[#F7F7F7] p-4 rounded-2xl border border-[#E2E8F0] space-y-2.5">
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Rider Name:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.name}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Email:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.email}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Phone:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.phone}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Vehicle Type:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{vehicleData.vehicleType}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Vehicle Plate:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{vehicleData.vehicle}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">License #:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{vehicleData.licenseNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Status Notice Banner */}
              <View className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex-row items-center mb-3">
                <Ionicons name="time" size={24} color="#D97706" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-amber-900 text-xs font-black">
                    Verification Status: PENDING
                  </Text>
                  <Text className="text-amber-800 text-[11px] font-medium mt-0.5 leading-relaxed">
                    Our city fleet operations team will examine your driver's license and vehicle card before activating real-time order dispatch.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Navigation & Submit CTA Buttons */}
          <View className="mx-4 mt-5 flex-row space-x-3">
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={handlePrev}
                activeOpacity={0.8}
                className="flex-1 mr-2 py-4 rounded-2xl bg-white border border-[#E2E8F0] items-center justify-center shadow-xs"
              >
                <Text className="text-[#1F1F1F] text-sm font-bold">Back</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                className="flex-1 py-4 rounded-2xl bg-[#D70F64] items-center justify-center shadow-md flex-row"
              >
                <Text className="text-white text-sm font-black mr-2">
                  Continue to Next Step
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmitApplication}
                disabled={isSubmitting}
                activeOpacity={0.85}
                className="flex-1 py-4 rounded-2xl bg-[#D70F64] items-center justify-center shadow-md flex-row"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                ) : (
                  <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" className="mr-2" />
                )}
                <Text className="text-white text-sm font-black">
                  {isSubmitting ? "Submitting Application..." : "Submit Rider Application"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Success Modal / Banner */}
        {isSuccessModalVisible && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center p-6 z-50">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-[#E2E8F0]">
              <View className="w-16 h-16 rounded-3xl bg-amber-100 items-center justify-center mb-4">
                <Ionicons name="shield-checkmark-outline" size={32} color="#D97706" />
              </View>

              <Text className="text-[#1F1F1F] text-lg font-black text-center mb-1">
                Rider Onboarding Submitted!
              </Text>
              <Text className="text-[#D70F64] text-xs font-extrabold uppercase tracking-widest mb-3">
                Status: Pending Verification
              </Text>

              <Text className="text-[#707070] text-xs text-center leading-relaxed mb-6">
                Your driver license, CNIC, and vehicle papers have been forwarded to the Karachi fleet dispatch desk. Verification usually takes 24 hours.
              </Text>

              <TouchableOpacity
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
                className="w-full bg-[#D70F64] py-3.5 rounded-2xl items-center shadow-md mb-2.5"
              >
                <Text className="text-white text-sm font-black">
                  Proceed to Rider Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/(customer)/(tabs)")}
                activeOpacity={0.7}
                className="py-2"
              >
                <Text className="text-[#707070] text-xs font-bold">
                  Return to Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
