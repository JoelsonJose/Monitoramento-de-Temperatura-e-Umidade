import { useCallback, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import LoginView from './components/LoginView.jsx';
import { NoticeProvider } from './components/Notice.jsx';

const TOKEN_KEY = 'manga-trace-token';

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');

  const enter = useCallback((nextToken) => {
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }, []);

  const leave = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
  }, []);

  return (
    <NoticeProvider>
      {token ? <AppShell token={token} onLogout={leave} /> : <LoginView onAuthenticated={enter} />}
    </NoticeProvider>
  );
}
