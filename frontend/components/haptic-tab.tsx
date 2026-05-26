import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

export function HapticTab({ style, onPress, children, ...props }: BottomTabBarButtonProps) {
  const { ref, ...rest } = props as any;

  return (
    <Pressable
      {...rest}
      style={style}
      onPress={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(ev);
      }}
    >
      {children}
    </Pressable>
  );
}
