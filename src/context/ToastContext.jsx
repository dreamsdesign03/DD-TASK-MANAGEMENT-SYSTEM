import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out animate-toast-slide-in flex items-center gap-3 min-w-[260px] max-w-sm w-full bg-surface-container-lowest text-on-surface p-4 rounded-xl shadow-lg border border-outline-variant/30 dd-toast-container`}
          >
            {/* Icon based on type */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${toast.type === 'error' ? 'bg-error/10 text-error' : toast.type === 'info' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-600'}`}>
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
              </span>
            </div>
            
            {/* Message */}
            <div className="flex-1">
              <p className="font-label-md text-label-md font-bold mb-0.5 capitalize">
                {toast.type === 'error' ? 'Error' : toast.type === 'info' ? 'Notification' : 'Success'}
              </p>
              <p className="text-body-sm text-secondary break-words">
                {toast.message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-secondary hover:text-on-surface transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
