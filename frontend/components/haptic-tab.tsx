import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(ev) => {
        try {
          if (Platform.OS === 'ios') {
            // Add a soft haptic feedback when pressing down on the tabs.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        } catch (error) {
          // Safe catch to ensure navigation is never blocked if Haptics fail
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
