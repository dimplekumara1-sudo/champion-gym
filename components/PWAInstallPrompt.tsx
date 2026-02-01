import React, { useState, useEffect, useCallback } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  onClose: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [userAgent, setUserAgent] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | null>(null);

  // Detect platform
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    setUserAgent(ua);
    
    // Detect platform
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  // Check if app is already installed
  const isAppInstalled = useCallback(() => {
    // Check if running in standalone mode
    const isStandalone = 
      (window.matchMedia('(display-mode: standalone)').matches) ||
      (window.matchMedia('(display-mode: fullscreen)').matches) ||
      ('standalone' in window && (window as any).standalone === true) ||
      (navigator as any).standalone === true;

    // Check iOS-specific indicators
    const isIOS = /iphone|ipad|ipod/.test(userAgent.toLowerCase());
    const isInIOSApp = isIOS && !(/Safari/.test(userAgent));

    return isStandalone || isInIOSApp;
  }, [userAgent]);

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

  // Check for deferred install reminder
  useEffect(() => {
    const checkInstallReminder = () => {
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      const lastPrompted = localStorage.getItem('pwa-install-prompted');
      
      if (lastDismissed) {
        const daysSinceDismissed = Math.floor(
          (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24)
        );
        
        // Show reminder after 15 days
        if (daysSinceDismissed >= 15 && !isAppInstalled()) {
          setShowInstructions(true);
          localStorage.setItem('pwa-install-prompted', Date.now().toString());
        }
      } else if (!lastPrompted && !isAppInstalled()) {
        // First time visitor
        setTimeout(() => {
          if (!isAppInstalled()) {
            setShowInstructions(true);
            localStorage.setItem('pwa-install-prompted', Date.now().toString());
          }
        }, 3000); // Show after 3 seconds
      }
    };

    checkInstallReminder();
  }, [isAppInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      console.log('📥 Showing PWA install prompt');
      await deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA install');
        localStorage.setItem('pwa-install-completed', Date.now().toString());
      } else {
        console.log('❌ User dismissed PWA install');
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      onClose();
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    console.log('👋 User dismissed install prompt');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowInstructions(false);
    setDeferredPrompt(null);
    setIsInstallable(false);
    onClose();
  };

  const handleLater = () => {
    console.log('⏰ User wants to install later');
    setShowInstructions(false);
    onClose();
  };

  // Don't show if app is already installed
  if (isAppInstalled()) {
    return null;
  }

  // Show native install prompt for Chrome/Edge
  if (deferredPrompt && isInstallable) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-rounded text-primary text-2xl">download</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Install PowerFlex</h3>
                <p className="text-sm text-slate-600">Get the full experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <span className="material-symbols-rounded text-slate-400">close</span>
            </button>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
              <span className="material-symbols-rounded text-primary">check_circle</span>
              <span className="text-sm text-slate-700">Works offline</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
              <span className="material-symbols-rounded text-primary">speed</span>
              <span className="text-sm text-slate-700">Faster loading</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
              <span className="material-symbols-rounded text-primary">notifications</span>
              <span className="text-sm text-slate-700">Push notifications</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-primary text-slate-900 font-bold py-4 rounded-2xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded">install_mobile</span>
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-6 py-4 text-slate-500 font-medium hover:text-slate-700 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show platform-specific instructions
  if (showInstructions && platform) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-rounded text-primary text-2xl">phone_android</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Install PowerFlex</h3>
                <p className="text-sm text-slate-600">
                  {platform === 'ios' ? 'on your iPhone/iPad' : 'on your device'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <span className="material-symbols-rounded text-slate-400">close</span>
            </button>
          </div>

          {platform === 'ios' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  <span className="font-bold">Safari Required:</span> Open this page in Safari to install
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Tap Share Button</p>
                    <p className="text-xs text-slate-600">In Safari, tap the share icon at the bottom</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Add to Home Screen</p>
                    <p className="text-xs text-slate-600">Scroll down and tap "Add to Home Screen"</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Confirm Install</p>
                    <p className="text-xs text-slate-600">Tap "Add" to complete installation</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {platform === 'android' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  <span className="font-bold">Chrome Browser:</span> Use Chrome for best experience
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Tap Menu Button</p>
                    <p className="text-xs text-slate-600">Tap the three dots (⋮) in Chrome</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Install App</p>
                    <p className="text-xs text-slate-600">Tap "Install app" or "Add to Home screen"</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Confirm Install</p>
                    <p className="text-xs text-slate-600">Tap "Add" to install on your home screen</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {platform === 'desktop' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                <p className="text-sm font-medium text-purple-800 mb-2">
                  <span className="font-bold">Desktop Installation:</span> Available on Chrome/Edge
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Look for Install Icon</p>
                    <p className="text-xs text-slate-600">Check the address bar for install button</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Click Install</p>
                    <p className="text-xs text-slate-600">Click the install button to add to desktop</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleLater}
              className="flex-1 bg-slate-100 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleDismiss}
              className="px-6 py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
            >
              Don't Show Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstallPrompt;