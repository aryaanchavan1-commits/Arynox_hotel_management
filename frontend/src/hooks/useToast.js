'use client';

import { toast as sonnerToast } from 'sonner';

function makeToast() {
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
  return toast;
}

export function useToast() {
  const toast = makeToast();
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