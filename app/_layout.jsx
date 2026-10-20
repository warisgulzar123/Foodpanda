import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform, LogBox } from 'react-native';
import '../global.css';
import { useLocationStore } from '../store/locationStore';

// Suppress internal React Native for Web pointerEvents deprecation warning from TouchableOpacity
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  'pointerEvents',
]);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('props.pointerEvents is deprecated')) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function RootLayout() {
  useEffect(() => {
    // Automatically detect location on web/app launch
    useLocationStore.getState().detectLocation();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(restaurant)" />
      <Stack.Screen name="(rider)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
