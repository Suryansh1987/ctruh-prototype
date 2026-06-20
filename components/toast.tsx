"use client";

import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";

export type ToastVariant = "error" | "success" | "info";

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  leaving?: boolean;
}

const ICONS: Record<ToastVariant, string> = {
  error: "✕",
  success: "✓",
  info: "i",
};

const DURATION = 4500;

interface ToastContextValue {
  toast: (title: string, message?: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    const remove = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, 200);
    timers.current.set(`${id}-remove`, remove);
  }, []);

  const toast = useCallback(
    (title: string, message?: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, title, message, variant }]);
      const timer = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="xr-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`xr-toast xr-toast--${t.variant}${t.leaving ? " is-leaving" : ""}`}
            role="alert"
          >
            <span className="xr-toast-icon">{ICONS[t.variant]}</span>
            <div className="xr-toast-body">
              <div className="xr-toast-title">{t.title}</div>
              {t.message && <div className="xr-toast-message">{t.message}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, padding: "0 0 0 8px", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
