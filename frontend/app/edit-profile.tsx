import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/lib/api';
import {
  fetchCurrentUser,
  updateUserProfile,
  uploadUserAvatar,
  changePassword,
  type AuthUser,
  type GenderValue,
} from '@/lib/auth';

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <ThemedView className={`${surfaceClass} p-6`}>
      {children}
    </ThemedView>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-5">
      <ThemedText className="text-[22px] font-semibold text-slate-950">{title}</ThemedText>
      {subtitle ? (
        <ThemedText className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <ThemedText className="mb-2 text-sm font-medium text-slate-600">{label}</ThemedText>
  );
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  secureTextEntry,
  keyboardType,
  editable = true,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      multiline={multiline}
      numberOfLines={numberOfLines}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      editable={editable}
      textAlignVertical={multiline ? 'top' : 'center'}
      className={`rounded-2xl border border-slate-200 bg-[#F7F8FA] px-4 py-3.5 text-base text-slate-900 ${multiline ? 'min-h-[100px]' : ''
        } ${!editable ? 'opacity-60' : ''}`}
    />
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-2">
      <View className="flex-1">
        <ThemedText className="text-base font-medium text-slate-900">{title}</ThemedText>
        <ThemedText className="mt-0.5 text-sm text-slate-500">{subtitle}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const bars = 4;
  const getColor = (i: number) => {
    if (i >= strength) return '#E2E8F0';
    if (strength <= 1) return '#EF4444';
    if (strength <= 2) return '#F59E0B';
    return '#3B82F6';
  };
  const label = strength === 0 ? '' : strength <= 1 ? 'Weak' : strength <= 2 ? 'Medium' : 'Strong';

  return (
    <View className="mt-3 gap-2">
      <View className="flex-row gap-2">
        {Array.from({ length: bars }).map((_, i) => (
          <View
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: getColor(i) }}
          />
        ))}
      </View>
      {label ? (
        <View className="flex-row items-center justify-between">
          <ThemedText className="text-xs text-slate-500">Password strength</ThemedText>
          <ThemedText className="text-xs font-medium text-slate-700">{label}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Live-preview sidebar                                              */
/* ------------------------------------------------------------------ */

function LivePreviewCard({
  firstName,
  lastName,
  bio,
  avatarSource,
}: {
  firstName: string;
  lastName: string;
  bio: string;
  avatarSource: { uri: string } | null;
}) {
  const displayName = `${firstName} ${lastName}`.trim() || 'Tên của bạn';
  const initials = `${(firstName || 'N').charAt(0)}${(lastName || 'A').charAt(0)}`.toUpperCase();

  return (
    <View className="w-full">
      <SectionCard>
        {/* "Live preview" badge */}
        <View className="mb-4 self-start rounded-full bg-[#E0F2FE] px-3 py-1.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-[#38BDF8]" />
            <ThemedText className="text-xs font-semibold text-[#0284C7]">Live preview</ThemedText>
          </View>
        </View>

        {/* Preview avatar area */}
        <View className="mb-4 h-[120px] rounded-[20px] bg-[#D9ECF8]" />

        {/* Avatar + name */}
        <View className="-mt-12 flex-row items-end gap-3 px-3">
          {avatarSource ? (
            <View className="h-16 w-16 overflow-hidden rounded-[22px] border-[3px] border-white">
              <Image source={avatarSource} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </View>
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-[22px] border-[3px] border-white bg-[#EAF4FB]">
              <ThemedText className="text-lg font-semibold text-slate-900">{initials}</ThemedText>
            </View>
          )}
        </View>

        <View className="mt-3 px-1">
          <ThemedText className="text-lg font-semibold text-slate-950">{displayName}</ThemedText>
          <ThemedText className="text-sm text-slate-500">Product design lead</ThemedText>
        </View>

        {bio ? (
          <ThemedText className="mt-3 px-1 text-sm leading-5 text-slate-600" numberOfLines={3}>
            {bio}
          </ThemedText>
        ) : null}

        {/* Stats */}
        <View className="mt-4 flex-row gap-6 px-1">
          <View>
            <ThemedText className="text-lg font-semibold text-slate-950">2.4k</ThemedText>
            <ThemedText className="text-xs text-slate-500">Followers</ThemedText>
          </View>
          <View>
            <ThemedText className="text-lg font-semibold text-slate-950">14 live</ThemedText>
            <ThemedText className="text-xs text-slate-500">Projects</ThemedText>
          </View>
        </View>
      </SectionCard>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export default function EditProfileScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isTablet = width >= 768;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<GenderValue>('custom');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Contact fields (UI-only for now)
  const [website, setWebsite] = useState('');

  // Visibility toggles (UI-only for now)
  const [showRole, setShowRole] = useState(true);
  const [allowDM, setAllowDM] = useState(true);

  // Password fields (UI-only for now)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const u = await fetchCurrentUser();
        if (mounted && u) {
          setUser(u);
          setFirstName(u.first_name || '');
          setLastName(u.last_name || '');
          setBio(u.bio || '');
          setPhone(u.phone || '');
          setGender(u.gender || 'custom');
          setWebsite(u.website || '');
        }
      } catch {
        Alert.alert('Lỗi', 'Không thể tải thông tin cá nhân');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh');
    }
  };

  const removeAvatar = () => {
    setAvatarUri(null);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Lỗi', 'Họ và tên không được để trống');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
        return;
      }
      if (newPassword.length < 8) {
        Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất một chữ in hoa');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        Alert.alert('Lỗi', 'Mật khẩu phải chứa ít nhất một chữ số');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (avatarUri) {
        await uploadUserAvatar(avatarUri);
      }

      await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        gender,
      });

      if (newPassword) {
        await changePassword(currentPassword, newPassword);
      }

      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thay đổi';
      Alert.alert('Lỗi', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  /* Password strength heuristic */
  const getPasswordStrength = (pw: string): number => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  const currentAvatarSource = avatarUri
    ? { uri: avatarUri }
    : user?.avatar_url
      ? { uri: `${API_URL}${user.avatar_url}` }
      : null;

  const initials = `${(firstName || 'N').charAt(0)}${(lastName || 'A').charAt(0)}`.toUpperCase();
  const displayName = `${firstName} ${lastName}`.trim();

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]">
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            {/* Simple back header */}
            <View className="flex-row items-center gap-3 rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4">
              <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-80">
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">Edit-profile</ThemedText>
            </View>

            {/* Main 2-col layout */}
            <View className={isWide ? 'flex-row items-start gap-6' : 'gap-6'}>
              {/* ---- Left: Live preview ---- */}
              <View className={isWide ? 'w-[280px]' : 'w-full'}>
                <LivePreviewCard
                  firstName={firstName}
                  lastName={lastName}
                  bio={bio}
                  avatarSource={currentAvatarSource}
                />
              </View>

              {/* ---- Right: Form panels ---- */}
              <View className="flex-1 gap-6">
                {/* Header */}
                <View>
                  <ThemedText className="text-[32px] font-semibold text-slate-950">Edit profile</ThemedText>
                  <ThemedText className="mt-1 text-base text-slate-500">
                    Update the public details people see across your profile, posts, and messages.
                  </ThemedText>
                </View>

                {/* ======= Profile details ======= */}
                <SectionCard>
                  <SectionHeader title="Profile details" />

                  {/* Avatar row */}
                  <View className="mb-6 flex-row items-center gap-4">
                    {currentAvatarSource ? (
                      <View className="h-16 w-16 overflow-hidden rounded-full">
                        <Image source={currentAvatarSource} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      </View>
                    ) : (
                      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EAF4FB]">
                        <ThemedText className="text-xl font-semibold text-slate-900">{initials}</ThemedText>
                      </View>
                    )}

                    <Pressable
                      onPress={pickImage}
                      className="rounded-full bg-[#0F172A] px-5 py-2.5 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-semibold text-white">Change photo</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={removeAvatar}
                      className="rounded-full bg-[#F7F8FA] px-5 py-2.5 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-medium text-slate-700">Remove</ThemedText>
                    </Pressable>

                    <ThemedText className="ml-2 text-xs text-slate-400">
                      PNG or JPG. Best at 800 × 800 px.
                    </ThemedText>
                  </View>

                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="First name" />
                      <FieldInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Họ của bạn"
                      />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="Last name" />
                      <FieldInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Tên của bạn"
                      />
                    </View>
                  </View>

                  {/* Bio */}
                  <View className="mt-4">
                    <FieldLabel label="Bio" />
                    <FieldInput
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Giới thiệu ngắn về bạn..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </SectionCard>

                {/* ======= Contact and links ======= */}
                <SectionCard>
                  <SectionHeader title="Contact and links" />
                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="Email" />
                      <FieldInput
                        value={user?.email || ''}
                        editable={false}
                        placeholder="email@example.com"
                      />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="Website" />
                      <FieldInput
                        value={website}
                        onChangeText={setWebsite}
                        placeholder="yoursite.com"
                      />
                    </View>
                  </View>
                </SectionCard>

                {/* ======= Visibility and preferences ======= */}
                <SectionCard>
                  <SectionHeader title="Visibility and preferences" />
                  <View className="gap-2">
                    <ToggleRow
                      title="Show current role"
                      subtitle="Display your role under your profile name."
                      value={showRole}
                      onValueChange={setShowRole}
                    />
                    <View className="my-1 h-px bg-slate-100" />
                    <ToggleRow
                      title="Allow direct messages"
                      subtitle="Let followers message you directly from profile and posts."
                      value={allowDM}
                      onValueChange={setAllowDM}
                    />
                  </View>
                </SectionCard>

                {/* ======= Bottom action bar ======= */}
                <View className="flex-row items-center justify-between rounded-[20px] border border-slate-200 bg-white px-6 py-4">
                  <ThemedText className="text-sm text-slate-500">
                    Changes save only when you publish this update.
                  </ThemedText>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={handleCancel}
                      className="rounded-full bg-[#F7F8FA] px-6 py-3 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-medium text-slate-700">Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleSave}
                      disabled={isSaving}
                      className="min-w-[140px] items-center rounded-full bg-[#0F172A] px-6 py-3 active:opacity-80"
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText className="text-sm font-semibold text-white">Save changes</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* ======= Change password ======= */}
                <SectionCard>
                  <SectionHeader
                    title="Change password"
                    subtitle="Keep your account secure by choosing a strong password you do not use elsewhere."
                  />
                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="Current password" />
                      <FieldInput
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="••••••••••"
                        secureTextEntry
                      />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="New password" />
                      <FieldInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="••••••••••"
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View className="mt-4">
                    <View className={isTablet ? 'w-1/2 pr-2' : ''}>
                      <FieldLabel label="Confirm password" />
                      <FieldInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="••••••••••"
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <PasswordStrengthBar strength={getPasswordStrength(newPassword)} />
                </SectionCard>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}
