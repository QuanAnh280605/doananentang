import { Tabs, useGlobalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useWindowDimensions, Platform, View } from 'react-native';
import { Image } from 'expo-image';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { HapticTab } from '@/components/haptic-tab';

interface TabIconProps {
  name: any;
  color: string;
  focused: boolean;
  isProfile?: boolean;
  avatarUrl?: string | null;
}

function TabIcon({ name, color, focused, isProfile, avatarUrl }: TabIconProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 5, height: 38 }}>
      {isProfile && avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: focused ? '#4A9FD8' : 'rgba(148, 163, 184, 0.3)',
          }}
        />
      ) : (
        <IconSymbol size={22} name={name} color={color} />
      )}
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: focused ? '#4A9FD8' : 'transparent',
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktopOrTablet = width >= 960;
  const [user, setUser] = useState<AuthUser | null>(null);
  const params = useGlobalSearchParams<{ chatActive?: string }>();
  const isChatActive = params.chatActive === 'true';

  useEffect(() => {
    fetchCurrentUser().then(setUser).catch(() => { });
  }, []);

  const userAvatarUrl = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`)
    : null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4A9FD8',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
        tabBarStyle: isDesktopOrTablet ? {
          display: 'none',
        } : {
          display: isChatActive ? 'none' : 'flex',
          borderTopWidth: 1,
          borderTopColor: '#E4E8EE', // Bám sát token border trong DESIGN_SYSTEM_RULES.md
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          // Đổ bóng siêu nhẹ phía trên thanh tab
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 4,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 0,
          marginTop: 0,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="house.fill" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="magnifyingglass" color={color} focused={focused} />
          ),
        }}
      />
      {/* Sử dụng href: null để loại bỏ hoàn toàn khỏi tính toán Flexbox của Tab Bar */}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person.fill"
              color={color}
              focused={focused}
              isProfile={true}
              avatarUrl={userAvatarUrl}
            />
          ),
        }}
      />
    </Tabs>
  );
}

