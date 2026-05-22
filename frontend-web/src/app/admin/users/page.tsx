'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, LockOpen, User, MagnifyingGlass } from '@phosphor-icons/react';

import { adminFetchUsers, adminSetUserStatus, resolveAvatarUrl, type AdminUser } from '@/lib/api';

function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {isActive ? 'Hoạt động' : 'Đã khóa'}
    </span>
  );
}

function UserRoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${
        role === 'admin'
          ? 'bg-[#4A9FD8]/10 text-[#4A9FD8]'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const avatarUrl = resolveAvatarUrl(user.avatar_url);
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${user.first_name} ${user.last_name}`}
        className="h-10 w-10 rounded-[14px] object-cover"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF4FB] text-[13px] font-bold text-[#4A9FD8]">
      {initials || <User size={16} />}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchUsers();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách người dùng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (pendingIds.has(user.id)) return;

    setPendingIds((prev) => new Set(prev).add(user.id));
    const newStatus = !user.is_active;

    try {
      const updated = await adminSetUserStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(
        newStatus
          ? `Đã mở khóa tài khoản ${user.first_name} ${user.last_name}`
          : `Đã khóa tài khoản ${user.first_name} ${user.last_name}`,
        'success',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể thay đổi trạng thái.';
      showToast(msg, 'error');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-[18px] px-5 py-3.5 text-[14px] font-semibold text-white shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-slate-900">Danh sách người dùng</h1>
        <p className="text-[15px] text-slate-500">
          Quản lý tài khoản, xem trạng thái và khóa/mở khóa người dùng.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-[18px] border border-[#E4E8EE] bg-white py-3 pl-11 pr-5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#4A9FD8] focus:ring-2 focus:ring-[#4A9FD8]/20 transition-all"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EAF4FB] border-t-[#4A9FD8]" />
          <span className="mt-4 text-[14px] text-slate-500">Đang tải danh sách...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] bg-rose-50 py-12">
          <span className="text-[15px] font-medium text-rose-600">{error}</span>
          <button
            onClick={loadUsers}
            className="mt-4 rounded-[18px] bg-slate-900 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#E4E8EE] bg-white py-16">
          <span className="text-[15px] font-medium text-slate-700">Không tìm thấy người dùng</span>
          <span className="mt-2 text-[14px] text-slate-400">Thử thay đổi từ khóa tìm kiếm.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredUsers.map((user) => {
            const isPending = pendingIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-[24px] border border-[#E4E8EE] bg-white px-5 py-4 transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
              >
                <UserAvatar user={user} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-slate-900 truncate">
                      {user.first_name} {user.last_name}
                    </span>
                    <UserRoleBadge role={user.role} />
                  </div>
                  <span className="mt-0.5 block text-[13px] text-slate-400 truncate">
                    {user.email ?? user.phone ?? '—'}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <UserStatusBadge isActive={user.is_active} />

                  {user.role !== 'admin' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(user)}
                      title={user.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      className={`flex items-center gap-1.5 rounded-[14px] px-3.5 py-2 text-[13px] font-semibold transition-all disabled:opacity-50 ${
                        user.is_active
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {isPending ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : user.is_active ? (
                        <Lock size={15} weight="bold" />
                      ) : (
                        <LockOpen size={15} weight="bold" />
                      )}
                      {user.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
