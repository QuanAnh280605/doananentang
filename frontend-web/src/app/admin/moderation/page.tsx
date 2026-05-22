'use client';

import { useEffect, useState, useCallback } from 'react';
import { Warning, CheckCircle, XCircle, Clock, ArrowSquareOut } from '@phosphor-icons/react';

import {
  adminFetchPostReports,
  adminUpdateReportStatus,
  type AdminPostReport,
  type ReportStatus,
} from '@/lib/api';

const TABS: { label: string; value: ReportStatus }[] = [
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đã duyệt', value: 'resolved' },
  { label: 'Đã bỏ qua', value: 'dismissed' },
];

function StatusIcon({ status }: { status: ReportStatus }) {
  if (status === 'resolved') return <CheckCircle size={16} weight="fill" className="text-emerald-500" />;
  if (status === 'dismissed') return <XCircle size={16} weight="fill" className="text-slate-400" />;
  return <Clock size={16} weight="fill" className="text-amber-500" />;
}

function ReportCard({
  report,
  onAction,
  pendingKey,
}: {
  report: AdminPostReport;
  onAction: (postId: string, reporterId: number, status: ReportStatus) => void;
  pendingKey: string | null;
}) {
  const key = `${report.post_id}-${report.reporter_id}`;
  const isPending = pendingKey === key;
  const isPendingStatus = report.status === 'pending';

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-[#E4E8EE] bg-white p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Warning size={18} weight="fill" className="shrink-0 text-amber-500" />
          <span className="text-[13px] font-semibold text-slate-500">
            Báo cáo bởi:{' '}
            <span className="text-slate-900">{report.reporter_name ?? `#${report.reporter_id}`}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon status={report.status} />
          <span className="text-[12px] font-semibold text-slate-500">
            {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'resolved' ? 'Đã duyệt' : 'Đã bỏ qua'}
          </span>
        </div>
      </div>

      {/* Post content preview */}
      {report.post_content && (
        <div className="rounded-[18px] bg-[#F8FAFC] px-4 py-3">
          <p className="line-clamp-3 text-[14px] leading-6 text-slate-700">{report.post_content}</p>
        </div>
      )}

      {/* Reason */}
      {report.reason && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-[12px] font-bold uppercase tracking-wide text-slate-400">Lý do:</span>
          <span className="text-[13px] text-slate-600">{report.reason}</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E8EE] pt-3">
        <a
          href={`/post/${report.post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4A9FD8] hover:underline"
        >
          <ArrowSquareOut size={14} />
          Xem bài viết
        </a>

        <span className="text-[12px] text-slate-400">
          {new Date(report.created_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
        </span>

        {isPendingStatus && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onAction(report.post_id, report.reporter_id, 'resolved')}
              className="flex items-center gap-1.5 rounded-[14px] bg-emerald-50 px-3.5 py-2 text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
              ) : (
                <CheckCircle size={15} weight="bold" />
              )}
              Duyệt (xóa bài)
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onAction(report.post_id, report.reporter_id, 'dismissed')}
              className="flex items-center gap-1.5 rounded-[14px] bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              ) : (
                <XCircle size={15} weight="bold" />
              )}
              Bỏ qua
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<AdminPostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadReports = useCallback(async (status: ReportStatus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchPostReports(status);
      setReports(data.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải danh sách báo cáo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports(activeTab);
  }, [activeTab, loadReports]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (postId: string, reporterId: number, status: ReportStatus) => {
    const key = `${postId}-${reporterId}`;
    if (pendingKey === key) return;

    setPendingKey(key);
    try {
      await adminUpdateReportStatus(postId, reporterId, status);
      // Remove from current list (changed tab)
      setReports((prev) => prev.filter((r) => !(r.post_id === postId && r.reporter_id === reporterId)));
      showToast(
        status === 'resolved' ? 'Đã duyệt vi phạm và xóa bài viết.' : 'Đã bỏ qua báo cáo.',
        'success',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xử lý báo cáo.';
      showToast(msg, 'error');
    } finally {
      setPendingKey(null);
    }
  };

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
        <h1 className="text-[28px] font-bold text-slate-900">Quản lý kiểm duyệt</h1>
        <p className="text-[15px] text-slate-500">
          Xem xét và xử lý các báo cáo vi phạm nội dung.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E4E8EE] pb-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap rounded-[18px] px-5 py-2.5 text-[14px] font-semibold transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-[#F1F5F9] text-slate-500 hover:bg-[#E4E8EE] hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
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
            onClick={() => loadReports(activeTab)}
            className="mt-4 rounded-[18px] bg-slate-900 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-[#E4E8EE] bg-white py-16">
          <span className="text-[15px] font-medium text-slate-700">Không có báo cáo nào</span>
          <span className="mt-2 text-[14px] text-slate-400">Chưa có mục nào ở trạng thái này.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <ReportCard
              key={`${report.post_id}-${report.reporter_id}`}
              report={report}
              onAction={handleAction}
              pendingKey={pendingKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
