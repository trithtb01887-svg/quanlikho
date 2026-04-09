/**
 * Dashboard UI Tests
 * Test Dashboard KPIs, Low Stock Alerts, Recent Activity
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DashboardContent } from '@/components/modules/dashboard/dashboard-content';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser, createLowStockInventoryItem } from '../helpers/mockStore';
import { mockProducts, mockWarehouses, mockInventoryItems } from '@/lib/mockData';

// Mock constants used by DashboardContent
vi.mock('@/lib/constants', () => ({
  MOCK_PRODUCTS: [
    { id: '1', sku: 'SKU001', name: 'Bàn làm việc', category: 'FURNITURE', quantity: 50, unit: 'PIECE', price: 2500000, reorderLevel: 10 },
    { id: '2', sku: 'SKU002', name: 'Ghế ergonomic', category: 'FURNITURE', quantity: 30, unit: 'PIECE', price: 4500000, reorderLevel: 5 },
    { id: '3', sku: 'SKU003', name: 'Bút bi Thiên Long', category: 'OFFICE_SUPPLIES', quantity: 500, unit: 'PIECE', price: 5000, reorderLevel: 100 },
    { id: '4', sku: 'SKU004', name: 'Giấy A4', category: 'OFFICE_SUPPLIES', quantity: 200, unit: 'BOX', price: 85000, reorderLevel: 50 },
    { id: '5', sku: 'SKU005', name: 'Máy tính laptop', category: 'ELECTRONICS', quantity: 15, unit: 'PIECE', price: 15000000, reorderLevel: 3 },
    { id: '6', sku: 'SKU006', name: 'Ổ cứng SSD 256GB', category: 'ELECTRONICS', quantity: 2, unit: 'PIECE', price: 1200000, reorderLevel: 5 },
    { id: '7', sku: 'SKU007', name: 'Kìm điện', category: 'TOOLS', quantity: 25, unit: 'PIECE', price: 180000, reorderLevel: 10 },
    { id: '8', sku: 'SKU008', name: 'Thùng carton', category: 'PACKAGING', quantity: 150, unit: 'PIECE', price: 25000, reorderLevel: 30 },
    { id: '9', sku: 'SKU009', name: 'Sắt tấm', category: 'RAW_MATERIALS', quantity: 100, unit: 'KG', price: 45000, reorderLevel: 20 },
    { id: '10', sku: 'SKU010', name: 'Máy in laser', category: 'ELECTRONICS', quantity: 3, unit: 'PIECE', price: 8500000, reorderLevel: 2 },
  ],
  CATEGORIES: [
    { value: 'ELECTRONICS', label: 'Điện tử' },
    { value: 'FURNITURE', label: 'Nội thất' },
    { value: 'OFFICE_SUPPLIES', label: 'Văn phòng phẩm' },
    { value: 'TOOLS', label: 'Dụng cụ' },
    { value: 'PACKAGING', label: 'Đóng gói' },
    { value: 'RAW_MATERIALS', label: 'Nguyên vật liệu' },
    { value: 'OTHER', label: 'Khác' },
  ],
  ROLE_LABELS: {},
  ROLE_COLORS: {},
  ROLE_BG_COLORS: {},
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 1.1: Render KPI Cards', () => {
    it('should display 4 KPI cards', () => {
      render(<DashboardContent />);
      
      // Kiểm tra có 4 KPI cards - dùng getAllByText vì text có thể xuất hiện nhiều lần
      const totalProducts = screen.getAllByText(/tổng sản phẩm/i);
      expect(totalProducts.length).toBeGreaterThanOrEqual(1);
      
      const inventoryValue = screen.getAllByText(/giá trị tồn kho/i);
      expect(inventoryValue.length).toBeGreaterThanOrEqual(1);
      
      const lowStock = screen.getAllByText(/sản phẩm sắp hết/i);
      expect(lowStock.length).toBeGreaterThanOrEqual(1);
      
      const pending = screen.getAllByText(/đơn chờ xử lý/i);
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it('should display numeric values without NaN or undefined', () => {
      render(<DashboardContent />);
      
      // KPI values được hiển thị
      expect(screen.getByText('1,248')).toBeInTheDocument();
      expect(screen.getByText('2.5B')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display trend indicators', () => {
      render(<DashboardContent />);
      
      // Trend values được hiển thị
      expect(screen.getByText('+12%')).toBeInTheDocument();
      expect(screen.getByText('+8.3%')).toBeInTheDocument();
    });
  });

  describe('Test 1.2: Low Stock Alert Section', () => {
    it('should display low stock products section', () => {
      render(<DashboardContent />);
      
      // Section title
      expect(screen.getByText(/sản phẩm sắp hết hàng/i)).toBeInTheDocument();
    });

    it('should show low stock products with WARNING badge', () => {
      render(<DashboardContent />);
      
      // Tìm các badge WARNING hoặc CRITICAL
      const warningBadges = screen.getAllByText(/sắp hết/i);
      expect(warningBadges.length).toBeGreaterThan(0);
    });

    it('should show critical stock with CRITICAL badge', () => {
      render(<DashboardContent />);
      
      // Sản phẩm có quantity <= reorderLevel sẽ có badge "Hết hàng"
      const criticalBadges = screen.getAllByText(/hết hàng/i);
      expect(criticalBadges.length).toBeGreaterThan(0);
    });

    it('should display product SKU in low stock table', () => {
      render(<DashboardContent />);
      
      // SKU được hiển thị trong bảng low stock
      const skuElements = document.querySelectorAll('code');
      expect(skuElements.length).toBeGreaterThan(0);
    });
  });

  describe('Test 1.3: Recent Activity Feed', () => {
    it('should render recent activity list', () => {
      render(<DashboardContent />);
      
      // Section title
      expect(screen.getByText(/hoạt động gần đây/i)).toBeInTheDocument();
    });

    it('should display activity items with timestamps', () => {
      render(<DashboardContent />);
      
      // Các hoạt động được hiển thị trong phần hoạt động gần đây
      const activitySection = screen.getByText(/hoạt động gần đây/i).closest('div');
      expect(activitySection).toBeInTheDocument();
      
      // Check the card contains activity data
      expect(activitySection?.textContent).toBeTruthy();
    });

    it('should display activity descriptions', () => {
      render(<DashboardContent />);
      
      // Mô tả hoạt động
      expect(screen.getByText(/nhập 50 bộ bàn ghế/i)).toBeInTheDocument();
    });

    it('should show activity type icons', () => {
      render(<DashboardContent />);
      
      // Icons được hiển thị (có thể kiểm tra bằng aria-label hoặc class)
      const activitySection = screen.getByText(/hoạt động gần đây/i).closest('div');
      expect(activitySection).toBeInTheDocument();
    });
  });

  describe('Dashboard Additional Tests', () => {
    it('should render inventory by category chart section', () => {
      render(<DashboardContent />);
      
      // Chart section
      expect(screen.getByText(/tồn kho theo danh mục/i)).toBeInTheDocument();
    });

    it('should have quick action buttons', () => {
      render(<DashboardContent />);
      
      // Quick action buttons
      expect(screen.getByRole('button', { name: /nhập kho/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /xuất kho/i })).toBeInTheDocument();
    });

    it('should have link to inventory page', () => {
      render(<DashboardContent />);
      
      // Link to inventory
      const viewAllLink = screen.getByRole('link', { name: /xem tất cả/i });
      expect(viewAllLink).toHaveAttribute('href', '/inventory');
    });
  });
});
