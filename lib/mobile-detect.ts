// Mobile detection utilities

export const MOBILE_BREAKPOINT = 768;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check screen width
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    return true;
  }

  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry',
    'windows phone', 'opera mini', 'mobile', 'tablet'
  ];

  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Also check for touch support and small screen
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;

  return isMobileUA || (hasTouchScreen && hasSmallScreen);
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  // Tablets typically have screen width between 600px and 1024px
  const isTabletSize = width >= 600 && width < 1024;

  // Check for tablet in user agent
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(userAgent);

  return isTabletSize || isTabletUA;
}

export function isMobileSafari(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && /applewebkit/.test(userAgent) && !/edge/.test(userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return /android/.test(navigator.userAgent.toLowerCase());
}

export function supportsPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'serviceWorker' in navigator && 'standalone' in navigator;
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches ||
         (navigator as any).standalone === true;
}

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isStandalone: false,
      supportsPWA: false,
      os: 'unknown',
      browser: 'unknown',
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  const height = window.innerHeight;

  let os = 'unknown';
  if (/iphone|ipad|ipod/.test(userAgent)) {
    os = 'ios';
  } else if (/android/.test(userAgent)) {
    os = 'android';
  } else if (/windows/.test(userAgent)) {
    os = 'windows';
  } else if (/mac/.test(userAgent)) {
    os = 'macos';
  } else if (/linux/.test(userAgent)) {
    os = 'linux';
  }

  let browser = 'unknown';
  if (/edge/.test(userAgent)) {
    browser = 'edge';
  } else if (/chrome/.test(userAgent)) {
    browser = 'chrome';
  } else if (/safari/.test(userAgent)) {
    browser = 'safari';
  } else if (/firefox/.test(userAgent)) {
    browser = 'firefox';
  } else if (/opera/.test(userAgent)) {
    browser = 'opera';
  }

  return {
    isMobile: isMobileDevice(),
    isTablet: isTablet(),
    isDesktop: !isMobileDevice() && !isTablet(),
    isStandalone: isStandaloneMode(),
    supportsPWA: supportsPWA(),
    os,
    browser,
    screenWidth: width,
    screenHeight: height,
    userAgent: navigator.userAgent,
  };
}
