/**
 * Purchase Order UI Tests
 * Test PO List, Approval Badge, Action Buttons
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser } from '../helpers/mockStore';
import { mockPurchaseOrders, mockProducts, mockSuppliers } from '@/lib/mockData';
import { useWarehouseStore } from '@/lib/store';
import { PurchaseOrderStatus } from '@/lib/types';

// Mock components
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input data-testid="input" {...props} />,
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td data-testid="table-cell">{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr data-testid="table-row">{children}</tr>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Send: () => <div data-testid="send-icon" />,
}));

// Approval thresholds
const APPROVAL_THRESHOLDS = {
  WAREHOUSE_MANAGER: 10000000, // < 10tr
  DEPARTMENT_HEAD: 50000000, // 10tr - 50tr
  DIRECTOR: Infinity, // > 50tr
};

function getApprovalRole(totalAmount: number): string {
  if (totalAmount < APPROVAL_THRESHOLDS.WAREHOUSE_MANAGER) {
    return 'Quản lý kho';
  } else if (totalAmount < APPROVAL_THRESHOLDS.DEPARTMENT_HEAD) {
    return 'Trưởng phòng';
  } else {
    return 'Giám đốc';
  }
}

// Purchase Order List Component
function PurchaseOrderList() {
  const purchaseOrders = useWarehouseStore((state) => state.purchaseOrders);
  const suppliers = useWarehouseStore((state) => state.suppliers);

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || 'N/A';
  };

  const getStatusLabel = (status: PurchaseOrderStatus) => {
    const statusMap: Record<PurchaseOrderStatus, string> = {
      [PurchaseOrderStatus.DRAFT]: 'Nháp',
      [PurchaseOrderStatus.PENDING_APPROVAL]: 'Chờ duyệt',
      [PurchaseOrderStatus.APPROVED]: 'Đã duyệt',
      [PurchaseOrderStatus.SENT]: 'Đã gửi',
      [PurchaseOrderStatus.CONFIRMED]: 'Đã xác nhận',
      [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'Nhận một phần',
      [PurchaseOrderStatus.FULLY_RECEIVED]: 'Đã nhận đủ',
      [PurchaseOrderStatus.CLOSED]: 'Đã đóng',
      [PurchaseOrderStatus.CANCELLED]: 'Đã hủy',
    };
    return statusMap[status] || status;
  };

  const getApprovalBadge = (po: typeof mockPurchaseOrders[0]) => {
    if (po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.CANCELLED) {
      return null;
    }
    return getApprovalRole(po.totalValue);
  };

  const getActionButtons = (po: typeof mockPurchaseOrders[0]) => {
    const buttons: { label: string; action: string }[] = [];

    switch (po.status) {
      case PurchaseOrderStatus.DRAFT:
        buttons.push({ label: 'Gửi duyệt', action: 'send' });
        buttons.push({ label: 'Hủy', action: 'cancel' });
        break;
      case PurchaseOrderStatus.PENDING_APPROVAL:
        buttons.push({ label: 'Duyệt', action: 'approve' });
        buttons.push({ label: 'Từ chối', action: 'reject' });
        break;
      case PurchaseOrderStatus.APPROVED:
        buttons.push({ label: 'Gửi đặt hàng', action: 'send' });
        break;
      case PurchaseOrderStatus.FULLY_RECEIVED:
        // No action buttons for received orders
        break;
      default:
        // Other statuses may have different buttons
        break;
    }

    return buttons;
  };

  return (
    <div data-testid="po-list">
      <h2 data-testid="po-list-title">Danh sách đơn đặt hàng</h2>
      
      <table data-testid="po-table">
        <thead>
          <tr>
            <th>Mã PO</th>
            <th>Nhà cung cấp</th>
            <th>Tổng tiền</th>
            <th>Người duyệt cần</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {purchaseOrders.map(po => {
            const approvalBadge = getApprovalBadge(po);
            const actionButtons = getActionButtons(po);

            return (
              <tr key={po.id} data-testid={`po-row-${po.id}`}>
                <td data-testid={`po-code-${po.id}`}>{po.orderNumber}</td>
                <td data-testid={`po-supplier-${po.id}`}>{getSupplierName(po.supplierId)}</td>
                <td data-testid={`po-total-${po.id}`}>
                  {po.totalValue.toLocaleString('vi-VN')}
                </td>
                <td data-testid={`po-approval-${po.id}`}>
                  {approvalBadge ? (
                    <span data-testid={`approval-badge-${po.id}`} className="approval-badge">
                      {approvalBadge}
                    </span>
                  ) : '-'}
                </td>
                <td data-testid={`po-status-${po.id}`}>{getStatusLabel(po.status)}</td>
                <td data-testid={`po-actions-${po.id}`}>
                  {actionButtons.map((btn, idx) => (
                    <button 
                      key={idx} 
                      data-testid={`po-action-${po.id}-${btn.action}`}
                      className={btn.action}
                    >
                      {btn.label}
                    </button>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

describe('Purchase Order Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 5.1: PO List Render', () => {
    it('should display correct PO list from mock data', () => {
      render(<PurchaseOrderList />);
      
      const firstPO = mockPurchaseOrders[0];
      expect(screen.getByTestId(`po-row-${firstPO.id}`)).toBeInTheDocument();
    });

    it('should display table columns correctly', () => {
      render(<PurchaseOrderList />);
      
      expect(screen.getByText('Mã PO')).toBeInTheDocument();
      expect(screen.getByText('Nhà cung cấp')).toBeInTheDocument();
      expect(screen.getByText('Tổng tiền')).toBeInTheDocument();
      expect(screen.getByText('Người duyệt cần')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
      expect(screen.getByText('Thao tác')).toBeInTheDocument();
    });

    it('should display PO order number', () => {
      render(<PurchaseOrderList />);
      
      const firstPO = mockPurchaseOrders[0];
      expect(screen.getByTestId(`po-code-${firstPO.id}`)).toHaveTextContent(firstPO.orderNumber);
    });

    it('should display PO supplier name', () => {
      render(<PurchaseOrderList />);
      
      const firstPO = mockPurchaseOrders[0];
      expect(screen.getByTestId(`po-supplier-${firstPO.id}`)).toBeInTheDocument();
    });

    it('should display PO total amount', () => {
      render(<PurchaseOrderList />);
      
      const firstPO = mockPurchaseOrders[0];
      expect(screen.getByTestId(`po-total-${firstPO.id}`)).toBeInTheDocument();
    });

    it('should display PO status', () => {
      render(<PurchaseOrderList />);
      
      const firstPO = mockPurchaseOrders[0];
      expect(screen.getByTestId(`po-status-${firstPO.id}`)).toBeInTheDocument();
    });
  });

  describe('Test 5.2: Approval Badge According to Value', () => {
    it('should show "Quản lý kho" for PO < 10tr', () => {
      // Setup store with specific POs
      const lowValuePO = {
        ...mockPurchaseOrders[0],
        id: 'po-low-001',
        totalAmount: 5000000, // 5tr
        status: PurchaseOrderStatus.APPROVED,
      };
      
      setupMockStore({
        purchaseOrders: [lowValuePO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('approval-badge-po-low-001')).toHaveTextContent('Quản lý kho');
    });

    it('should show "Trưởng phòng" for PO 10-50tr', () => {
      const mediumValuePO = {
        ...mockPurchaseOrders[0],
        id: 'po-medium-001',
        totalAmount: 30000000, // 30tr
        status: PurchaseOrderStatus.APPROVED,
      };
      
      setupMockStore({
        purchaseOrders: [mediumValuePO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('approval-badge-po-medium-001')).toHaveTextContent('Trưởng phòng');
    });

    it('should show "Giám đốc" for PO > 50tr', () => {
      const highValuePO = {
        ...mockPurchaseOrders[0],
        id: 'po-high-001',
        totalAmount: 100000000, // 100tr
        status: PurchaseOrderStatus.APPROVED,
      };
      
      setupMockStore({
        purchaseOrders: [highValuePO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('approval-badge-po-high-001')).toHaveTextContent('Giám đốc');
    });

    it('should not show approval badge for DRAFT status', () => {
      const draftPO = {
        ...mockPurchaseOrders[0],
        id: 'po-draft-001',
        status: PurchaseOrderStatus.DRAFT,
      };
      
      setupMockStore({
        purchaseOrders: [draftPO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.queryByTestId('approval-badge-po-draft-001')).not.toBeInTheDocument();
    });

    it('should not show approval badge for CANCELLED status', () => {
      const cancelledPO = {
        ...mockPurchaseOrders[0],
        id: 'po-cancelled-001',
        status: PurchaseOrderStatus.CANCELLED,
      };
      
      setupMockStore({
        purchaseOrders: [cancelledPO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.queryByTestId('approval-badge-po-cancelled-001')).not.toBeInTheDocument();
    });
  });

  describe('Test 5.3: Action Buttons According to Status', () => {
    it('should show "Gửi duyệt" and "Hủy" for DRAFT status', () => {
      const draftPO = {
        ...mockPurchaseOrders[0],
        id: 'po-draft-action',
        status: PurchaseOrderStatus.DRAFT,
      };
      
      setupMockStore({
        purchaseOrders: [draftPO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('po-action-po-draft-action-send')).toHaveTextContent('Gửi duyệt');
      expect(screen.getByTestId('po-action-po-draft-action-cancel')).toHaveTextContent('Hủy');
    });

    it('should show "Duyệt" and "Từ chối" for PENDING_APPROVAL status', () => {
      const pendingPO = {
        ...mockPurchaseOrders[0],
        id: 'po-pending-action',
        status: PurchaseOrderStatus.PENDING_APPROVAL,
      };
      
      setupMockStore({
        purchaseOrders: [pendingPO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('po-action-po-pending-action-approve')).toHaveTextContent('Duyệt');
      expect(screen.getByTestId('po-action-po-pending-action-reject')).toHaveTextContent('Từ chối');
    });

    it('should show "Gửi đặt hàng" for APPROVED status (no Hủy)', () => {
      const approvedPO = {
        ...mockPurchaseOrders[0],
        id: 'po-approved-action',
        status: PurchaseOrderStatus.APPROVED,
      };
      
      setupMockStore({
        purchaseOrders: [approvedPO],
      });
      
      render(<PurchaseOrderList />);
      
      expect(screen.getByTestId('po-action-po-approved-action-send')).toHaveTextContent('Gửi đặt hàng');
      // No cancel button for approved
      const actionsContainer = screen.getByTestId('po-actions-po-approved-action');
      expect(actionsContainer.querySelectorAll('button')).toHaveLength(1);
    });

    it('should show no action buttons for RECEIVED status', () => {
      const receivedPO = {
        ...mockPurchaseOrders[0],
        id: 'po-received-action',
        status: PurchaseOrderStatus.FULLY_RECEIVED,
      };
      
      setupMockStore({
        purchaseOrders: [receivedPO],
      });
      
      render(<PurchaseOrderList />);
      
      const actionsContainer = screen.getByTestId('po-actions-po-received-action');
      expect(actionsContainer.querySelectorAll('button')).toHaveLength(0);
    });

    it('should allow cancel action for DRAFT', async () => {
      const draftPO = {
        ...mockPurchaseOrders[0],
        id: 'po-cancel-test',
        status: PurchaseOrderStatus.DRAFT,
      };
      
      setupMockStore({
        purchaseOrders: [draftPO],
      });
      
      render(<PurchaseOrderList />);
      
      const cancelButton = screen.getByTestId('po-action-po-cancel-test-cancel');
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('PO List Pagination/Filtering (Additional)', () => {
    it('should display multiple POs', () => {
      setupMockStore({
        purchaseOrders: mockPurchaseOrders.slice(0, 5),
      });
      
      render(<PurchaseOrderList />);
      
      const rows = document.querySelectorAll('[data-testid^="po-row-"]');
      expect(rows.length).toBe(5);
    });

    it('should handle empty PO list', () => {
      setupMockStore({
        purchaseOrders: [],
      });
      
      render(<PurchaseOrderList />);
      
      // Should still show headers
      expect(screen.getByText('Mã PO')).toBeInTheDocument();
    });
  });
});
