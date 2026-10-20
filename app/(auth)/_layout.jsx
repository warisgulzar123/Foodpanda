import { Stack } from "expo-router";
import "../../global.css";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="register-restaurant" />
      <Stack.Screen name="register-rider" />
    </Stack>
  );
}
