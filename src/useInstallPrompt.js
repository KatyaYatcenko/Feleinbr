import { useEffect, useState } from 'react';

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Перевіряємо, чи застосунок уже відкритий як встановлений PWA
    function checkInstalled() {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches;

      const iosStandalone =
        window.navigator.standalone === true;

      setIsInstalled(standalone || iosStandalone);
    }

    checkInstalled();

    // Chrome / Android / Edge / інші браузери
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    // Користувач встановив застосунок
    function handleAppInstalled() {
      setPromptEvent(null);
      setIsInstalled(true);
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );
    };
  }, []);

  const promptInstall = async () => {
    if (!promptEvent) return null;

    promptEvent.prompt();

    const choiceResult =
      await promptEvent.userChoice;

    setPromptEvent(null);

    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
    }

    return choiceResult;
  };

  return {
    promptEvent,
    promptInstall,
    isInstalled,
  };
}