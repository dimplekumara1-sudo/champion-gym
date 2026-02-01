import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull to refresh if we are at the top of the page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY;
        setIsPulling(true);
      } else {
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance
        const distance = Math.min(diff * 0.4, MAX_PULL);
        setPullDistance(distance);
        
        // Prevent default only when pulling down at the top
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;

      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      setIsPulling(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isPulling, isRefreshing, pullDistance, onRefresh]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-50"
        style={{ 
          top: -40,
          transform: `translateY(${pullDistance}px)`,
          opacity: pullDistance / PULL_THRESHOLD,
          transition: isRefreshing ? 'none' : 'transform 0.1s ease-out, opacity 0.1s ease-out'
        }}
      >
        <div className="bg-[#22C55E] p-2 rounded-full shadow-lg">
          <RefreshCw 
            className={`w-6 h-6 text-white ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      </div>

      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
        }}
        className="w-full h-full"
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
