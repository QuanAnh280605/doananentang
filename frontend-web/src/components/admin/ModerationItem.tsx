'use client';

import React, { useState } from 'react';
import type { ModerationItemData, ModerationStatus } from '@/lib/mock-admin';

// Re-use an Avatar or simple primitive
function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
      {initials}
    </div>
  );
}

function getInitials(name: string) {
  return name.charAt(0).toUpperCase();
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  return new Date(isoString).toLocaleDateString('vi-VN');
}

type Props = {
  item: ModerationItemData;
  onUpdateStatus: (id: number, newStatus: ModerationStatus) => Promise<void>;
};

export function ModerationItem({ item, onUpdateStatus }: Props) {
  const [loadingAction, setLoadingAction] = useState<ModerationStatus | null>(null);

  const handleAction = async (newStatus: ModerationStatus) => {
    if (loadingAction) return;
    setLoadingAction(newStatus);
    try {
      await onUpdateStatus(item.id, newStatus);
    } catch (err) {
      console.error(err);
      // Giả sử có toast error
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
      {/* Header: Reporter info & Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={getInitials(item.reporter.name)} />
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">
              {item.reporter.name}
            </div>
            <div className="text-[13px] text-[var(--text-muted)]">
              Báo cáo {formatRelativeTime(item.createdAt)}
            </div>
          </div>
        </div>
        
        {/* Badge Type */}
        <div className="rounded-[12px] bg-[var(--surface-muted)] px-3 py-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {item.type === 'post' ? 'Bài viết' : 'Người dùng'}
          </span>
        </div>
      </div>

      {/* Reason */}
      <div>
        <span className="text-[13px] font-bold uppercase tracking-wide text-[var(--danger)]">Lý do: </span>
        <span className="text-[15px] font-medium text-[var(--text)]">{item.reason}</span>
      </div>

      {/* Target Content */}
      <div className="rounded-[18px] bg-[var(--surface-muted)] p-4">
        {item.type === 'post' ? (
          <p className="text-[15px] text-[var(--text)] italic">&quot;{item.target.content}&quot;</p>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar initials={getInitials(item.target.name || 'U')} />
            <span className="text-[15px] font-semibold text-[var(--text)]">{item.target.name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {item.status === 'pending' && (
        <div className="mt-2 flex items-center gap-3 border-t border-[var(--border-soft)] pt-4">
          <button
            onClick={() => handleAction('resolved')}
            disabled={loadingAction !== null}
            className="flex h-10 flex-1 items-center justify-center rounded-[18px] bg-[var(--accent)] px-4 text-[14px] font-medium text-white transition-opacity hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loadingAction === 'resolved' ? 'Đang xử lý...' : (item.type === 'post' ? 'Gỡ bài viết' : 'Khóa tài khoản')}
          </button>
          <button
            onClick={() => handleAction('dismissed')}
            disabled={loadingAction !== null}
            className="flex h-10 flex-1 items-center justify-center rounded-[18px] border border-[var(--border)] bg-transparent px-4 text-[14px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-50"
          >
             {loadingAction === 'dismissed' ? 'Đang xử lý...' : 'Bỏ qua báo cáo'}
          </button>
        </div>
      )}
      
      {item.status !== 'pending' && (
        <div className="mt-2 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
           <span className="text-[14px] font-medium text-[var(--text-muted)]">
             Trạng thái hiện tại:
           </span>
           <span className={`text-[14px] font-bold ${item.status === 'resolved' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
             {item.status === 'resolved' ? 'Đã xử lý (Duyệt)' : 'Đã bỏ qua'}
           </span>
        </div>
      )}
    </div>
  );
}
