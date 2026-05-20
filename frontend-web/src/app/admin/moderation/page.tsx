'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchMockModerationItems, updateMockModerationStatus } from '@/lib/mock-admin';
import type { ModerationItemData, ModerationStatus } from '@/lib/mock-admin';
import { ModerationItem } from '@/components/admin/ModerationItem';

const TABS: { label: string; value: ModerationStatus }[] = [
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đã duyệt', value: 'resolved' },
  { label: 'Đã bỏ qua', value: 'dismissed' },
];

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState<ModerationStatus>('pending');
  const [items, setItems] = useState<ModerationItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (status: ModerationStatus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMockModerationItems(status);
      setItems(data);
    } catch (err) {
      setError('Lỗi tải dữ liệu kiểm duyệt.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(activeTab);
  }, [activeTab, loadData]);

  const handleUpdateStatus = async (id: number, newStatus: ModerationStatus) => {
    await updateMockModerationStatus(id, newStatus);
    // Optimistic update - remove the item from the current list (since it changed status)
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-[var(--text)]">Quản lý kiểm duyệt</h1>
        <p className="text-[15px] text-[var(--text-muted)]">
          Xem xét và xử lý các báo cáo vi phạm nội dung và người dùng.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap rounded-[18px] px-5 py-2.5 text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--text)] text-[var(--app-bg)]'
                  : 'bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-soft)] border-t-[var(--accent)]" />
            <span className="mt-4 text-[14px] text-[var(--text-muted)]">Đang tải danh sách...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] bg-[var(--surface-muted)] py-12">
            <span className="text-[16px] text-[var(--danger)]">{error}</span>
            <button
              onClick={() => loadData(activeTab)}
              className="mt-4 rounded-[18px] bg-[var(--text)] px-6 py-2 text-[14px] font-medium text-[var(--surface)]"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] bg-[var(--surface)] py-16 shadow-sm">
            <span className="text-[16px] font-medium text-[var(--text)]">Không có dữ liệu</span>
            <span className="mt-2 text-[14px] text-[var(--text-muted)]">
              Chưa có mục nào trong trạng thái này.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <ModerationItem key={item.id} item={item} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
