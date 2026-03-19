import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { API_URL, API_URL_SOURCE, fetchHealth, type HealthResponse } from '@/lib/api';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

export default function HomeScreen() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setRequestState('loading');
    setHealthError(null);

    try {
      const response = await fetchHealth();
      setHealth(response);
      setRequestState('success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Khong the ket noi backend';
      setHealth(null);
      setHealthError(message);
      setRequestState('error');
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const statusTone =
    requestState === 'success'
      ? 'bg-emerald-100'
      : requestState === 'error'
        ? 'bg-rose-100'
        : 'bg-amber-100';

  const statusText =
    requestState === 'success'
      ? 'Ket noi thanh cong'
      : requestState === 'error'
        ? 'Ket noi that bai'
        : 'Dang kiem tra';

  const apiSourceLabel =
    API_URL_SOURCE === 'env'
      ? 'env'
      : API_URL_SOURCE === 'env-localhost-rewritten'
        ? 'env localhost duoc doi sang IP LAN'
        : API_URL_SOURCE === 'native-auto'
          ? 'tu dong suy ra tu Expo host'
          : 'fallback localhost';

  return (
    <ParallaxScrollView
      headerBackgroundColor="#E2E8F0"
      contentClassName="bg-slate-50"
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={{
            bottom: 0,
            height: 178,
            left: 0,
            position: 'absolute',
            width: 290,
          }}
        />
      }>
      <View className="gap-6">
        <View className="gap-3">
          <ThemedText type="eyebrow">Backend Test</ThemedText>
          <View className="flex-row items-center gap-2">
            <ThemedText type="title">Health check</ThemedText>
            <HelloWave />
          </View>
          <ThemedText className="text-slate-600">
            Man hinh nay dung de test frontend co goi duoc API backend hay khong.
          </ThemedText>
        </View>

        <View className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <ThemedText type="defaultSemiBold">API base URL</ThemedText>
              <ThemedText className="mt-2 text-slate-600">{API_URL}</ThemedText>
              <ThemedText className="mt-1 text-xs text-slate-500">Nguon URL: {apiSourceLabel}</ThemedText>
            </View>

            <Pressable
              className="rounded-full bg-slate-900 px-4 py-2 active:bg-slate-700"
              onPress={loadHealth}>
              <ThemedText className="text-sm font-semibold text-white">
                {requestState === 'loading' ? 'Dang goi...' : 'Goi lai API'}
              </ThemedText>
            </Pressable>
          </View>

          <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-center justify-between gap-3">
              <ThemedText type="defaultSemiBold">Trang thai request</ThemedText>
              <View className={`rounded-full px-3 py-1 ${statusTone}`}>
                <ThemedText className="text-xs font-semibold text-slate-900">{statusText}</ThemedText>
              </View>
            </View>

            <ThemedText className="mt-3 text-slate-600">
              {requestState === 'success' && health
                ? `Backend response: ${health.status}`
                : requestState === 'error'
                  ? `Loi: ${healthError}`
                  : 'Frontend dang goi GET /api/health ...'}
            </ThemedText>
          </View>

          {API_URL_SOURCE === 'fallback' ? (
            <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <ThemedText type="defaultSemiBold">Canh bao cau hinh</ThemedText>
              <ThemedText className="mt-2 text-slate-700">
                App dang fallback ve `localhost`. Neu ban test tren dien thoai that, hay chay Expo o
                che do LAN hoac set `EXPO_PUBLIC_API_URL` thanh IP LAN cua may dev.
              </ThemedText>
            </View>
          ) : null}

          <View className="mt-4 rounded-2xl bg-slate-950 p-4">
            <ThemedText className="font-mono text-xs uppercase tracking-[1.2px] text-slate-400">
              Response preview
            </ThemedText>
            <ThemedText className="mt-3 font-mono text-sm text-slate-100">
              {health
                ? JSON.stringify(health, null, 2)
                : healthError
                  ? JSON.stringify({ error: healthError }, null, 2)
                  : JSON.stringify({ status: 'loading' }, null, 2)}
            </ThemedText>
          </View>
        </View>

        <View className="gap-3">
          <ThemedText type="subtitle">Quick steps</ThemedText>

          <View className="rounded-3xl border border-slate-200 bg-white p-4">
            <ThemedText type="defaultSemiBold">1. Chay backend</ThemedText>
            <ThemedText className="mt-2 text-slate-600">
              Trong thu muc backend, chay `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
              de dien thoai trong cung mang goi duoc API.
            </ThemedText>
          </View>

          <View className="rounded-3xl border border-slate-200 bg-white p-4">
            <ThemedText type="defaultSemiBold">2. Kiem tra URL</ThemedText>
            <ThemedText className="mt-2 text-slate-600">
              Frontend uu tien `EXPO_PUBLIC_API_URL`. Neu khong set va dang chay tren dien thoai,
              app se tu suy ra IP LAN cua may dev. Android emulator van nen dung `http://10.0.2.2:8000`.
            </ThemedText>
          </View>

          <View className="rounded-3xl border border-slate-200 bg-white p-4">
            <ThemedText type="defaultSemiBold">3. Preview nhanh</ThemedText>
            <ThemedText className="mt-2 text-slate-600">
              Sau khi chay Expo, nhan{' '}
              <ThemedText type="defaultSemiBold">
                {Platform.select({ ios: 'i', android: 'a', web: 'w' })}
              </ThemedText>{' '}
              de mo app va xem ket qua health check.
            </ThemedText>
          </View>
        </View>
      </View>
    </ParallaxScrollView>
  );
}
