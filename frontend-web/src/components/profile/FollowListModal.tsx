import { useState, useEffect } from 'react';
import { fetchFollowers, fetchFollowing, followUser, unfollowUser, type FollowUser, type SearchUser } from '@/lib/auth';

type FollowListModalProps = {
  visible: boolean;
  type: 'followers' | 'following';
  userId: number | null;
  onClose: () => void;
};

function buildInitials(user: FollowUser | SearchUser): string {
  const first = user.first_name?.charAt(0) || '';
  const last = user.last_name?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'U';
}

export function FollowListModal({
  visible,
  type,
  userId,
  onClose,
}: FollowListModalProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Đặt lại trang về 1 khi modal đóng hoặc đối tượng xem thay đổi
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsers([]);
  }, [visible, type, userId]);

  useEffect(() => {
    if (!visible || !userId) {
      return;
    }

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMsg(null);

    const fetchFn = type === 'followers' ? fetchFollowers : fetchFollowing;

    fetchFn(userId, page)
      .then((data) => {
        if (isMounted) {
          setUsers((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
          setTotalPages(data.total_pages);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) setErrorMsg(err instanceof Error ? err.message : 'Không thể lấy danh sách');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [visible, type, userId, page]);

  if (!visible) {
    return null;
  }

  const title = type === 'followers' ? 'Người theo dõi' : 'Đang theo dõi';

  const handleToggleFollow = async (targetUserId: number, currentlyFollowing: boolean) => {
    try {
      // Optimistic UI update
      setUsers(current => current.map(u =>
        u.id === targetUserId ? { ...u, is_following: !currentlyFollowing } : u
      ));

      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
    } catch {
      // Revert if error
      setUsers(current => current.map(u =>
        u.id === targetUserId ? { ...u, is_following: currentlyFollowing } : u
      ));
      alert('Không thể thay đổi trạng thái theo dõi.');
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/35 px-4">
      <button aria-label="Close modal overlay" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div className="relative max-h-[80vh] w-full max-w-[500px] rounded-[28px] border border-[#DCE4EE] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2F7] text-[#475569] hover:bg-[#E2E8F0] transition-colors"
            onClick={onClose}
            type="button"
            aria-label="Close">
            ×
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {errorMsg ? (
            <div className="flex items-center justify-center py-12 text-sm text-red-500">
              {errorMsg}
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3 pb-4">
              {users.map((user) => {
                const isFollowing = user.is_following;
                return (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-white p-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#EAF4FB] text-sm font-semibold text-slate-900">
                        {buildInitials(user)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-slate-900">{user.full_name}</p>
                        <p className="truncate text-sm text-slate-500">{user.bio || 'Chưa có giới thiệu'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(user.id, isFollowing)}
                      className={`min-w-[100px] shrink-0 rounded-[20px] px-4 py-2 text-sm font-medium transition-colors ${isFollowing
                          ? 'bg-[#EEF2F7] text-slate-900 hover:bg-[#E2E8F0]'
                          : 'bg-[#0A0A0A] text-white hover:bg-slate-800'
                        }`}
                    >
                      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                  </div>
                );
              })}

              {page < totalPages && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="rounded-full bg-[#F1F5F9] px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#E2E8F0] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Đang tải...' : 'Tải thêm'}
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Chưa có {type === 'followers' ? 'người theo dõi' : 'người đang theo dõi'} nào.
            </div>
          ) : null}

          {loading && users.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 mr-2" />
              Đang tải danh sách...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
