import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { buildForgotPasswordRequest, requestPasswordReset } from '@/lib/auth';

type PromoPanelProps = {
  isLargeScreen: boolean;
};

function PromoPanel({ isLargeScreen }: PromoPanelProps) {
  return (
    <ThemedView
      className={`relative overflow-hidden rounded-[32px] bg-[#E9F2FF] ${isLargeScreen ? 'min-h-[736px] flex-1 px-10 py-12' : 'px-5 py-6'}`}>
      <View className="absolute left-[-48px] top-[-32px] h-36 w-36 rounded-full bg-white/60" />
      <View className="absolute bottom-[-80px] right-[-20px] h-52 w-52 rounded-full bg-[#CCE0FF]" />
      <View className="absolute right-10 top-12 h-16 w-16 rounded-[24px] bg-white/80" />

      <View className="relative z-10 max-w-[520px]">
        <View className="self-start rounded-full bg-[#4A9FD8] px-4 py-2">
          <ThemedText className="text-sm font-bold lowercase tracking-[1px] text-white">f</ThemedText>
        </View>

        <ThemedText className="mt-6 text-sm font-semibold uppercase tracking-[2px] text-[#4A9FD8]">
          Hỗ trợ tài khoản
        </ThemedText>
        <ThemedText
          className={`mt-4 font-bold text-slate-900 ${isLargeScreen ? 'text-5xl leading-[56px]' : 'text-[26px] leading-8'}`}>
          Khôi phục tài khoản nhanh chóng và bảo mật.
        </ThemedText>
        <ThemedText className={`mt-3 max-w-[460px] text-slate-600 ${isLargeScreen ? 'text-lg leading-8' : 'text-sm leading-6'}`}>
          Nhập email của bạn để nhận liên kết đặt lại và tạo mật khẩu mới chỉ trong vài bước.
        </ThemedText>
      </View>

      <View className={`relative z-10 ${isLargeScreen ? 'mt-16 h-[280px]' : 'mt-5 gap-3'}`}>
        {isLargeScreen ? (
          <>
            <View className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
              <ThemedText type="defaultSemiBold">Đặt lại an toàn</ThemedText>
              <ThemedText className="mt-2 text-slate-600">Mỗi liên kết đặt lại có thời hạn để bảo vệ tài khoản của bạn.</ThemedText>
            </View>

            <View className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
              <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
                Bước 1
              </ThemedText>
              <ThemedText className="mt-3 text-2xl font-bold text-white">Nhập email</ThemedText>
              <ThemedText className="mt-2 text-slate-300">Chúng tôi sẽ gửi liên kết đặt lại an toàn tới hộp thư của bạn.</ThemedText>
            </View>

            <View className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
              <ThemedText type="defaultSemiBold" className="text-slate-900">
                Bước 2: Mở email và đặt mật khẩu mới.
              </ThemedText>
            </View>
          </>
        ) : (
          <View className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4">
            <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-[#4A9FD8]">
              Khôi phục quyền truy cập
            </ThemedText>
            <ThemedText className="mt-1 text-xl font-bold text-slate-900">Đặt lại trong 2 bước đơn giản</ThemedText>
            <ThemedText className="mt-2 text-sm text-slate-600">
              Nhập email, sau đó làm theo liên kết được gửi đến hộp thư của bạn.
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

export default function ForgotPasswordScreen() {
  const { height, width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const payload = buildForgotPasswordRequest(email);
      const response = await requestPasswordReset(payload);
      setSuccessMessage(response.message);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi liên kết đặt lại vào lúc này');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      bounces={false}
      className="flex-1 bg-[#F4F8FF]"
      contentContainerClassName="flex-grow"
      contentContainerStyle={{ minHeight: height }}
      showsVerticalScrollIndicator={false}>
      <ThemedView className="flex-1 px-4 py-4 sm:px-6">
        <ThemedView
          className={`mx-auto w-full ${isLargeScreen ? 'max-w-6xl flex-row items-start gap-8 py-6' : 'max-w-xl gap-4'}`}>
          <PromoPanel isLargeScreen={isLargeScreen} />

          <ThemedView
            className={`w-full rounded-[32px] border border-slate-200 bg-white shadow-sm shadow-slate-200 ${isLargeScreen ? 'min-h-[736px] max-w-[420px] px-8 py-9' : 'p-5'}`}>
            <ThemedText type="eyebrow">Quên mật khẩu</ThemedText>
            <ThemedText className={`font-bold text-slate-900 ${isLargeScreen ? 'mt-3 text-[30px] leading-9' : 'mt-2 text-[28px] leading-8'}`}>
              Tìm tài khoản của bạn
            </ThemedText>
            <ThemedText className={`text-slate-600 ${isLargeScreen ? 'mt-3' : 'mt-2 text-sm leading-6'}`}>
              Nhập địa chỉ email và chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn.
            </ThemedText>

            <View className={`gap-4 ${isLargeScreen ? 'mt-6' : 'mt-5'}`}>
              <TextInput
                autoCapitalize="none"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                placeholder="Địa chỉ email"
                placeholderTextColor="#64748B"
                value={email}
              />
            </View>

            <Pressable
              className={`rounded-2xl bg-[#4A9FD8] px-4 py-4 active:opacity-90 ${isLargeScreen ? 'mt-5' : 'mt-4'} ${isSubmitting ? 'opacity-70' : ''}`}
              disabled={isSubmitting}
              onPress={handleSubmit}>
              <ThemedText className="text-center text-base font-semibold text-white">
                {isSubmitting ? 'Đang gửi liên kết...' : 'Gửi liên kết đặt lại'}
              </ThemedText>
            </Pressable>

            {errorMessage ? (
              <ThemedView className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <ThemedText className="text-sm font-semibold text-rose-700">{errorMessage}</ThemedText>
              </ThemedView>
            ) : null}
            {successMessage ? (
              <ThemedView className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ThemedText className="text-sm font-semibold text-emerald-700">{successMessage}</ThemedText>
              </ThemedView>
            ) : null}

            <Link asChild href="/login">
              <Pressable className="mt-4 self-center px-3 py-2">
                <ThemedText className="text-sm font-semibold text-[#4A9FD8]">Quay lại đăng nhập</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}
