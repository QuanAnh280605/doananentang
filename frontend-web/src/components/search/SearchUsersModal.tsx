import { SearchInput } from '@/components/ui/SearchInput';
import type { SearchUser } from '@/lib/auth';

type SearchUsersModalProps = {
  visible: boolean;
  query: string;
  users: SearchUser[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSelectUser: (user: SearchUser) => void;
  setQuery: (value: string) => void;
};

function buildInitials(user: SearchUser): string {
  const first = user.first_name.charAt(0);
  const last = user.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || 'US';
}

export function SearchUsersModal({
  visible,
  query,
  users,
  isLoading,
  errorMessage,
  onClose,
  onSelectUser,
  setQuery,
}: SearchUsersModalProps) {
  if (!visible) {
    return null;
  }

  const normalizedQuery = query.trim();

  return (
    <div className="fixed inset-0 z-[1200] flex items-start justify-center bg-black/35 px-4 pt-24">
      <button aria-label="Close search modal" className="absolute inset-0" onClick={onClose} type="button" />
      <div className="relative max-h-[72vh] w-full max-w-[560px] rounded-[28px] border border-[#DCE4EE] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-center gap-3">
          <SearchInput
            autoFocus
            className="flex-1"
            onChange={setQuery}
            value={query}
          />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2F7] text-[#475569]"
            onClick={onClose}
            type="button"
            aria-label="Close">
            ×
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {normalizedQuery.length < 2 ? 'Nhập ít nhất 2 ký tự để tìm người dùng.' : `Kết quả cho "${normalizedQuery}"`}
        </p>

        <div className="mt-4 min-h-[120px] rounded-[22px] bg-[#F8FAFC] p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">Đang tìm người dùng...</div>
          ) : errorMessage ? (
            <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
          ) : normalizedQuery.length < 2 ? null : users.length ? (
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                  onClick={() => onSelectUser(user)}
                  type="button">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#EAF4FB] text-sm font-semibold text-slate-900">
                    {buildInitials(user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-slate-900">{user.full_name}</p>
                    <p className="truncate text-sm text-slate-500">{user.bio || 'No bio available'}</p>
                  </div>
                  <span className="text-[#94A3B8]">›</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500">Không tìm thấy người dùng phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}
