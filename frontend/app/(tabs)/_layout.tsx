import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useWindowDimensions, Platform, Image, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktopOrTablet = width >= 960;
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setUser).catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: isDesktopOrTablet ? {
          display: 'none',
        } : {
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.9)' : '#FFFFFF',
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      {/* Ẩn khỏi tab bar nhưng vẫn giữ route để TopNav điều hướng được */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => {
            if (user?.avatar_url) {
              const uri = user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`;
              return (
                <View pointerEvents="none">
                  <Image
                    source={{ uri }}
                    style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color === '#0F172A' ? color : 'transparent' }}
                  />
                </View>
              );
            }
            return <IconSymbol size={26} name="person.fill" color={color} />;
          },
        }}
      />
    </Tabs>
  );
}
