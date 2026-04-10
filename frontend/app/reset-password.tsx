import { Link, useLocalSearchParams, useRouter } from 'expo-router';
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
import { useToast } from '@/hooks/useToast';
import { buildResetPasswordRequest, resetPassword } from '@/lib/auth';

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
        <View className="self-start rounded-full bg-[#1877F2] px-4 py-2">
          <ThemedText className="text-sm font-bold lowercase tracking-[1px] text-white">f</ThemedText>
        </View>

        <ThemedText className="mt-6 text-sm font-semibold uppercase tracking-[2px] text-[#1877F2]">
          Password reset
        </ThemedText>
        <ThemedText
          className={`mt-4 font-bold text-slate-900 ${isLargeScreen ? 'text-5xl leading-[56px]' : 'text-[26px] leading-8'}`}>
          Set a new password and get back in.
        </ThemedText>
        <ThemedText className={`mt-3 max-w-[460px] text-slate-600 ${isLargeScreen ? 'text-lg leading-8' : 'text-sm leading-6'}`}>
          Choose a strong password with at least 8 characters to protect your account.
        </ThemedText>
      </View>

      <View className={`relative z-10 ${isLargeScreen ? 'mt-16 h-[280px]' : 'mt-5 gap-3'}`}>
        {isLargeScreen ? (
          <>
            <View className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
              <ThemedText type="defaultSemiBold">Security tip</ThemedText>
              <ThemedText className="mt-2 text-slate-600">Use a unique password you do not reuse on other services.</ThemedText>
            </View>

            <View className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
              <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
                Step 2
              </ThemedText>
              <ThemedText className="mt-3 text-2xl font-bold text-white">Create password</ThemedText>
              <ThemedText className="mt-2 text-slate-300">Confirm the same password before submitting.</ThemedText>
            </View>

            <View className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
              <ThemedText type="defaultSemiBold" className="text-slate-900">
                You can sign in right away after reset succeeds.
              </ThemedText>
            </View>
          </>
        ) : (
          <View className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4">
            <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-[#1877F2]">
              Secure account
            </ThemedText>
            <ThemedText className="mt-1 text-xl font-bold text-slate-900">Set a strong new password</ThemedText>
            <ThemedText className="mt-2 text-sm text-slate-600">
              Use at least 8 characters and avoid common words.
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const resolvedToken = Array.isArray(token) ? token[0] : token;
  const router = useRouter();
  const toast = useToast();
  const { height, width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!resolvedToken) {
      setErrorMessage('Missing reset token');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const payload = buildResetPasswordRequest(resolvedToken, newPassword);
      const response = await resetPassword(payload);
      const message = response.message?.trim() || 'Password reset successfully';
      toast.success(message);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to reset password right now';
      setErrorMessage(message);
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
            <ThemedText type="eyebrow">Reset password</ThemedText>
            <ThemedText className={`font-bold text-slate-900 ${isLargeScreen ? 'mt-3 text-[30px] leading-9' : 'mt-2 text-[28px] leading-8'}`}>
              Create a new password
            </ThemedText>
            <ThemedText className={`text-slate-600 ${isLargeScreen ? 'mt-3' : 'mt-2 text-sm leading-6'}`}>
              Enter your new password below, then confirm it to finish the reset.
            </ThemedText>

            <View className={`gap-4 ${isLargeScreen ? 'mt-6' : 'mt-5'}`}>
              <TextInput
                autoCapitalize="none"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                placeholder="New password"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={newPassword}
              />
              <TextInput
                autoCapitalize="none"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                placeholder="Confirm new password"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={confirmPassword}
              />
            </View>

            <Pressable
              className={`rounded-2xl bg-[#1877F2] px-4 py-4 active:opacity-90 ${isLargeScreen ? 'mt-5' : 'mt-4'} ${isSubmitting ? 'opacity-70' : ''}`}
              disabled={isSubmitting}
              onPress={handleSubmit}>
              <ThemedText className="text-center text-base font-semibold text-white">
                {isSubmitting ? 'Saving password...' : 'Reset password'}
              </ThemedText>
            </Pressable>

            {errorMessage ? (
              <ThemedView className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <ThemedText className="text-sm font-semibold text-rose-700">{errorMessage}</ThemedText>
              </ThemedView>
            ) : null}
            {!resolvedToken ? (
              <ThemedView className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <ThemedText className="text-sm font-semibold text-amber-700">
                  Invalid reset link. Please request a new one.
                </ThemedText>
              </ThemedView>
            ) : null}

            <Link asChild href="/login">
              <Pressable className="mt-4 self-center px-3 py-2">
                <ThemedText className="text-sm font-semibold text-[#1877F2]">Back to login</ThemedText>
              </Pressable>
            </Link>

            <Link asChild href="/forgot-password">
              <Pressable className="mt-1 self-center px-3 py-2">
                <ThemedText className="text-sm font-semibold text-[#1877F2]">Request another reset link</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}
