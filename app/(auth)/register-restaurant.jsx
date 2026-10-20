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
import { uploadImageApi, registerRestaurantApi } from "../../utils/api";
import { useAuthStore } from "../../store/authStore";

const STEPS = [
  { step: 1, title: "Store Info", subtitle: "Basic kitchen credentials" },
  { step: 2, title: "Tax & Bank", subtitle: "CNIC, NTN & IBAN details" },
  { step: 3, title: "Documents", subtitle: "Upload verification files" },
  { step: 4, title: "Review", subtitle: "Confirm & submit portal" },
];

export default function RegisterRestaurantScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Step 1: Restaurant Details
  const [formData, setFormData] = useState({
    name: "Burger Lab Express",
    ownerName: "Hamza Tariq",
    email: "partner@burgerlab.pk",
    password: "Password@123",
    phone: "+92 321 8899001",
    cuisine: "Gourmet Burgers • Fast Food • Shakes",
    address: "Shop 14, Block 7, Clifton, Karachi",
    minOrder: "350",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
  });

  // Step 2: Tax & Banking Numbers
  const [taxData, setTaxData] = useState({
    cnicNumber: "42201-8392104-5",
    ntnNumber: "7392014-9",
    bankIban: "PK36MEZN00010928374650",
    bankName: "Meezan Bank Ltd - Clifton Branch",
  });

  // Step 3: Document URLs
  const [documents, setDocuments] = useState({
    cnicDocUrl: "",
    ntnDocUrl: "",
    bankChequeUrl: "",
  });

  // Helper to pick and upload via expo-image-picker
  const handlePickDocument = async (fieldKey, label) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required to upload verification documents."
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
          Alert.alert("Upload Complete", `${label} uploaded successfully.`);
        } else {
          setDocuments((prev) => ({ ...prev, [fieldKey]: asset.uri }));
          Alert.alert("Notice", `Loaded local preview for ${label}.`);
        }
      }
    } catch (err) {
      setUploadingField(null);
      Alert.alert("Upload Error", err.message);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.email.trim()) {
        Alert.alert("Validation", "Please provide a Restaurant Name and Email.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!taxData.cnicNumber.trim() || !taxData.bankIban.trim()) {
        Alert.alert("Validation", "Please specify CNIC Number and Bank IBAN.");
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
        ...taxData,
        ...documents,
      };

      const res = await registerRestaurantApi(payload);
      setIsSubmitting(false);

      if (res && res.success) {
        // Save session in authStore with 'Pending' approval status
        if (res.user && res.token) {
          setAuth(res.user, res.token);
        }
        setIsSuccessModalVisible(true);
      } else {
        Alert.alert("Submission Notice", res?.message || "Application submitted.");
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
                Partner Onboarding
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

        {/* Step Progress Indicator Bar */}
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
          {/* STEP 1: RESTAURANT & OWNER PROFILE */}
          {currentStep === 1 && (
            <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="storefront" size={22} color="#D70F64" />
                </View>
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    Restaurant Details
                  </Text>
                  <Text className="text-[#707070] text-xs font-medium">
                    Enter basic information about your kitchen
                  </Text>
                </View>
              </View>

              {/* Restaurant Name */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Restaurant / Brand Name *
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(val) => setFormData({ ...formData, name: val })}
                  placeholder="e.g. Burger Lab"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Owner Name */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Owner / Representative Full Name *
                </Text>
                <TextInput
                  value={formData.ownerName}
                  onChangeText={(val) => setFormData({ ...formData, ownerName: val })}
                  placeholder="e.g. Hamza Tariq"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Email */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Business Email Address *
                </Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(val) => setFormData({ ...formData, email: val })}
                  placeholder="partner@yourkitchen.com"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Password */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Portal Login Password *
                </Text>
                <TextInput
                  value={formData.password}
                  onChangeText={(val) => setFormData({ ...formData, password: val })}
                  placeholder="Create a strong password"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Phone */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Official Contact Phone Number *
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

              {/* Cuisine & Address */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Cuisine Specialties
                </Text>
                <TextInput
                  value={formData.cuisine}
                  onChangeText={(val) => setFormData({ ...formData, cuisine: val })}
                  placeholder="Burgers • Pizza • Fast Food"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              <View className="mb-1">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Physical Kitchen Address *
                </Text>
                <TextInput
                  value={formData.address}
                  onChangeText={(val) => setFormData({ ...formData, address: val })}
                  placeholder="Street, Block, City"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>
            </View>
          )}

          {/* STEP 2: TAX & BANKING IDENTIFICATION */}
          {currentStep === 2 && (
            <View className="mx-4 mt-4 bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-2xl bg-[#FFF0F5] border border-[#FFE0EB] items-center justify-center mr-3">
                  <MaterialCommunityIcons name="bank" size={22} color="#D70F64" />
                </View>
                <View>
                  <Text className="text-[#1F1F1F] text-base font-black">
                    Business & Tax Details
                  </Text>
                  <Text className="text-[#707070] text-xs font-medium">
                    FBR compliance and daily settlement bank
                  </Text>
                </View>
              </View>

              {/* CNIC Number */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Owner CNIC / National ID *
                </Text>
                <TextInput
                  value={taxData.cnicNumber}
                  onChangeText={(val) => setTaxData({ ...taxData, cnicNumber: val })}
                  placeholder="42201-XXXXXXX-X"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="numeric"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* NTN Number */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  National Tax Number (NTN) *
                </Text>
                <TextInput
                  value={taxData.ntnNumber}
                  onChangeText={(val) => setTaxData({ ...taxData, ntnNumber: val })}
                  placeholder="XXXXXXX-X"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Bank Name */}
              <View className="mb-3">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Bank Name & Branch
                </Text>
                <TextInput
                  value={taxData.bankName}
                  onChangeText={(val) => setTaxData({ ...taxData, bankName: val })}
                  placeholder="e.g. Meezan Bank / HBL"
                  placeholderTextColor="#9E9E9E"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>

              {/* Bank IBAN */}
              <View className="mb-1">
                <Text className="text-[#1F1F1F] text-xs font-bold mb-1">
                  Settlement IBAN (24 Characters) *
                </Text>
                <TextInput
                  value={taxData.bankIban}
                  onChangeText={(val) => setTaxData({ ...taxData, bankIban: val })}
                  placeholder="PK36MEZN00000000000000"
                  placeholderTextColor="#9E9E9E"
                  autoCapitalize="characters"
                  className="bg-[#F7F7F7] border border-[#E2E8F0] rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[#1F1F1F]"
                />
              </View>
            </View>
          )}

          {/* STEP 3: DOCUMENT UPLOADS WITH EXPO-IMAGE-PICKER */}
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
                      Upload clear photos or scans of official records
                    </Text>
                  </View>
                </View>
              </View>

              {/* Document 1: Owner CNIC */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    1. Owner CNIC Card Photo *
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
                  Government issued CNIC front and back showing CNIC #{taxData.cnicNumber}
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
                  onPress={() => handlePickDocument("cnicDocUrl", "CNIC Card")}
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
                    {documents.cnicDocUrl ? "Replace CNIC File" : "Upload CNIC Image"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Document 2: NTN Certificate */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    2. FBR NTN Registration Certificate *
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      documents.ntnDocUrl ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        documents.ntnDocUrl ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {documents.ntnDocUrl ? "Uploaded ✅" : "Required"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-xs mb-3">
                  Federal Board of Revenue tax registration slip for NTN #{taxData.ntnNumber}
                </Text>

                {documents.ntnDocUrl ? (
                  <View className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] mb-3">
                    <Image
                      source={{ uri: documents.ntnDocUrl }}
                      className="w-full h-36 bg-[#F7F7F7]"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => handlePickDocument("ntnDocUrl", "NTN Certificate")}
                  disabled={uploadingField === "ntnDocUrl"}
                  activeOpacity={0.8}
                  className="bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
                >
                  {uploadingField === "ntnDocUrl" ? (
                    <ActivityIndicator size="small" color="#D70F64" className="mr-2" />
                  ) : (
                    <Feather name="upload-cloud" size={16} color="#D70F64" className="mr-2" />
                  )}
                  <Text className="text-[#D70F64] text-xs font-black">
                    {documents.ntnDocUrl ? "Replace NTN Certificate" : "Upload NTN Document"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Document 3: Bank Cheque / Statement */}
              <View className="bg-white rounded-3xl p-4 border border-[#E2E8F0] shadow-sm mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[#1F1F1F] text-sm font-black">
                    3. Voided Bank Cheque / Account Proof *
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      documents.bankChequeUrl ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        documents.bankChequeUrl ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {documents.bankChequeUrl ? "Uploaded ✅" : "Required"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[#707070] text-xs mb-3">
                  Crossed cheque or bank maintenance certificate showing IBAN #{taxData.bankIban}
                </Text>

                {documents.bankChequeUrl ? (
                  <View className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] mb-3">
                    <Image
                      source={{ uri: documents.bankChequeUrl }}
                      className="w-full h-36 bg-[#F7F7F7]"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => handlePickDocument("bankChequeUrl", "Bank Cheque")}
                  disabled={uploadingField === "bankChequeUrl"}
                  activeOpacity={0.8}
                  className="bg-[#FFF0F5] border border-[#FFE0EB] py-3 rounded-2xl flex-row items-center justify-center"
                >
                  {uploadingField === "bankChequeUrl" ? (
                    <ActivityIndicator size="small" color="#D70F64" className="mr-2" />
                  ) : (
                    <Feather name="upload-cloud" size={16} color="#D70F64" className="mr-2" />
                  )}
                  <Text className="text-[#D70F64] text-xs font-black">
                    {documents.bankChequeUrl ? "Replace Cheque File" : "Upload Bank Cheque Image"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: REVIEW & CONFIRMATION */}
          {currentStep === 4 && (
            <View className="mx-4 mt-4 space-y-4">
              <View className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-sm mb-3">
                <Text className="text-[#1F1F1F] text-base font-black mb-1">
                  Review Application
                </Text>
                <Text className="text-[#707070] text-xs font-medium mb-4">
                  Please verify your information before commercial submission.
                </Text>

                <View className="bg-[#F7F7F7] p-4 rounded-2xl border border-[#E2E8F0] space-y-2.5">
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Kitchen Name:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.name}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Owner Name:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.ownerName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Email:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{formData.email}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">CNIC #:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{taxData.cnicNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">NTN #:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{taxData.ntnNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[#707070] text-xs">Bank IBAN:</Text>
                    <Text className="text-[#1F1F1F] text-xs font-bold">{taxData.bankIban}</Text>
                  </View>
                </View>
              </View>

              {/* Status Notice Banner */}
              <View className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex-row items-center mb-3">
                <Ionicons name="time" size={24} color="#D97706" className="mr-3" />
                <View className="flex-1">
                  <Text className="text-amber-900 text-xs font-black">
                    Initial Approval Status: PENDING
                  </Text>
                  <Text className="text-amber-800 text-[11px] font-medium mt-0.5 leading-relaxed">
                    Once submitted, your account will enter the review queue. You can log in at any time to monitor review progress.
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
                  {isSubmitting ? "Submitting Application..." : "Submit Partner Application"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Success Modal / Banner Overlay */}
        {isSuccessModalVisible && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center p-6 z-50">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-[#E2E8F0]">
              <View className="w-16 h-16 rounded-3xl bg-amber-100 items-center justify-center mb-4">
                <Ionicons name="hourglass-outline" size={32} color="#D97706" />
              </View>

              <Text className="text-[#1F1F1F] text-lg font-black text-center mb-1">
                Application Under Review!
              </Text>
              <Text className="text-[#D70F64] text-xs font-extrabold uppercase tracking-widest mb-3">
                Status: Pending Approval
              </Text>

              <Text className="text-[#707070] text-xs text-center leading-relaxed mb-6">
                Your restaurant details and compliance documents (CNIC, NTN, Bank) have been securely registered. Our partner onboarding team will verify your documents within 24-48 hours.
              </Text>

              <TouchableOpacity
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
                className="w-full bg-[#D70F64] py-3.5 rounded-2xl items-center shadow-md mb-2.5"
              >
                <Text className="text-white text-sm font-black">
                  Go to Partner Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.replace("/(customer)/(tabs)")}
                activeOpacity={0.7}
                className="py-2"
              >
                <Text className="text-[#707070] text-xs font-bold">
                  Return to Home as Guest
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
