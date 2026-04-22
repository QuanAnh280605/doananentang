import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/toast/ToastProvider';
import { restoreAuthSession } from '@/lib/api';

import '../global.css';

export const unstable_settings = {
  anchor: 'index',
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

  if (!isAuthReady) {
    return <View className="flex-1 bg-[#F4F8FF]" />;
  }

  return (
    <ToastProvider>
      <>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </>
    </ToastProvider>
  );
}
