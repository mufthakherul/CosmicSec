import { useCallback, useEffect, useMemo, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

function detectStandaloneMode() {
  const supportsMatchMedia = typeof window.matchMedia === "function";
  return (
    (supportsMatchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePWA() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(detectStandaloneMode());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(installEvent) && !isInstalled,
    [installEvent, isInstalled],
  );

  const promptInstall = useCallback(async () => {
    if (!installEvent) {
      return false;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    const accepted = choice.outcome === "accepted";
    if (accepted) {
      setIsInstalled(true);
    }
    setInstallEvent(null);
    return accepted;
  }, [installEvent]);

  return {
    canInstall,
    isInstalled,
    promptInstall,
  };
}
