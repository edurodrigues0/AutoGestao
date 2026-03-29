import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = () => {
    const ua = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  };

  const isInStandaloneMode = () =>
    "standalone" in window.navigator && window.navigator.standalone;

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;
    if (isInStandaloneMode()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // iOS - Show instructions since no beforeinstallprompt
    if (isIOS()) {
      setShowIOSBanner(true);
      return;
    }

    // Android/Chrome - Listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroidBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowAndroidBanner(false);
    setShowIOSBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (dismissed) return null;

  // Android install banner
  if (showAndroidBanner && deferredPrompt) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-600 shadow-2xl animate-slide-up"
        data-testid="pwa-android-banner"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <img src="/icon-192x192.png" alt="AutoGestão" className="w-10 h-10 rounded-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Instalar AutoGestão</p>
            <p className="text-xs text-slate-500">Adicione à tela inicial para acesso rápido</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-fast"
              data-testid="pwa-install-btn"
            >
              <Download size={14} />
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              data-testid="pwa-dismiss-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS instructions banner
  if (showIOSBanner) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-600 shadow-2xl animate-slide-up"
        data-testid="pwa-ios-banner"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <img src="/icon-192x192.png" alt="AutoGestão" className="w-9 h-9 rounded-xl" />
              <div>
                <p className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Instalar AutoGestão</p>
                <p className="text-xs text-slate-500">Adicione à tela inicial do iPhone</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-600" data-testid="pwa-ios-dismiss">
              <X size={18} />
            </button>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">Como instalar no iPhone/iPad:</p>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <span className="bg-blue-100 rounded px-1.5 py-0.5 font-semibold">1</span>
              <span>Toque em</span>
              <Share size={14} className="text-blue-600" />
              <span className="font-semibold">"Compartilhar"</span>
              <span>no Safari</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 mt-1">
              <span className="bg-blue-100 rounded px-1.5 py-0.5 font-semibold">2</span>
              <span>Selecione <strong>"Adicionar à Tela de Início"</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
