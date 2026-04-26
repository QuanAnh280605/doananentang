'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ToastContext, type ToastContextValue, type ToastItem, type ToastType } from '@/hooks/useToast';

type ToastProviderProps = {
  children: ReactNode;
};

type ToastPalette = {
  background: string;
  border: string;
  text: string;
  shadow: string;
};

const MAX_TOASTS = 2;

function getPalette(type: ToastType): ToastPalette {
  if (type === 'success') {
    return {
      background: '#16a34a',
      border: '#4ade80',
      text: '#ffffff',
      shadow: 'rgba(15, 23, 42, 0.28)',
    };
  }

  return {
    background: '#e11d48',
    border: '#f43f5e',
    text: '#ffffff',
    shadow: 'rgba(15, 23, 42, 0.28)',
  };
}

function ToastCard({ toast, isStacked }: { toast: ToastItem; isStacked: boolean }) {
  const palette = getPalette(toast.type);

  return (
    <div
      className={`pointer-events-none rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_16px_40px_rgba(15,23,42,0.14)] transition-all ${isStacked ? 'mb-2' : ''}`}
      style={{
        backgroundColor: palette.background,
        borderColor: palette.border,
        color: palette.text,
        boxShadow: `0 16px 40px ${palette.shadow}`,
      }}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((toastId: string) => {
    const timer = timersRef.current.get(toastId);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  const dismiss = useCallback((id?: string) => {
    if (!id) {
      timersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });
      timersRef.current.clear();
      setToasts([]);
      return;
    }

    setToasts((prev) => {
      const next = prev.filter((toast) => toast.id !== id);

      if (next.length !== prev.length) {
        clearTimer(id);
      }

      return next;
    });
  }, [clearTimer]);

  const scheduleToastTimer = useCallback((toastId: string, durationMs: number) => {
    clearTimer(toastId);

    const timer = setTimeout(() => {
      dismiss(toastId);
    }, durationMs);

    timersRef.current.set(toastId, timer);
  }, [clearTimer, dismiss]);

  const pushToast = useCallback((type: ToastType, message: string, durationMs: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((prev) => {
      const next = [...prev, { id, type, message, durationMs }];

      if (next.length <= MAX_TOASTS) {
        return next;
      }

      const trimmed = next.slice(-MAX_TOASTS);
      const removed = next.slice(0, next.length - MAX_TOASTS);

      removed.forEach((toast) => {
        clearTimer(toast.id);
      });

      return trimmed;
    });

    scheduleToastTimer(id, durationMs);
  }, [clearTimer, scheduleToastTimer]);

  const success = useCallback((message: string, durationMs = 3000) => {
    pushToast('success', message, durationMs);
  }, [pushToast]);

  const error = useCallback((message: string, durationMs = 4000) => {
    pushToast('error', message, durationMs);
  }, [pushToast]);

  const value = useMemo<ToastContextValue>(() => ({
    success,
    error,
    dismiss,
  }), [success, error, dismiss]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto w-full max-w-md">
        {toasts.map((toast, index) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            isStacked={index < toasts.length - 1}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
