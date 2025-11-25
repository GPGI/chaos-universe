import { useEffect, useState, useCallback } from 'react';

export interface ScreenSize {
  width: number;
  height: number;
  aspectRatio: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isUltraWide: boolean;
  orientation: 'portrait' | 'landscape';
}

export interface AutoscaleConfig {
  // Camera settings
  baseFOV?: number;
  mobileFOV?: number;
  tabletFOV?: number;
  desktopFOV?: number;
  
  // Camera distance adjustments
  mobileDistance?: number;
  tabletDistance?: number;
  desktopDistance?: number;
  
  // Pixel ratio limits
  maxPixelRatio?: number;
  mobilePixelRatio?: number;
  
  // Performance settings
  reduceParticlesOnMobile?: boolean;
  particleReductionFactor?: number;
}

const DEFAULT_CONFIG: Required<AutoscaleConfig> = {
  baseFOV: 75,
  mobileFOV: 70,
  tabletFOV: 72,
  desktopFOV: 75,
  mobileDistance: 1.2,
  tabletDistance: 1.0,
  desktopDistance: 1.0,
  maxPixelRatio: 2,
  mobilePixelRatio: 1.5,
  reduceParticlesOnMobile: true,
  particleReductionFactor: 0.5,
};

// Breakpoints
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_BREAKPOINT = 1440;
const LARGE_DESKTOP_BREAKPOINT = 1920;

export function useAutoscale(config: AutoscaleConfig = {}) {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: true,
        isUltraWide: false,
        orientation: 'landscape',
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    
    return {
      width,
      height,
      aspectRatio,
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT,
      isLargeDesktop: width >= DESKTOP_BREAKPOINT && width < LARGE_DESKTOP_BREAKPOINT,
      isUltraWide: width >= LARGE_DESKTOP_BREAKPOINT,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  });

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const updateScreenSize = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    
    setScreenSize({
      width,
      height,
      aspectRatio,
      isMobile: width < MOBILE_BREAKPOINT,
      isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT,
      isLargeDesktop: width >= DESKTOP_BREAKPOINT && width < LARGE_DESKTOP_BREAKPOINT,
      isUltraWide: width >= LARGE_DESKTOP_BREAKPOINT,
      orientation: width > height ? 'landscape' : 'portrait',
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    updateScreenSize();
    
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateScreenSize, 150);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Also listen to media query changes for better accuracy
    const mediaQueries = [
      window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`),
      window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`),
      window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`),
    ];
    
    mediaQueries.forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', handleResize);
      } else {
        // Fallback for older browsers
        mq.addListener(handleResize);
      }
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleResize);
        } else {
          mq.removeListener(handleResize);
        }
      });
      clearTimeout(resizeTimeout);
    };
  }, [updateScreenSize]);

  // Calculate FOV based on screen size
  const getFOV = useCallback((): number => {
    if (screenSize.isMobile) return mergedConfig.mobileFOV;
    if (screenSize.isTablet) return mergedConfig.tabletFOV;
    if (screenSize.isDesktop || screenSize.isLargeDesktop || screenSize.isUltraWide) {
      return mergedConfig.desktopFOV;
    }
    return mergedConfig.baseFOV;
  }, [screenSize, mergedConfig]);

  // Calculate pixel ratio based on screen size
  const getPixelRatio = useCallback((): number => {
    if (typeof window === 'undefined') return 1;
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    if (screenSize.isMobile) {
      return Math.min(devicePixelRatio, mergedConfig.mobilePixelRatio);
    }
    
    return Math.min(devicePixelRatio, mergedConfig.maxPixelRatio);
  }, [screenSize, mergedConfig]);

  // Calculate camera distance multiplier
  const getDistanceMultiplier = useCallback((): number => {
    if (screenSize.isMobile) return mergedConfig.mobileDistance;
    if (screenSize.isTablet) return mergedConfig.tabletDistance;
    return mergedConfig.desktopDistance;
  }, [screenSize, mergedConfig]);

  // Get particle count multiplier (for performance)
  const getParticleMultiplier = useCallback((): number => {
    if (mergedConfig.reduceParticlesOnMobile && screenSize.isMobile) {
      return mergedConfig.particleReductionFactor;
    }
    return 1.0;
  }, [screenSize, mergedConfig]);

  // Check if should use reduced quality settings
  const shouldReduceQuality = useCallback((): boolean => {
    return screenSize.isMobile || (screenSize.isTablet && screenSize.orientation === 'portrait');
  }, [screenSize]);

  return {
    screenSize,
    getFOV,
    getPixelRatio,
    getDistanceMultiplier,
    getParticleMultiplier,
    shouldReduceQuality,
    updateScreenSize,
  };
}

