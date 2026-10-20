import { Stack } from "expo-router";

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="order-tracking/[id]" />
    </Stack>
  );
}
