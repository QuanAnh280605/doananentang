'use client';

import { useEffect, useState, useRef } from 'react';
import { ProtectedPage } from '@/components/app/ProtectedPage';
import { AppTopNav } from '@/components/navigation/AppTopNav';
import { ThemedText } from '@/components/ui/ThemedText';
import { fetchCurrentUser, updateUserProfile, changePassword, uploadUserAvatar, type AuthUser, type GenderValue } from '@/lib/auth';
import { API_URL } from '@/lib/api';

const surfaceClass = 'rounded-[28px] border border-[#E4E8EE] bg-white';

export default function EditProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<GenderValue>('female');
  const [city, setCity] = useState('');

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser()
      .then((u) => {
        if (isMounted) {
          setUser(u);
          setFirstName(u.first_name || '');
          setLastName(u.last_name || '');
          if (u.phone) setPhone(u.phone);
          if (u.gender) setGender(u.gender as GenderValue);
          if ((u as any).bio) setBio((u as any).bio);
          if (u.city) setCity(u.city);
          
          if (u.avatar_url) {
            setAvatarPreview(u.avatar_url.startsWith('http') ? u.avatar_url : `${API_URL}${u.avatar_url}`);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
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
        await uploadUserAvatar(avatarFile);
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
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi lưu thay đổi');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <ProtectedPage><div className="p-8 text-center">Loading...</div></ProtectedPage>;

  const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase() || 'U';

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-[#F8FAFC] pb-8">
        <div className="mx-auto w-full max-w-[800px] px-4 pb-6 pt-4 md:px-6">
          <AppTopNav />
          <section className={`${surfaceClass} mt-4 p-8`}>
            <ThemedText as="h1" className="text-[32px] font-semibold text-slate-950">Edit profile</ThemedText>
            <ThemedText as="p" className="mt-1 text-base text-slate-500 mb-8">Update your personal information and change your password.</ThemedText>

            {errorMsg && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200">
                <ThemedText as="p" className="text-red-600">{errorMsg}</ThemedText>
              </div>
            )}
            
            {successMsg && (
              <div className="mb-6 rounded-xl bg-green-50 p-4 border border-green-200">
                <ThemedText as="p" className="text-green-600">{successMsg}</ThemedText>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
              {/* Avatar Section */}
              <div>
                <ThemedText as="h2" className="text-xl font-semibold mb-4 text-slate-900">Profile Picture</ThemedText>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF4FB]">
                      <ThemedText as="span" className="text-2xl font-semibold text-slate-900">{initials}</ThemedText>
                    </div>
                  )}
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-[#F7F8FA] px-4 py-2 font-medium text-slate-900 border border-[#E4E8EE]"
                  >
                    Change photo
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>

              {/* Basic Info */}
              <div>
                <ThemedText as="h2" className="text-xl font-semibold mb-4 text-slate-900">Personal Information</ThemedText>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">First Name</label>
                    <input 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Last Name</label>
                    <input 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={lastName} onChange={(e) => setLastName(e.target.value)} required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <input 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Gender</label>
                    <select 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900 bg-white"
                      value={gender} onChange={(e) => setGender(e.target.value as GenderValue)}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Location (City)</label>
                    <input 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="Hà Nội, VN"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Bio</label>
                    <textarea 
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="pt-4 border-t border-[#E4E8EE]">
                <ThemedText as="h2" className="text-xl font-semibold mb-4 text-slate-900">Change Password</ThemedText>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Current Password</label>
                    <input 
                      type="password"
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">New Password</label>
                    <input 
                      type="password"
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters, 1 uppercase, 1 number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
                    <input 
                      type="password"
                      className="w-full rounded-xl border border-[#E4E8EE] px-4 py-3 outline-none focus:border-blue-500 text-slate-900"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="rounded-full bg-slate-900 px-8 py-3 text-base font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
