import { useState, useEffect, useCallback } from 'react';

interface FullscreenConfig {
  isFullscreen: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  orientation: 'portrait' | 'landscape' | 'any';
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

export const useFullscreen = () => {
  const [fullscreenConfig, setFullscreenConfig] = useState<FullscreenConfig>({
    isFullscreen: false,
    isPWA: false,
    isStandalone: false,
    orientation: 'any',
    platform: 'unknown'
  });

  const updateFullscreenState = useCallback(() => {
    const ua = navigator.userAgent;
    
    // Detect platform
    let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';
    if (/iPhone|iPad|iPod/.test(ua)) {
      platform = 'ios';
    } else if (/Android/.test(ua)) {
      platform = 'android';
    } else if (/Win|Mac|Linux/.test(ua)) {
      platform = 'desktop';
    }

    // Check fullscreen status with multiple detection methods
    const isFullscreen = Boolean(
      (document as any).fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      (document as any).webkitIsFullScreen ||
      (document as any).mozFullScreen ||
      document.fullscreen
    );

    // Check PWA/standalone mode
    const isPWA = Boolean(
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window && (window as any).standalone === true) ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );

    const isStandalone = Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window && (window as any).standalone === true) ||
      (navigator as any).standalone === true
    );

    // Detect orientation
    const orientation = screen.orientation?.type?.includes('portrait') ? 'portrait' :
                       screen.orientation?.type?.includes('landscape') ? 'landscape' : 'any';

    setFullscreenConfig({
      isFullscreen,
      isPWA,
      isStandalone,
      orientation,
      platform
    });
  }, []);

  useEffect(() => {
    updateFullscreenState();

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      updateFullscreenState();
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      updateFullscreenState();
    };

    // Listen for PWA display mode changes
    const handleDisplayModeChange = () => {
      updateFullscreenState();
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    window.addEventListener('orientationchange', handleOrientationChange);
    screen.orientation?.addEventListener('change', handleOrientationChange);
    
    window.addEventListener('resize', handleOrientationChange);
    window.matchMedia('(display-mode: fullscreen)').addEventListener('change', handleDisplayModeChange);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    return () => {
      // Cleanup event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      window.removeEventListener('orientationchange', handleOrientationChange);
      screen.orientation?.removeEventListener('change', handleOrientationChange);
      
      window.removeEventListener('resize', handleOrientationChange);
      window.matchMedia('(display-mode: fullscreen)').removeEventListener('change', handleDisplayModeChange);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, [updateFullscreenState]);

  return fullscreenConfig;
};

// Function to toggle fullscreen mode
export const toggleFullscreen = () => {
  const elem = document.documentElement;
  
  if (!document.fullscreenElement) {
    // Enter fullscreen
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) {
      (elem as any).mozRequestFullScreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
};

// Function to check if fullscreen is supported
export const isFullscreenSupported = (): boolean => {
  return !!(
    (document as any).fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
};

// Custom hook for managing fullscreen state
export const useFullscreenManager = () => {
  const { isFullscreen, isPWA, platform } = useFullscreen();
  
  const enterFullscreen = () => {
    toggleFullscreen();
  };
  
  const exitFullscreen = () => {
    toggleFullscreen();
  };
  
  return {
    isFullscreen,
    isPWA,
    isFullscreenSupported: isFullscreenSupported(),
    canEnterFullscreen: !isFullscreen && isFullscreenSupported(),
    enterFullscreen,
    exitFullscreen,
    platform
  };
};