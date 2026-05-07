'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchCurrentUser, updateUserProfile, changePassword, uploadUserAvatar, type AuthUser, type GenderValue } from '@/lib/auth';
import { API_URL } from '@/lib/api';
import { compressToWebP } from '@/lib/image';

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

/* ------------------------------------------------------------------ */
/*  Reusable sub-components (matching App UI)                          */
/* ------------------------------------------------------------------ */

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className={`${surfaceClass} p-6`}>{children}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <ThemedText as="h2" className="text-[22px] font-semibold text-slate-950">{title}</ThemedText>
      {subtitle ? (
        <ThemedText as="p" className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</ThemedText>
      ) : null}
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-2 block text-sm font-medium text-slate-600">{label}</label>;
}

function FieldInput({
  value,
  onChange,
  placeholder,
  multiline,
  rows,
  type = 'text',
  disabled = false,
}: {
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  disabled?: boolean;
}) {
  const base = `w-full rounded-2xl border border-slate-200 bg-[#F7F8FA] px-4 py-3.5 text-base text-slate-900 outline-none focus:border-slate-400 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`;

  if (multiline) {
    return (
      <textarea
        className={`${base} min-h-[100px]`}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={rows || 3}
        disabled={disabled}
      />
    );
  }

  return (
    <input
      type={type}
      className={base}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
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
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <ThemedText as="p" className="text-base font-medium text-slate-900">{title}</ThemedText>
        <ThemedText as="p" className="mt-0.5 text-sm text-slate-500">{subtitle}</ThemedText>
      </div>
      <button
        type="button"
        onClick={() => onValueChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${value ? 'bg-blue-500' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${value ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </button>
    </div>
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
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: getColor(i) }}
          />
        ))}
      </div>
      {label ? (
        <div className="flex items-center justify-between">
          <ThemedText as="span" className="text-xs text-slate-500">Password strength</ThemedText>
          <ThemedText as="span" className="text-xs font-medium text-slate-700">{label}</ThemedText>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live-preview sidebar (matching App UI)                             */
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
  avatarSource: string | null;
}) {
  const displayName = `${firstName} ${lastName}`.trim() || 'Tên của bạn';
  const initials = `${(firstName || 'N').charAt(0)}${(lastName || 'A').charAt(0)}`.toUpperCase();

  return (
    <div className="w-full">
      <SectionCard>
        {/* "Live preview" badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#E0F2FE] px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-[#38BDF8]" />
          <ThemedText as="span" className="text-xs font-semibold text-[#0284C7]">Live preview</ThemedText>
        </div>

        {/* Preview cover */}
        <div className="mb-4 h-[120px] rounded-[20px] bg-[#D9ECF8]" />

        {/* Avatar + name */}
        <div className="-mt-12 flex items-end gap-3 px-3">
          {avatarSource ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border-[3px] border-white">
              <Image src={avatarSource} alt={displayName} width={64} height={64} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border-[3px] border-white bg-[#EAF4FB]">
              <ThemedText as="span" className="text-lg font-semibold text-slate-900">{initials}</ThemedText>
            </div>
          )}
        </div>

        <div className="mt-3 px-1">
          <ThemedText as="h3" className="text-lg font-semibold text-slate-950">{displayName}</ThemedText>
        </div>

        {bio ? (
          <ThemedText as="p" className="mt-3 px-1 text-sm leading-5 text-slate-600 line-clamp-3">{bio}</ThemedText>
        ) : null}

        {/* Stats */}
        <div className="mt-4 flex gap-6 px-1">
          <div>
            <ThemedText as="p" className="text-lg font-semibold text-slate-950">0</ThemedText>
            <ThemedText as="p" className="text-xs text-slate-500">Followers</ThemedText>
          </div>
          <div>
            <ThemedText as="p" className="text-lg font-semibold text-slate-950">0</ThemedText>
            <ThemedText as="p" className="text-xs text-slate-500">Posts</ThemedText>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export default function EditProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<GenderValue>('custom');
  const [city, setCity] = useState('');

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Visibility toggles (UI-only for now)
  const [showRole, setShowRole] = useState(true);
  const [allowDM, setAllowDM] = useState(true);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser()
      .then((u) => {
        if (isMounted) {
          setUser(u);
          setFirstName(u.first_name || '');
          setLastName(u.last_name || '');
          setBio(u.bio || '');
          setPhone(u.phone || '');
          setGender((u.gender as GenderValue) || 'custom');
          setCity(u.city || '');
          if (u.avatar_url) {
            setAvatarPreview(u.avatar_url.startsWith('http') ? u.avatar_url : `${API_URL}${u.avatar_url}`);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Họ và tên không được để trống');
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMsg('Mật khẩu mới phải có ít nhất 8 ký tự');
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        setErrorMsg('Mật khẩu phải chứa ít nhất một chữ in hoa');
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        setErrorMsg('Mật khẩu phải chứa ít nhất một chữ số');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (avatarFile) {
        const compressed = await compressToWebP(avatarFile);
        await uploadUserAvatar(compressed);
      }

      await updateUserProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        gender,
      });

      if (newPassword) {
        await changePassword(currentPassword, newPassword);
      }

      setSuccessMsg('Cập nhật hồ sơ thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    window.history.back();
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

  if (loading) {
    return (
      <ProtectedPage>
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      </ProtectedPage>
    );
  }

  const currentAvatarSource = avatarPreview || null;
  const initials = `${(firstName || 'N').charAt(0)}${(lastName || 'A').charAt(0)}`.toUpperCase();

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="mx-auto w-full max-w-[1720px] space-y-4 px-4 pb-6 pt-4 md:px-6">
          {/* Back header */}
          <div className="flex items-center gap-3 rounded-[28px] border border-[#E4E8EE] bg-white px-5 py-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F7F8FA] transition-opacity hover:opacity-80"
            >
              <span className="text-lg">←</span>
            </button>
            <ThemedText as="h1" className="text-lg font-semibold text-slate-900">Edit profile</ThemedText>
          </div>

          {/* Main 2-col layout */}
          <form onSubmit={handleSave}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
              {/* ---- Left: Live preview ---- */}
              <div className="w-full xl:w-[280px]">
                <LivePreviewCard
                  firstName={firstName}
                  lastName={lastName}
                  bio={bio}
                  avatarSource={currentAvatarSource}
                />
              </div>

              {/* ---- Right: Form panels ---- */}
              <div className="flex-1 space-y-6">
                {/* Header */}
                <div>
                  <ThemedText as="h1" className="text-[32px] font-semibold text-slate-950">Edit profile</ThemedText>
                  <ThemedText as="p" className="mt-1 text-base text-slate-500">
                    Update the public details people see across your profile, posts, and messages.
                  </ThemedText>
                </div>

                {/* Error / Success messages */}
                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <ThemedText as="p" className="text-red-600">{errorMsg}</ThemedText>
                  </div>
                )}
                {successMsg && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <ThemedText as="p" className="text-green-600">{successMsg}</ThemedText>
                  </div>
                )}

                {/* ======= Profile details ======= */}
                <SectionCard>
                  <SectionHeader title="Profile details" />

                  {/* Avatar row */}
                  <div className="mb-6 flex items-center gap-4">
                    {currentAvatarSource ? (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
                        <Image src={currentAvatarSource} alt="Avatar" width={64} height={64} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EAF4FB]">
                        <ThemedText as="span" className="text-xl font-semibold text-slate-900">{initials}</ThemedText>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
                    >
                      Change photo
                    </button>

                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="rounded-full bg-[#F7F8FA] px-5 py-2.5 text-sm font-medium text-slate-700 transition-opacity hover:opacity-80"
                    >
                      Remove
                    </button>

                    <ThemedText as="span" className="ml-2 text-xs text-slate-400">
                      PNG or JPG. Best at 800 × 800 px.
                    </ThemedText>

                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel label="First name" />
                      <FieldInput value={firstName} onChange={setFirstName} placeholder="Họ của bạn" />
                    </div>
                    <div>
                      <FieldLabel label="Last name" />
                      <FieldInput value={lastName} onChange={setLastName} placeholder="Tên của bạn" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mt-4">
                    <FieldLabel label="Bio" />
                    <FieldInput
                      value={bio}
                      onChange={setBio}
                      placeholder="Giới thiệu ngắn về bạn..."
                      multiline
                      rows={3}
                    />
                  </div>
                </SectionCard>

                {/* ======= Contact and location ======= */}
                <SectionCard>
                  <SectionHeader title="Contact and location" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel label="Email" />
                      <FieldInput value={user?.email || ''} disabled placeholder="email@example.com" />
                    </div>
                    <div>
                      <FieldLabel label="Phone" />
                      <FieldInput value={phone} onChange={setPhone} placeholder="0912 345 678" />
                    </div>
                    <div>
                      <FieldLabel label="Location (City)" />
                      <FieldInput value={city} onChange={setCity} placeholder="Hà Nội, VN" />
                    </div>
                    <div>
                      <FieldLabel label="Gender" />
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-[#F7F8FA] px-4 py-3.5 text-base text-slate-900 outline-none focus:border-slate-400 transition-colors"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as GenderValue)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                </SectionCard>

                {/* ======= Visibility and preferences ======= */}
                <SectionCard>
                  <SectionHeader title="Visibility and preferences" />
                  <div className="space-y-2">
                    <ToggleRow
                      title="Show current role"
                      subtitle="Display your role under your profile name."
                      value={showRole}
                      onValueChange={setShowRole}
                    />
                    <div className="my-1 h-px bg-slate-100" />
                    <ToggleRow
                      title="Allow direct messages"
                      subtitle="Let followers message you directly from profile and posts."
                      value={allowDM}
                      onValueChange={setAllowDM}
                    />
                  </div>
                </SectionCard>

                {/* ======= Bottom action bar ======= */}
                <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-6 py-4">
                  <ThemedText as="p" className="text-sm text-slate-500">
                    Changes save only when you publish this update.
                  </ThemedText>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="rounded-full bg-[#F7F8FA] px-6 py-3 text-sm font-medium text-slate-700 transition-opacity hover:opacity-80"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="min-w-[140px] rounded-full bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </span>
                      ) : (
                        'Save changes'
                      )}
                    </button>
                  </div>
                </div>

                {/* ======= Change password ======= */}
                <SectionCard>
                  <SectionHeader
                    title="Change password"
                    subtitle="Keep your account secure by choosing a strong password you do not use elsewhere."
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel label="Current password" />
                      <FieldInput
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder="••••••••••"
                        type="password"
                      />
                    </div>
                    <div>
                      <FieldLabel label="New password" />
                      <FieldInput
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="••••••••••"
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="mt-4 md:w-1/2 md:pr-2">
                    <FieldLabel label="Confirm password" />
                    <FieldInput
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="••••••••••"
                      type="password"
                    />
                  </div>

                  <PasswordStrengthBar strength={getPasswordStrength(newPassword)} />
                </SectionCard>
              </div>
            </div>
          </form>
        </div>
      </main>
    </ProtectedPage>
  );
}
