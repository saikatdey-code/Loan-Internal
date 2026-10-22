import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {Toast, ToastOptions, ToastType} from './Toast';

interface ToastContextType {
  showToast: (
    messageOrOptions: string | ToastOptions,
    type?: ToastType,
    duration?: number,
  ) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Imperative Controller for global calls outside React hooks ───
type ToastListener = (options: ToastOptions | null) => void;
let globalToastListener: ToastListener | null = null;

export const ToastService = {
  show: (
    messageOrOptions: string | ToastOptions,
    type: ToastType = 'info',
    duration = 3500,
  ) => {
    const options: ToastOptions =
      typeof messageOrOptions === 'string'
        ? {message: messageOrOptions, type, duration}
        : {duration: 3500, ...messageOrOptions};

    if (globalToastListener) {
      globalToastListener(options);
    }
  },
  success: (message: string, duration = 3500) => {
    ToastService.show(message, 'success', duration);
  },
  error: (message: string, duration = 3500) => {
    ToastService.show(message, 'error', duration);
  },
  info: (message: string, duration = 3500) => {
    ToastService.show(message, 'info', duration);
  },
  warning: (message: string, duration = 3500) => {
    ToastService.show(message, 'warning', duration);
  },
  hide: () => {
    if (globalToastListener) {
      globalToastListener(null);
    }
  },
};

export const ToastProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const toastKeyRef = useRef(0);

  // Register imperative listener
  React.useEffect(() => {
    globalToastListener = (options: ToastOptions | null) => {
      if (options) {
        toastKeyRef.current += 1;
        setCurrentToast({...options, id: `toast-${toastKeyRef.current}`});
      } else {
        setCurrentToast(null);
      }
    };
    return () => {
      globalToastListener = null;
    };
  }, []);

  const hideToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const showToast = useCallback(
    (
      messageOrOptions: string | ToastOptions,
      type: ToastType = 'info',
      duration = 3500,
    ) => {
      toastKeyRef.current += 1;
      if (typeof messageOrOptions === 'string') {
        setCurrentToast({
          id: `toast-${toastKeyRef.current}`,
          message: messageOrOptions,
          type,
          duration,
        });
      } else {
        setCurrentToast({
          id: `toast-${toastKeyRef.current}`,
          duration: 3500,
          ...messageOrOptions,
        });
      }
    },
    [],
  );

  const success = useCallback(
    (message: string, duration = 3500) => {
      showToast(message, 'success', duration);
    },
    [showToast],
  );

  const error = useCallback(
    (message: string, duration = 3500) => {
      showToast(message, 'error', duration);
    },
    [showToast],
  );

  const info = useCallback(
    (message: string, duration = 3500) => {
      showToast(message, 'info', duration);
    },
    [showToast],
  );

  const warning = useCallback(
    (message: string, duration = 3500) => {
      showToast(message, 'warning', duration);
    },
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{showToast, success, error, info, warning, hideToast}}>
      {children}
      {currentToast && (
        <Toast
          key={currentToast.id}
          {...currentToast}
          onDismiss={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // If used outside provider, fallback to imperative service
    return {
      showToast: ToastService.show,
      success: ToastService.success,
      error: ToastService.error,
      info: ToastService.info,
      warning: ToastService.warning,
      hideToast: ToastService.hide,
    };
  }
  return context;
};
