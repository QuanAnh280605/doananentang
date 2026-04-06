import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ToastContext,
  type ToastContextValue,
  type ToastItem,
  type ToastType,
} from '@/hooks/useToast';

type ToastProviderProps = {
  children: ReactNode;
};

const MAX_TOASTS = 2;
const ANIMATION_DURATION = 180;
const ANIMATION_OFFSET = 8;

type ToastPalette = {
  background: string;
  border: string;
  text: string;
  shadow: string;
};

type ToastCardProps = {
  toast: ToastItem;
  palette: ToastPalette;
  isStacked: boolean;
};

function ToastCard({ toast, palette, isStacked }: ToastCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-ANIMATION_OFFSET)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          opacity,
          transform: [{ translateY }],
        },
        isStacked ? styles.toastSpacing : null,
      ]}
    >
      <Text style={[styles.toastText, { color: palette.text }]}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const palette = useMemo(() => ({
    success: {
      background: isDark ? '#166534' : '#16a34a',
      border: isDark ? '#22c55e' : '#4ade80',
      text: isDark ? '#dcfce7' : '#ffffff',
      shadow: isDark ? '#020617' : '#0f172a',
    },
    error: {
      background: isDark ? '#9f1239' : '#e11d48',
      border: isDark ? '#fb7185' : '#f43f5e',
      text: isDark ? '#ffe4e6' : '#ffffff',
      shadow: isDark ? '#020617' : '#0f172a',
    },
  }), [isDark]);

  const clearTimer = useCallback((toastId: string) => {
    const timer = timersRef.current.get(toastId);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  const dismiss = useCallback((id?: string) => {
    if (!id) {
      timersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });
      timersRef.current.clear();
      setToasts([]);
      return;
    }

    setToasts((prev) => {
      const next = prev.filter((toast) => toast.id !== id);

      if (next.length !== prev.length) {
        clearTimer(id);
      }

      return next;
    });
  }, [clearTimer]);

  const scheduleToastTimer = useCallback((toastId: string, durationMs: number) => {
    clearTimer(toastId);

    const timer = setTimeout(() => {
      dismiss(toastId);
    }, durationMs);

    timersRef.current.set(toastId, timer);
  }, [clearTimer, dismiss]);

  const pushToast = useCallback((type: ToastType, message: string, durationMs: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((prev) => {
      const next = [...prev, { id, type, message, durationMs }];

      if (next.length <= MAX_TOASTS) {
        return next;
      }

      const trimmed = next.slice(-MAX_TOASTS);
      const removed = next.slice(0, next.length - MAX_TOASTS);

      removed.forEach((toast) => {
        clearTimer(toast.id);
      });

      return trimmed;
    });

    scheduleToastTimer(id, durationMs);
  }, [clearTimer, scheduleToastTimer]);

  const success = useCallback((message: string, durationMs = 3000) => {
    pushToast('success', message, durationMs);
  }, [pushToast]);

  const error = useCallback((message: string, durationMs = 4000) => {
    pushToast('error', message, durationMs);
  }, [pushToast]);

  const value = useMemo<ToastContextValue>(() => ({
    success,
    error,
    dismiss,
  }), [success, error, dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { top: Math.max(insets.top + 6, 12) }]}
        >
          {toasts.map((toast, index) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              palette={toast.type === 'success' ? palette.success : palette.error}
              isStacked={index < toasts.length - 1}
            />
          ))}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastSpacing: {
    marginBottom: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
