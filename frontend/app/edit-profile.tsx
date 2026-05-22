import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMockUser, updateMockUser, uploadMockAvatar, changeMockPassword } from '@/lib/mock-profile';
import type { GenderValue } from '@/lib/auth';

const surfaceClass = 'rounded-surface border border-app-border bg-app-surface';

// ─── Primitive components ────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <ThemedView className={`${surfaceClass} p-6`}>{children}</ThemedView>;
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

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <ThemedText className="mb-2 text-sm font-medium text-slate-600">
      {label}
      {required && <ThemedText className="text-[#EF4444]"> *</ThemedText>}
    </ThemedText>
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
  hasError = false,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
  hasError?: boolean;
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
      className={[
        'rounded-[18px] border bg-[#F7F8FA] px-4 py-3.5 text-base text-slate-900',
        multiline ? 'min-h-[100px]' : '',
        !editable ? 'opacity-60' : '',
        hasError ? 'border-[#EF4444]' : 'border-slate-200',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

/** Hiển thị lỗi inline ngay dưới field */
function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View className="mt-1.5 flex-row items-center gap-1.5">
      <MaterialIcons name="error-outline" size={14} color="#EF4444" />
      <ThemedText className="text-xs text-[#EF4444]">{message}</ThemedText>
    </View>
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
        trackColor={{ false: '#E2E8F0', true: '#4A9FD8' }}
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
    return '#4A9FD8';
  };
  const label =
    strength === 0 ? '' : strength <= 1 ? 'Yếu' : strength <= 2 ? 'Trung bình' : 'Mạnh';

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
          <ThemedText className="text-xs text-slate-500">Độ mạnh mật khẩu</ThemedText>
          <ThemedText className="text-xs font-medium text-slate-700">{label}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// ─── Success / error banner ───────────────────────────────────────────────────

function InlineBanner({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}) {
  const isSuccess = type === 'success';
  return (
    <View
      className={`flex-row items-center justify-between rounded-[14px] px-4 py-3 ${
        isSuccess ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
      }`}
    >
      <View className="flex-1 flex-row items-center gap-2">
        <MaterialIcons
          name={isSuccess ? 'check-circle' : 'error-outline'}
          size={18}
          color={isSuccess ? '#16A34A' : '#DC2626'}
        />
        <ThemedText
          className={`flex-1 text-sm font-medium ${isSuccess ? 'text-[#15803D]' : 'text-[#DC2626]'}`}
        >
          {message}
        </ThemedText>
      </View>
      <Pressable
        onPress={onDismiss}
        className="h-8 w-8 items-center justify-center"
        accessibilityLabel="Đóng thông báo"
      >
        <MaterialIcons name="close" size={16} color={isSuccess ? '#15803D' : '#DC2626'} />
      </Pressable>
    </View>
  );
}

// ─── Live preview sidebar ─────────────────────────────────────────────────────

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
        {/* Live preview badge */}
        <View className="mb-4 self-start rounded-full bg-[#E0F2FE] px-3 py-1.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full bg-[#4A9FD8]" />
            <ThemedText className="text-xs font-semibold text-[#0284C7]">Live preview</ThemedText>
          </View>
        </View>

        {/* Cover */}
        <View className="mb-4 h-[120px] rounded-[18px] bg-[#D9ECF8]" />

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
          <ThemedText className="text-sm text-slate-500">Thành viên</ThemedText>
        </View>

        {bio ? (
          <ThemedText className="mt-3 px-1 text-sm leading-5 text-slate-600" numberOfLines={3}>
            {bio}
          </ThemedText>
        ) : null}

        {/* Stats mock */}
        <View className="mt-4 flex-row gap-6 px-1">
          <View>
            <ThemedText className="text-lg font-semibold text-slate-950">2.4k</ThemedText>
            <ThemedText className="text-xs text-slate-500">Người theo dõi</ThemedText>
          </View>
          <View>
            <ThemedText className="text-lg font-semibold text-slate-950">14</ThemedText>
            <ThemedText className="text-xs text-slate-500">Bài viết</ThemedText>
          </View>
        </View>
      </SectionCard>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type ProfileErrors = {
  firstName?: string;
  lastName?: string;
};

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export default function EditProfileScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isTablet = width >= 768;

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Banners
  const [profileBanner, setProfileBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordBanner, setPasswordBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<GenderValue>('custom');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Profile inline errors
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  // Visibility toggles
  const [showRole, setShowRole] = useState(true);
  const [allowDM, setAllowDM] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password inline errors
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  // Load mock user
  useEffect(() => {
    let mounted = true;
    getMockUser()
      .then((u) => {
        if (mounted) {
          setFirstName(u.first_name || '');
          setLastName(u.last_name || '');
          setBio(u.bio || '');
          setPhone(u.phone || '');
          setGender(u.gender || 'custom');
          setCity(u.city || '');
          setEmail(u.email || '');
        }
      })
      .catch(() => {
        setProfileBanner({ type: 'error', message: 'Không thể tải thông tin cá nhân' });
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Avatar picker ──────────────────────────────────────────────────────────

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
      setProfileBanner({ type: 'error', message: 'Không thể mở thư viện ảnh' });
    }
  };

  const removeAvatar = () => {
    setAvatarUri(null);
  };

  // ── Profile validation ─────────────────────────────────────────────────────

  function validateProfile(): ProfileErrors {
    const errors: ProfileErrors = {};
    if (!firstName.trim()) errors.firstName = 'Họ không được để trống';
    if (!lastName.trim()) errors.lastName = 'Tên không được để trống';
    return errors;
  }

  // ── Save profile ───────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    const errors = validateProfile();
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingProfile(true);
    setProfileBanner(null);
    try {
      if (avatarUri) {
        await uploadMockAvatar(avatarUri);
      }

      await updateMockUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        gender,
      });

      setProfileBanner({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thay đổi';
      setProfileBanner({ type: 'error', message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Password validation ────────────────────────────────────────────────────

  function validatePassword(): PasswordErrors {
    const errors: PasswordErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Mật khẩu phải chứa ít nhất 1 chữ in hoa';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Mật khẩu phải chứa ít nhất 1 chữ số';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    return errors;
  }

  // ── Save password ──────────────────────────────────────────────────────────

  const handleSavePassword = async () => {
    const errors = validatePassword();
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingPassword(true);
    setPasswordBanner(null);
    try {
      await changeMockPassword(currentPassword, newPassword);
      setPasswordBanner({ type: 'success', message: 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đổi mật khẩu';
      setPasswordBanner({ type: 'error', message });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Password strength heuristic
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
        <ActivityIndicator size="large" color="#4A9FD8" />
      </View>
    );
  }

  const currentAvatarSource = avatarUri ? { uri: avatarUri } : null;
  const initials = `${(firstName || 'N').charAt(0)}${(lastName || 'A').charAt(0)}`.toUpperCase();

  return (
    <>
      <StatusBar style="dark" />
      <ThemedView className="flex-1 bg-[#F8FAFC]">
        <ScrollView bounces={false} className="flex-1" contentContainerClassName="pb-8">
          <ThemedView className="mx-auto w-full max-w-[1720px] gap-4 px-4 pb-6 pt-4 md:px-6">
            {/* Back header */}
            <View className="flex-row items-center gap-3 rounded-surface border border-app-border bg-app-surface px-5 py-4">
              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] active:opacity-80"
              >
                <ThemedText className="text-lg">←</ThemedText>
              </Pressable>
              <ThemedText className="text-lg font-semibold text-slate-900">Chỉnh sửa hồ sơ</ThemedText>
              {/* Mock indicator */}
              <View className="ml-auto rounded-full bg-[#FEF9C3] px-3 py-1">
                <ThemedText className="text-xs font-semibold text-[#854D0E]">MOCK DATA</ThemedText>
              </View>
            </View>

            {/* Main 2-col layout */}
            <View className={isWide ? 'flex-row items-start gap-6' : 'gap-6'}>
              {/* Left: Live preview */}
              <View className={isWide ? 'w-[280px]' : 'w-full'}>
                <LivePreviewCard
                  firstName={firstName}
                  lastName={lastName}
                  bio={bio}
                  avatarSource={currentAvatarSource}
                />
              </View>

              {/* Right: Form panels */}
              <View className="flex-1 gap-6">
                {/* Header */}
                <View>
                  <ThemedText className="text-[30px] font-semibold text-slate-950">Chỉnh sửa hồ sơ</ThemedText>
                  <ThemedText className="mt-1 text-base text-slate-500">
                    Cập nhật thông tin cá nhân hiển thị trên hồ sơ, bài viết và tin nhắn của bạn.
                  </ThemedText>
                </View>

                {/* Profile banner */}
                {profileBanner && (
                  <InlineBanner
                    type={profileBanner.type}
                    message={profileBanner.message}
                    onDismiss={() => setProfileBanner(null)}
                  />
                )}

                {/* ── Profile details ── */}
                <SectionCard>
                  <SectionHeader title="Thông tin hồ sơ" />

                  {/* Avatar row */}
                  <View className="mb-6 flex-row flex-wrap items-center gap-4">
                    {currentAvatarSource ? (
                      <View className="h-16 w-16 overflow-hidden rounded-full">
                        <Image
                          source={currentAvatarSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      </View>
                    ) : (
                      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EAF4FB]">
                        <ThemedText className="text-xl font-semibold text-slate-900">{initials}</ThemedText>
                      </View>
                    )}

                    <Pressable
                      onPress={pickImage}
                      className="rounded-[18px] bg-[#4A9FD8] px-5 py-3 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-semibold text-white">Thay ảnh</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={removeAvatar}
                      className="rounded-[18px] bg-[#F7F8FA] px-5 py-3 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-medium text-slate-700">Xoá</ThemedText>
                    </Pressable>

                    <ThemedText className="text-xs text-slate-400">PNG hoặc JPG. Tốt nhất 800×800 px.</ThemedText>
                  </View>

                  {/* Name row */}
                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="Họ" required />
                      <FieldInput
                        value={firstName}
                        onChangeText={(v) => {
                          setFirstName(v);
                          if (profileErrors.firstName) setProfileErrors((e) => ({ ...e, firstName: undefined }));
                        }}
                        placeholder="Họ của bạn"
                        hasError={!!profileErrors.firstName}
                      />
                      <FieldError message={profileErrors.firstName ?? ''} />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="Tên" required />
                      <FieldInput
                        value={lastName}
                        onChangeText={(v) => {
                          setLastName(v);
                          if (profileErrors.lastName) setProfileErrors((e) => ({ ...e, lastName: undefined }));
                        }}
                        placeholder="Tên của bạn"
                        hasError={!!profileErrors.lastName}
                      />
                      <FieldError message={profileErrors.lastName ?? ''} />
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

                {/* ── Contact and location ── */}
                <SectionCard>
                  <SectionHeader title="Liên hệ và vị trí" />
                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="Email" />
                      <FieldInput
                        value={email}
                        editable={false}
                        placeholder="email@example.com"
                      />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="Thành phố" />
                      <FieldInput
                        value={city}
                        onChangeText={setCity}
                        placeholder="Hà Nội, VN"
                      />
                    </View>
                  </View>
                  <View className={`mt-4 ${isTablet ? 'flex-row gap-4' : 'gap-4'}`}>
                    <View className="flex-1">
                      <FieldLabel label="Số điện thoại" />
                      <FieldInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="0912 345 678"
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View className="flex-1" />
                  </View>
                </SectionCard>

                {/* ── Visibility ── */}
                <SectionCard>
                  <SectionHeader title="Tuỳ chọn hiển thị" />
                  <View className="gap-2">
                    <ToggleRow
                      title="Hiển thị vai trò"
                      subtitle="Hiện vai trò bên dưới tên hồ sơ của bạn."
                      value={showRole}
                      onValueChange={setShowRole}
                    />
                    <View className="my-1 h-px bg-slate-100" />
                    <ToggleRow
                      title="Cho phép nhắn tin trực tiếp"
                      subtitle="Để người theo dõi nhắn tin từ hồ sơ và bài viết."
                      value={allowDM}
                      onValueChange={setAllowDM}
                    />
                  </View>
                </SectionCard>

                {/* ── Profile action bar ── */}
                <View className="flex-row items-center justify-between rounded-[18px] border border-slate-200 bg-white px-6 py-4">
                  <ThemedText className="text-sm text-slate-500">
                    Thay đổi chỉ lưu khi nhấn &quot;Lưu hồ sơ&quot;.
                  </ThemedText>
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={handleCancel}
                      className="rounded-[18px] bg-[#F7F8FA] px-6 py-3 active:opacity-80"
                    >
                      <ThemedText className="text-sm font-medium text-slate-700">Huỷ</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="min-w-[140px] items-center rounded-[18px] bg-[#4A9FD8] px-6 py-3 active:opacity-80 disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText className="text-sm font-semibold text-white">Lưu hồ sơ</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* ── Change password ── */}
                <SectionCard>
                  <SectionHeader
                    title="Đổi mật khẩu"
                    subtitle="Giữ tài khoản an toàn bằng mật khẩu mạnh, không dùng ở nơi khác. (Mock: nhập 'mock123' cho mật khẩu hiện tại)"
                  />

                  {/* Password banner */}
                  {passwordBanner && (
                    <View className="mb-4">
                      <InlineBanner
                        type={passwordBanner.type}
                        message={passwordBanner.message}
                        onDismiss={() => setPasswordBanner(null)}
                      />
                    </View>
                  )}

                  <View className={isTablet ? 'flex-row gap-4' : 'gap-4'}>
                    <View className="flex-1">
                      <FieldLabel label="Mật khẩu hiện tại" />
                      <FieldInput
                        value={currentPassword}
                        onChangeText={(v) => {
                          setCurrentPassword(v);
                          if (passwordErrors.currentPassword)
                            setPasswordErrors((e) => ({ ...e, currentPassword: undefined }));
                        }}
                        placeholder="••••••••••"
                        secureTextEntry
                        hasError={!!passwordErrors.currentPassword}
                      />
                      <FieldError message={passwordErrors.currentPassword ?? ''} />
                    </View>
                    <View className="flex-1">
                      <FieldLabel label="Mật khẩu mới" />
                      <FieldInput
                        value={newPassword}
                        onChangeText={(v) => {
                          setNewPassword(v);
                          if (passwordErrors.newPassword)
                            setPasswordErrors((e) => ({ ...e, newPassword: undefined }));
                        }}
                        placeholder="••••••••••"
                        secureTextEntry
                        hasError={!!passwordErrors.newPassword}
                      />
                      <FieldError message={passwordErrors.newPassword ?? ''} />
                      <PasswordStrengthBar strength={getPasswordStrength(newPassword)} />
                    </View>
                  </View>

                  <View className="mt-4">
                    <View className={isTablet ? 'w-1/2 pr-2' : ''}>
                      <FieldLabel label="Xác nhận mật khẩu mới" />
                      <FieldInput
                        value={confirmPassword}
                        onChangeText={(v) => {
                          setConfirmPassword(v);
                          if (passwordErrors.confirmPassword)
                            setPasswordErrors((e) => ({ ...e, confirmPassword: undefined }));
                        }}
                        placeholder="••••••••••"
                        secureTextEntry
                        hasError={!!passwordErrors.confirmPassword}
                      />
                      <FieldError message={passwordErrors.confirmPassword ?? ''} />
                    </View>
                  </View>

                  {/* Password action */}
                  <View className="mt-6 flex-row justify-end">
                    <Pressable
                      onPress={handleSavePassword}
                      disabled={isSavingPassword}
                      className="min-w-[160px] items-center rounded-[18px] bg-[#0F172A] px-6 py-3 active:opacity-80 disabled:opacity-50"
                    >
                      {isSavingPassword ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText className="text-sm font-semibold text-white">Đổi mật khẩu</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </SectionCard>
              </View>
            </View>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </>
  );
}
