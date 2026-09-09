import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    if (!message) return;
    const msgStr = String(message).trim();
    const id = `${Date.now()}_${Math.random()}`;

    setToasts((prev) => {
      // Prevent duplicate identical toast from showing at the same time
      if (prev.some((t) => t.message === msgStr)) {
        return prev;
      }
      return [...prev, { id, message: msgStr, type }];
    });

    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id && toast.message !== msgStr));
      }, duration);
    }
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-300 ease-out animate-toast-slide-in flex items-center gap-3 min-w-[260px] max-w-sm w-full bg-white text-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dd-toast-container"
          >
            {/* Icon based on type */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${toast.type === 'error' ? 'bg-red-100 text-red-600' : toast.type === 'info' ? 'bg-purple-100 text-[#702c91]' : 'bg-green-100 text-green-600'}`}>
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
              </span>
            </div>
            
            {/* Message */}
            <div className="flex-1">
              <p className="text-[13px] font-bold mb-0.5 capitalize text-gray-900">
                {toast.type === 'error' ? 'Error' : toast.type === 'info' ? 'Notification' : 'Success'}
              </p>
              <p className="text-[12px] text-gray-600 break-words leading-tight">
                {toast.message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 bg-transparent border-none cursor-pointer flex items-center justify-center rounded-full hover:bg-gray-100"
              title="Close notification"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
