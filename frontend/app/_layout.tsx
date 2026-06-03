import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/toast/ToastProvider';
import { restoreAuthSession } from '@/lib/api';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

// Prevent splash screen from auto-hiding until auth is ready
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    restoreAuthSession().finally(() => {
      if (isMounted) {
        setIsAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      SplashScreen.hideAsync();
    }
  }, [isAuthReady]);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="inbox" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="profile/[userId]" />
          <Stack.Screen name="profile/follows" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="(post)" />
        </Stack>
        <StatusBar style="dark" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

