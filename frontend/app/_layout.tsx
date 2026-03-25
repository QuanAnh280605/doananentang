import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { hydrateAccessToken } from '@/lib/session';

import '../global.css';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    hydrateAccessToken().finally(() => {
      if (isMounted) {
        setIsAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isAuthReady) {
    return <View className="flex-1 bg-[#F4F8FF]" />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Preview' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
