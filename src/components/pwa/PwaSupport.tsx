'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'kortaz-pwa-install-dismissed';

export function PwaSupport() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso caso o navegador bloqueie SW em modo anônimo
      });
    }

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone || wasDismissed) {
      setDismissed(true);
      return;
    }

    setDismissed(false);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    if (isIos && isSafari) {
      setShowIosHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  function handleDismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosHint(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      handleDismiss();
    } else {
      setDeferredPrompt(null);
    }
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) {
    return null;
  }

  return (
    <div className="no-print fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-[#D99A4E]/40 bg-[#151515]/95 p-3.5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#292521] bg-[#090909]">
            <span className="font-display text-lg font-extrabold text-[#D99A4E]">K</span>
          </div>
          <div className="text-xs">
            <p className="font-display font-bold text-[#F5F1EB]">Instalar App Kortaz</p>
            {deferredPrompt ? (
              <p className="mt-0.5 text-[11px] text-[#A5A09A]">
                Acesse mais rápido direto da tela inicial do seu aparelho.
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-[#A5A09A]">
                Toque em <Share className="inline h-3 w-3 text-[#D99A4E]" /> e depois em{' '}
                <strong className="text-[#F5F1EB]">Adicionar à Tela de Início</strong>.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso de instalação"
          className="rounded-lg p-1 text-[#A5A09A] hover:text-[#F5F1EB]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {deferredPrompt && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#A5A09A] hover:text-[#F5F1EB]"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D99A4E] px-3.5 py-1.5 text-[11px] font-bold text-[#090909] hover:bg-[#F2B968]"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar agora
          </button>
        </div>
      )}
    </div>
  );
}
