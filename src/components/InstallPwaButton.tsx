"use client";

import React, { useEffect, useState } from "react";
import { Check, Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaButton({
  label = "Install App",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) {
      setInstalled(true);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowGuide(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    setShowGuide(true);
  }

  return (
    <>
      <button
        onClick={() => void handleClick()}
        disabled={installed}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
          installed
            ? "bg-[#051a0c] border border-[#15803d] text-[#4ade80] cursor-default"
            : "bg-[#d97706] text-black hover:bg-[#f59e0b] active:scale-[0.99]"
        } ${className}`}
      >
        {installed ? (
          <>
            <Check className="w-4 h-4" />
            <span>Installed</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>{label}</span>
          </>
        )}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0a0a0a] border border-[#261e1a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#d4a373]">
                Install NeuroCalm App
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-[#78716c] hover:text-[#e7d8c9]"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIos ? (
              <ol className="space-y-2.5 text-xs text-[#a8a29e]">
                <li className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#14110f] text-[#d97706] font-semibold">
                    1
                  </span>
                  <span>
                    Tap the <strong className="text-[#e7d8c9]">Share</strong>{" "}
                    icon <Share className="w-3.5 h-3.5 inline text-[#d97706]" />{" "}
                    at the bottom of Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#14110f] text-[#d97706] font-semibold">
                    2
                  </span>
                  <span>
                    Scroll down and tap{" "}
                    <strong className="text-[#e7d8c9]">
                      Add to Home Screen
                    </strong>
                    .
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-2 text-xs text-[#a8a29e]">
                <p>
                  Click the <strong className="text-[#e7d8c9]">Install</strong>{" "}
                  icon in your browser&apos;s address bar (top right) or open
                  the browser menu and select{" "}
                  <strong className="text-[#e7d8c9]">
                    Install NeuroCalm
                  </strong>
                  .
                </p>
                <p className="text-[11px] text-[#78716c]">
                  Works 100% offline in standalone Blackout mode once installed.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#14110f] border border-[#261e1a] text-xs font-medium text-[#d4a373] hover:border-[#d97706]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
