import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { style, onPress, children, ...rest } = props as any;

  return (
    <Pressable
      {...rest}
      ref={rest.ref}
      style={style}
      onPress={(ev) => {
        try {
          if (Platform.OS === 'ios') {
            // Add a soft haptic feedback when pressing down on the tabs.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        } catch (error) {
          // Safe catch to ensure navigation is never blocked if Haptics fail
        }
        onPress?.(ev);
      }}
    >
      {children}
    </Pressable>
  );
}
