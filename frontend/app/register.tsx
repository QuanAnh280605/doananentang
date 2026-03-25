import { Link, Redirect, useRouter } from 'expo-router';
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
import {
  buildRegisterRequest,
  fetchCurrentUser,
  registerUser,
  type AuthUser,
} from '@/lib/auth';
import { getAccessToken } from '@/lib/session';

type PromoPanelProps = {
  isLargeScreen: boolean;
};

type GenderOption = 'Female' | 'Male' | 'Custom';

const GENDER_OPTIONS: GenderOption[] = ['Female', 'Male', 'Custom'];

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
          Stay in touch
        </ThemedText>
        <ThemedText
          className={`mt-4 font-bold text-slate-900 ${isLargeScreen ? 'text-5xl leading-[56px]' : 'text-[26px] leading-8'}`}>
          Connect with the people and moments that matter.
        </ThemedText>
        <ThemedText className={`mt-3 max-w-[460px] text-slate-600 ${isLargeScreen ? 'text-lg leading-8' : 'text-sm leading-6'}`}>
          {isLargeScreen
            ? 'A calm place to catch up, share updates, and keep your close circle only one tap away.'
            : 'Catch up fast with the people you care about most.'}
        </ThemedText>
      </View>

      <View className={`relative z-10 ${isLargeScreen ? 'mt-16 h-[280px]' : 'mt-5 gap-3'}`}>
        {isLargeScreen ? (
          <>
            <View className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
              <ThemedText type="defaultSemiBold">Friends online</ThemedText>
              <ThemedText className="mt-2 text-slate-600">See new photos, replies, and quick updates from your favorite people.</ThemedText>
              <View className="mt-4 flex-row gap-2">
                <View className="h-9 w-9 rounded-full bg-[#D7E7FF]" />
                <View className="h-9 w-9 rounded-full bg-[#BDD7FF]" />
                <View className="h-9 w-9 rounded-full bg-[#9EC5FF]" />
              </View>
            </View>

            <View className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
              <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
                Shared today
              </ThemedText>
              <ThemedText className="mt-3 text-2xl font-bold text-white">24 stories</ThemedText>
              <ThemedText className="mt-2 text-slate-300">Fresh moments from family, classmates, and your local community.</ThemedText>
            </View>

            <View className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
              <ThemedText type="defaultSemiBold" className="text-slate-900">
                Message, react, and plan together.
              </ThemedText>
              <View className="mt-4 gap-3">
                <View className="rounded-2xl bg-white/90 px-4 py-3">
                  <ThemedText className="text-sm text-slate-700">Dinner on Friday? I can bring dessert.</ThemedText>
                </View>
                <View className="self-end rounded-2xl bg-[#1877F2] px-4 py-3">
                  <ThemedText className="text-sm text-white">Perfect, see you at 7.</ThemedText>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4">
            <View className="flex-row items-center justify-between gap-3">
              <View>
                <ThemedText className="text-xs font-semibold uppercase tracking-[1.6px] text-[#1877F2]">
                  Shared today
                </ThemedText>
                <ThemedText className="mt-1 text-xl font-bold text-slate-900">24 stories</ThemedText>
              </View>
              <View className="flex-row gap-2">
                <View className="h-8 w-8 rounded-full bg-[#D7E7FF]" />
                <View className="h-8 w-8 rounded-full bg-[#9EC5FF]" />
              </View>
            </View>

            <ThemedText className="mt-2 text-sm text-slate-600">
              Catch up in a lighter, faster feed with your close circle.
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderOption>('Female');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<AuthUser | null>(null);

  if (getAccessToken()) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleRegister() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const payload = buildRegisterRequest({
        contact,
        password,
        firstName,
        lastName,
        birthDate,
        gender,
      });
      await registerUser(payload);
      const currentUser = await fetchCurrentUser();
      setSuccessUser(currentUser);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      setSuccessUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account right now');
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
            <ThemedText type="eyebrow">Get started</ThemedText>
            <ThemedText className={`font-bold text-slate-900 ${isLargeScreen ? 'mt-3 text-[30px] leading-9' : 'mt-2 text-[28px] leading-8'}`}>
              Create your account
            </ThemedText>
            <ThemedText className={`text-slate-600 ${isLargeScreen ? 'mt-3' : 'mt-2 text-sm leading-6'}`}>
              Start with the essentials and shape your profile as you go.
            </ThemedText>

            <View className={`gap-4 ${isLargeScreen ? 'mt-6' : 'mt-5'}`}>
              <View className={isLargeScreen ? 'flex-row gap-4' : 'gap-4'}>
                <View className={isLargeScreen ? 'flex-1' : ''}>
                  <TextInput
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                    onChangeText={setFirstName}
                    placeholder="First name"
                    placeholderTextColor="#64748B"
                    value={firstName}
                  />
                </View>
                <View className={isLargeScreen ? 'flex-1' : ''}>
                  <TextInput
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                    onChangeText={setLastName}
                    placeholder="Last name"
                    placeholderTextColor="#64748B"
                    value={lastName}
                  />
                </View>
              </View>

              <TextInput
                autoCapitalize="none"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChangeText={setContact}
                placeholder="Email or mobile number"
                placeholderTextColor="#64748B"
                value={contact}
              />

              <TextInput
                autoCapitalize="none"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={password}
              />

              <TextInput
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChangeText={setBirthDate}
                placeholder="Date of birth (DD/MM/YYYY or YYYY-MM-DD)"
                placeholderTextColor="#64748B"
                value={birthDate}
              />

              <View className="gap-3">
                <ThemedText type="defaultSemiBold">Gender</ThemedText>
                <View className="flex-row flex-wrap gap-3">
                  {GENDER_OPTIONS.map((option) => {
                    const selected = gender === option;

                    return (
                      <Pressable
                        key={option}
                        className={`rounded-2xl border px-4 py-3 ${selected ? 'border-[#1877F2] bg-[#EAF2FF]' : 'border-slate-200 bg-slate-50'}`}
                        onPress={() => setGender(option)}>
                        <ThemedText className={`font-semibold ${selected ? 'text-[#1877F2]' : 'text-slate-700'}`}>
                          {option}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <Pressable
              className={`rounded-2xl bg-[#1877F2] px-4 py-4 active:opacity-90 ${isLargeScreen ? 'mt-5' : 'mt-4'} ${isSubmitting ? 'opacity-70' : ''}`}
              disabled={isSubmitting}
              onPress={handleRegister}>
              <ThemedText className="text-center text-base font-semibold text-white">
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </ThemedText>
            </Pressable>

            {errorMessage ? <ThemedText className="mt-3 text-sm text-rose-600">{errorMessage}</ThemedText> : null}
            {successUser ? (
              <ThemedView className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ThemedText className="text-sm font-semibold text-emerald-700">
                  Account created for {successUser.first_name} {successUser.last_name}
                </ThemedText>
                <ThemedText className="mt-1 text-sm text-emerald-700">
                  {successUser.email ?? successUser.phone}
                </ThemedText>
              </ThemedView>
            ) : null}

            <Link asChild href="/login">
              <Pressable className="mt-4 self-center px-3 py-2">
                <ThemedText className="text-sm font-semibold text-[#1877F2]">Already have an account? Log in</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}
