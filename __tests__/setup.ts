import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/dom';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// ============================================
// MOCK localStorage
// ============================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ============================================
// MOCK next/navigation
// ============================================

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// ============================================
// MOCK next/image
// ============================================

vi.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: { src?: string; alt?: string; fill?: boolean; [key: string]: unknown }) {
    return null;
  },
}));

// ============================================
// MOCK recharts (ResizeObserver issue)
// ============================================

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: unknown }) => children,
  LineChart: ({ children }: { children: unknown }) => children,
  BarChart: ({ children }: { children: unknown }) => children,
  PieChart: ({ children }: { children: unknown }) => children,
  AreaChart: ({ children }: { children: unknown }) => children,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Area: () => null,
}));

// ============================================
// MOCK @zxing/library (camera APIs)
// ============================================

vi.mock('@zxing/library', () => ({
  BrowserQRCodeReader: vi.fn().mockImplementation(() => ({
    decodeFromInputDevice: vi.fn().mockResolvedValue({ getText: () => 'MOCK-QR-CODE' }),
    decodeFromVideoDevice: vi.fn().mockResolvedValue({ getText: () => 'MOCK-QR-CODE' }),
    stopAsyncDecode: vi.fn(),
  })),
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromInputDevice: vi.fn().mockResolvedValue({ getText: () => 'MOCK-QR-CODE' }),
    decodeFromVideoDevice: vi.fn().mockResolvedValue({ getText: () => 'MOCK-QR-CODE' }),
    stopAsyncDecode: vi.fn(),
  })),
}));

// ============================================
// MOCK ResizeObserver
// ============================================

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock;

// ============================================
// MOCK IntersectionObserver
// ============================================

class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// ============================================
// MOCK matchMedia
// ============================================

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================
// MOCK window.scrollTo
// ============================================

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// ============================================
// MOCK crypto.randomUUID
// ============================================

if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  });
}
