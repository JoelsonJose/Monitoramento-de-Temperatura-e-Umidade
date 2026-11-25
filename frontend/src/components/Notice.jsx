import { createContext, useCallback, useContext, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';

const NoticeContext = createContext(() => {});

export function useNotice() {
  return useContext(NoticeContext);
}

export function NoticeProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, isError = false) => {
    if (!message) return;
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, isError }]);
  }, []);

  return (
    <NoticeContext.Provider value={notify}>
      <Toast.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            className={toast.isError ? 'toast error' : 'toast'}
            onOpenChange={(open) => {
              if (!open) setToasts((current) => current.filter((item) => item.id !== toast.id));
            }}
          >
            <Toast.Description>{toast.message}</Toast.Description>
          </Toast.Root>
        ))}
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </NoticeContext.Provider>
  );
}
