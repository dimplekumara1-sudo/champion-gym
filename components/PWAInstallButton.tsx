import React, { useState, useEffect, useCallback } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallButtonProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  showText = true, 
  compact = false 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  // Detect if app is running as PWA
  useEffect(() => {
    const checkPWAStatus = () => {
      const isStandalone = 
        (window.matchMedia('(display-mode: standalone)').matches) ||
        ('standalone' in window && (window as any).standalone === true) ||
        (navigator as any).standalone === true ||
        (document.referrer.includes('android-app://'));

      // Check iOS specific indicators
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      const isInIOSApp = isIOS && !(/Safari/.test(navigator.userAgent));

      setIsInstalled(isStandalone || isInIOSApp);
      
      // Show install button if not installed and prompt available
      if (!isStandalone && !isInIOSApp) {
        setIsInstallable(true);
      }
    };

    checkPWAStatus();
    
    // Recheck on focus and resize
    const handleFocus = () => checkPWAStatus();
    const handleResize = () => checkPWAStatus();
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 PWA Install prompt detected');
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;
    
    setIsInstalling(true);
    
    try {
      // Native install prompt (Chrome/Edge)
      if (deferredPrompt) {
        console.log('📥 Showing native PWA install prompt');
        await deferredPrompt.prompt();
        
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted PWA install');
          setIsInstalled(true);
          setIsInstallable(false);
          localStorage.setItem('pwa-install-completed', Date.now().toString());
        } else {
          console.log('❌ User dismissed PWA install');
          localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        }
        
        setDeferredPrompt(null);
      } else {
        // Fallback to manual install instructions
        console.log('📋 Showing manual install instructions');
        showInstallInstructions();
      }
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const showInstallInstructions = () => {
    // Simplified install instructions - just redirect to browser install flow
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS: Try to trigger the install prompt directly
      if (deferredPrompt) {
        handleInstallClick();
      } else {
        // Simple alert for iOS
        alert('To install PowerFlex:\n\n1. Open this page in Safari browser\n2. Tap Share button (⎋)\n3. Scroll down and tap "Add to Home Screen"\n4. Tap "Add" to complete');
      }
    } else if (isAndroid) {
      // Android: Try to trigger the install prompt directly
      if (deferredPrompt) {
        handleInstallClick();
      } else {
        // Simple alert for Android
        alert('To install PowerFlex:\n\n1. Tap Menu (⋮) in Chrome\n2. Tap "Install app" or "Add to Home screen"\n3. Tap "Add" to install');
      }
    } else {
      // Desktop: Simple alert
      alert('Look for the install icon (⬇) in your browser\'s address bar and click it to add PowerFlex to your device.');
    }
  };

  // Don't show if app is already installed
  if (isInstalled) {
    return null;
  }

  // Compact version (floating install button)
  if (compact) {
    return (
      <button
        onClick={handleInstallClick}
        className={`fixed bottom-6 right-6 z-50 bg-primary text-slate-900 font-bold px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all active:scale-95 flex items-center gap-2 ${className} ${
          isInstalling ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={isInstalling}
      >
        {isInstalling ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Installing...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-rounded text-lg">install_mobile</span>
            <span>{showText ? 'Install App' : ''}</span>
          </>
        )}
      </button>
    );
  }

  // Standard install button
  return (
    <button
      onClick={handleInstallClick}
      className={`bg-primary text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${className} ${
        isInstalling ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <>
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span>Installing...</span>
        </>
      ) : (
        <>
          <span className="material-symbols-rounded text-lg">download</span>
          <span>Install PowerFlex App</span>
          {isInstallable && (
            <span className="text-xs bg-slate-800 px-2 py-1 rounded-full ml-2">
              Available
            </span>
          )}
        </>
      )}
    </button>
  );
};

// Hook for checking PWA install status
export const usePWAInstallStatus = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    
    // Detect platform
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if PWA is installed
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const hasStandalone = 'standalone' in window && (window as any).standalone === true;
    const hasNavigatorStandalone = (navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    
    const isStandalone = isFullscreen || isStandaloneMode || hasStandalone || hasNavigatorStandalone || isAndroidApp;

    setIsInstalled(isStandalone);
    
    // Check if install prompt is available
    setIsInstallable(!isStandalone);
  }, []);

  return { isInstallable, isInstalled, platform };
};

export default PWAInstallButton;