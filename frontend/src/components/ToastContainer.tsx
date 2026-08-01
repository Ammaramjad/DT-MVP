import React, { useState, useEffect } from 'react';
import { toast } from '../utils/toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToasts) => {
      setToasts(newToasts);
    });

    return unsubscribe;
  }, []);

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${getToastColor(
            t.type
          )} text-white px-6 py-3 rounded-lg shadow-lg max-w-sm animate-fade-in`}
        >
          <div className="flex items-center justify-between gap-4">
            <p>{t.message}</p>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
