import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
};

export type ToastContextValue = {
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  dismiss: (id?: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
