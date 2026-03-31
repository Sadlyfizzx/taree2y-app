import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedToasts({ durationMs = 4000 } = {}) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timersRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id) => {
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
    setToasts((currentValue) => currentValue.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((currentValue) => [...currentValue, { id, msg, type }]);

    const timerId = window.setTimeout(() => {
      dismissToast(id);
    }, durationMs);

    timersRef.current.set(id, timerId);
    return id;
  }, [dismissToast, durationMs]);

  return {
    toasts,
    showToast,
    dismissToast,
  };
}

export default useTimedToasts;
