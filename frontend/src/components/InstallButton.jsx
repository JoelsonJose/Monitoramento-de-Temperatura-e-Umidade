import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    function onPrompt(event) {
      event.preventDefault();
      setPrompt(event);
    }
    function onInstalled() {
      setPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <button
      className="text-button"
      type="button"
      onClick={async () => {
        await prompt.prompt();
        setPrompt(null);
      }}
    >
      Instalar
    </button>
  );
}
