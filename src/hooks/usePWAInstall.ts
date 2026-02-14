import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const isDebugMode = localStorage.getItem("pwa_debug") === "true" || new URLSearchParams(window.location.search).has("pwa-test");
    
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log("appinstalled event fired");
      setIsPWAInstalled(true);
      setShowInstallPrompt(false);
      localStorage.setItem("pwa_installed", "true");
    };

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("App is in standalone mode");
      setIsPWAInstalled(true);
    }
    if (localStorage.getItem("pwa_installed") === "true") {
      console.log("PWA already marked as installed in localStorage");
      setIsPWAInstalled(true);
    }

    // For testing/development: allow showing prompt without beforeinstallprompt event
    if (isDebugMode) {
      console.log("PWA Debug mode enabled - will show install prompt");
      setShowInstallPrompt(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // In debug mode or if beforeinstallprompt didn't fire, treat as installed
      if (localStorage.getItem("pwa_debug") === "true" || new URLSearchParams(window.location.search).has("pwa-test")) {
        console.log("Debug mode: simulating PWA installation");
        setIsPWAInstalled(true);
        localStorage.setItem("pwa_installed", "true");
        setShowInstallPrompt(false);
      }
      return;
    }
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsPWAInstalled(true);
        localStorage.setItem("pwa_installed", "true");
        setShowInstallPrompt(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error installing PWA:", error);
    }
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("pwa_install_dismissed", "true");
  };

  return {
    deferredPrompt,
    isPWAInstalled,
    showInstallPrompt,
    installApp,
    dismissPrompt,
  };
};
