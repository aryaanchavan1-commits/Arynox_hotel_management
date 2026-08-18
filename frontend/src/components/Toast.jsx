'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

const ToastCtx = createContext(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (ctx) return ctx;
  const toast = (message, type = 'default') => {
    if (type === 'destructive') return sonnerToast.error(message);
    if (type === 'success') return sonnerToast.success(message);
    return sonnerToast(message);
  };
  toast.success = (message, options) => sonnerToast.success(message, options);
  toast.error = (message, options) => sonnerToast.error(message, options);
  toast.info = (message, options) => sonnerToast.info(message, options);
  toast.loading = (message, options) => sonnerToast.loading(message, options);
  toast.dismiss = (id) => sonnerToast.dismiss(id);
  toast.promise = sonnerToast.promise;
  return {
    toast,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    loading: toast.loading,
    dismiss: toast.dismiss,
    promise: toast.promise,
  };
}

export function ToastProvider({ children }) {
  const push = useCallback((message, type = 'default') => {
    if (type === 'destructive') return sonnerToast.error(message);
    if (type === 'success') return sonnerToast.success(message);
    return sonnerToast(message);
  }, []);

  push.success = (message, options) => sonnerToast.success(message, options);
  push.error = (message, options) => sonnerToast.error(message, options);
  push.info = (message, options) => sonnerToast.info(message, options);
  push.loading = (message, options) => sonnerToast.loading(message, options);
  push.dismiss = (id) => sonnerToast.dismiss(id);
  push.promise = sonnerToast.promise;

  const value = {
    toast: push,
    success: push.success,
    error: push.error,
    info: push.info,
    loading: push.loading,
    dismiss: push.dismiss,
    promise: push.promise,
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
    </ToastCtx.Provider>
  );
}