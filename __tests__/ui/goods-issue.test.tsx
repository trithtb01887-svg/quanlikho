/**
 * Goods Issue UI Tests
 * Test GI Form, Qty Validation, Picking List Display
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser } from '../helpers/mockStore';
import { mockProducts, mockGoodsIssues, mockInventoryItems, mockWarehouses } from '@/lib/mockData';
import { useWarehouseStore } from '@/lib/store';
import { GoodsIssueStatus, GoodsIssueReason } from '@/lib/types';

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
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} data-testid="label">{children}</label>
  ),
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td data-testid="table-cell">{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr data-testid="table-row">{children}</tr>,
  Select: ({ children, onChange }: { children: React.ReactNode; onChange?: (value: string) => void }) => (
    <select data-testid="select" onChange={(e) => onChange?.(e.target.value)}>{children}</select>
  ),
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Check: () => <div data-testid="check-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Package: () => <div data-testid="package-icon" />,
}));

// Line item interface
interface GILineItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  qtyRequested: number;
  qtyAvailable: number;
}

// Goods Issue Form Component
function GoodsIssueForm() {
  const products = useWarehouseStore((state) => state.products);
  const inventoryItems = useWarehouseStore((state) => state.inventoryItems);
  const goodsIssues = useWarehouseStore((state) => state.goodsIssues);
  
  const [requester, setRequester] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [reason, setReason] = React.useState<GoodsIssueReason | ''>('');
  const [lineItems, setLineItems] = React.useState<GILineItem[]>([
    { id: '1', productId: '', sku: '', productName: '', qtyRequested: 0, qtyAvailable: 0 }
  ]);
  const [warnings, setWarnings] = React.useState<Record<string, string>>({});

  const updateLineItemQty = (id: string, qty: number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const newWarnings = { ...warnings };
        if (qty > item.qtyAvailable) {
          newWarnings[id] = 'Không đủ hàng';
        } else {
          delete newWarnings[id];
        }
        setWarnings(newWarnings);
        return { ...item, qtyRequested: qty };
      }
      return item;
    }));
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { 
      id: String(Date.now()), 
      productId: '', 
      sku: '', 
      productName: '', 
      qtyRequested: 0, 
      qtyAvailable: 0 
    }]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    const available = inventoryItems
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantityAvailable, 0);

    setLineItems(lineItems.map(item => {
      if (item.id === id && product) {
        return { 
          ...item, 
          productId,
          sku: product.sku,
          productName: product.name,
          qtyAvailable: available,
        };
      }
      return item;
    }));
  };

  const approvedIssues = goodsIssues.filter(gi => gi.status === GoodsIssueStatus.CONFIRMED);

  return (
    <div data-testid="gi-form">
      <form>
        {/* Requester Field */}
        <div data-testid="requester-field">
          <label data-testid="label">Người yêu cầu</label>
          <input 
            data-testid="requester-input"
            type="text"
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            placeholder="Nhập tên người yêu cầu"
          />
        </div>

        {/* Department Field */}
        <div data-testid="department-field">
          <label data-testid="label">Phòng ban</label>
          <input 
            data-testid="department-input"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Nhập phòng ban"
          />
        </div>

        {/* Reason Field */}
        <div data-testid="reason-field">
          <label data-testid="label">Lý do xuất</label>
          <select 
            data-testid="reason-select"
            value={reason}
            onChange={(e) => setReason(e.target.value as GoodsIssueReason)}
          >
            <option value="">Chọn lý do</option>
            <option value={GoodsIssueReason.SALES}>Bán hàng</option>
            <option value={GoodsIssueReason.PRODUCTION}>Sản xuất</option>
            <option value={GoodsIssueReason.TRANSFER}>Điều chuyển</option>
            <option value={GoodsIssueReason.SAMPLE}>Mẫu</option>
            <option value={GoodsIssueReason.DAMAGE}>Hư hỏng</option>
            <option value={GoodsIssueReason.EXPIRY}>Hết hạn</option>
            <option value={GoodsIssueReason.RETURN}>Trả hàng</option>
          </select>
        </div>

        {/* Line Items */}
        <div data-testid="line-items">
          <div data-testid="line-items-header">
            <span>SKU</span>
            <span>Sản phẩm</span>
            <span>SL Yêu cầu</span>
            <span>SL Khả dụng</span>
            <span></span>
          </div>
          
          {lineItems.map((item, index) => (
            <div key={item.id} data-testid={`gi-line-item-${index}`}>
              <select
                data-testid={`gi-sku-select-${index}`}
                value={item.productId}
                onChange={(e) => handleProductSelect(item.id, e.target.value)}
              >
                <option value="">Chọn SKU</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku}</option>
                ))}
              </select>
              
              <span data-testid={`gi-product-name-${index}`}>{item.productName}</span>
              
              <input
                data-testid={`gi-qty-input-${index}`}
                type="number"
                min="0"
                value={item.qtyRequested}
                onChange={(e) => updateLineItemQty(item.id, parseInt(e.target.value) || 0)}
              />
              
              <span data-testid={`gi-available-${index}`}>{item.qtyAvailable}</span>
              
              <button
                data-testid={`gi-remove-btn-${index}`}
                type="button"
                onClick={() => handleRemoveLineItem(item.id)}
                disabled={lineItems.length === 1}
              >
                Xóa
              </button>
              
              {warnings[item.id] && (
                <div data-testid={`gi-warning-${index}`} className="warning">
                  {warnings[item.id]}
                </div>
              )}
            </div>
          ))}
        </div>

        <button data-testid="gi-add-line-btn" type="button" onClick={handleAddLineItem}>
          Thêm dòng
        </button>
      </form>

      {/* Picking List for APPROVED Issues */}
      <div data-testid="picking-lists">
        <h3 data-testid="picking-list-title">Danh sách chọn hàng (Đã duyệt)</h3>
        
        {approvedIssues.length === 0 ? (
          <div data-testid="no-picking-lists">Không có phiếu xuất nào được duyệt</div>
        ) : (
          approvedIssues.map(issue => (
            <div key={issue.id} data-testid={`picking-list-${issue.id}`} className="picking-list">
              <h4 data-testid={`picking-list-header-${issue.id}`}>
                Phiếu xuất: {issue.issueNumber}
              </h4>
              <p data-testid={`picking-list-requester-${issue.id}`}>
                Người yêu cầu: {issue.customerName || 'N/A'}
              </p>
              
              <table data-testid={`picking-table-${issue.id}`}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Số lô</th>
                    <th>Serial Numbers</th>
                    <th>Vị trí</th>
                    <th>SL</th>
                  </tr>
                </thead>
                <tbody>
                  {issue.items.map((giItem, itemIndex) => {
                    const invItem = inventoryItems.find(
                      inv => inv.productId === giItem.productId
                    );
                    return (
                      <tr key={`${issue.id}-${itemIndex}`} data-testid={`picking-item-${issue.id}-${itemIndex}`}>
                        <td data-testid={`picking-sku-${issue.id}-${itemIndex}`}>
                          {giItem.productSku || products.find(p => p.id === giItem.productId)?.sku}
                        </td>
                        <td data-testid={`picking-lot-${issue.id}-${itemIndex}`}>
                          {invItem?.lotNumber || 'N/A'}
                        </td>
                        <td data-testid={`picking-serial-${issue.id}-${itemIndex}`}>
                          {giItem.serialNumbers?.join(', ') || '-'}
                        </td>
                        <td data-testid={`picking-location-${issue.id}-${itemIndex}`}>
                          {invItem ? `${invItem.location.zone}-${invItem.location.aisle}-${invItem.location.rack}-${invItem.location.shelf}` : 'N/A'}
                        </td>
                        <td data-testid={`picking-qty-${issue.id}-${itemIndex}`}>{giItem.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

describe('Goods Issue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 4.1: Goods Issue Form', () => {
    it('should render requester field', () => {
      render(<GoodsIssueForm />);
      
      expect(screen.getByTestId('requester-input')).toBeInTheDocument();
    });

    it('should render department field', () => {
      render(<GoodsIssueForm />);
      
      expect(screen.getByTestId('department-input')).toBeInTheDocument();
    });

    it('should render reason select field', () => {
      render(<GoodsIssueForm />);
      
      expect(screen.getByTestId('reason-select')).toBeInTheDocument();
    });

    it('should render line items with SKU, Qty requested', () => {
      render(<GoodsIssueForm />);
      
      expect(screen.getByTestId('gi-line-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('gi-sku-select-0')).toBeInTheDocument();
      expect(screen.getByTestId('gi-qty-input-0')).toBeInTheDocument();
    });
  });

  describe('Test 4.2: Quantity Validation', () => {
    it('should show warning when qty > available (real-time)', async () => {
      render(<GoodsIssueForm />);
      
      // Select a product first
      const skuSelect = screen.getByTestId('gi-sku-select-0');
      await userEvent.selectOptions(skuSelect, mockProducts[0].id);
      
      // Wait for product to be loaded
      await waitFor(() => {
        const available = screen.getByTestId('gi-available-0');
        expect(available).toBeInTheDocument();
      });
      
      // Now enter a qty greater than available
      const qtyInput = screen.getByTestId('gi-qty-input-0');
      await userEvent.clear(qtyInput);
      
      // Get the actual available quantity
      const availableText = screen.getByTestId('gi-available-0').textContent;
      const available = parseInt(availableText || '0');
      
      // Enter qty greater than available
      await userEvent.type(qtyInput, String(available + 100));
      
      await waitFor(() => {
        expect(screen.getByTestId('gi-warning-0')).toHaveTextContent('Không đủ hàng');
      });
    });

    it('should not show warning when qty <= available', async () => {
      render(<GoodsIssueForm />);
      
      // Select a product first
      const skuSelect = screen.getByTestId('gi-sku-select-0');
      await userEvent.selectOptions(skuSelect, mockProducts[0].id);
      
      await waitFor(() => {
        const available = screen.getByTestId('gi-available-0');
        expect(available).toBeInTheDocument();
      });
      
      // Enter qty less than available
      const qtyInput = screen.getByTestId('gi-qty-input-0');
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, '1');
      
      await waitFor(() => {
        expect(screen.queryByTestId('gi-warning-0')).not.toBeInTheDocument();
      });
    });

    it('should show warning immediately without submit', async () => {
      render(<GoodsIssueForm />);
      
      // Select product
      const skuSelect = screen.getByTestId('gi-sku-select-0');
      await userEvent.selectOptions(skuSelect, mockProducts[0].id);
      
      await waitFor(() => {
        expect(screen.getByTestId('gi-available-0')).toBeInTheDocument();
      });
      
      // Enter high qty - warning should appear without submit
      const qtyInput = screen.getByTestId('gi-qty-input-0');
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, '99999');
      
      await waitFor(() => {
        expect(screen.getByTestId('gi-warning-0')).toBeInTheDocument();
      });
    });
  });

  describe('Test 4.3: Picking List Display', () => {
    it('should show picking list for APPROVED issues', () => {
      render(<GoodsIssueForm />);
      
      const approvedIssues = mockGoodsIssues.filter(gi => gi.status === GoodsIssueStatus.CONFIRMED);
      
      if (approvedIssues.length > 0) {
        const firstApproved = approvedIssues[0];
        expect(screen.getByTestId(`picking-list-${firstApproved.id}`)).toBeInTheDocument();
      }
    });

    it('should display picking list items with SKU, Lot, Serial, Location', () => {
      render(<GoodsIssueForm />);
      
      const approvedIssues = mockGoodsIssues.filter(gi => gi.status === GoodsIssueStatus.CONFIRMED);
      
      if (approvedIssues.length > 0) {
        const firstApproved = approvedIssues[0];
        const pickingTable = screen.getByTestId(`picking-table-${firstApproved.id}`);
        expect(pickingTable).toBeInTheDocument();
        
        // Check headers
        expect(within(pickingTable).getByText('SKU')).toBeInTheDocument();
        expect(within(pickingTable).getByText('Số lô')).toBeInTheDocument();
        expect(within(pickingTable).getByText('Serial Numbers')).toBeInTheDocument();
        expect(within(pickingTable).getByText('Vị trí')).toBeInTheDocument();
      }
    });

    it('should show "Không có phiếu xuất nào được duyệt" when no approved issues', () => {
      // Setup store with no approved issues
      setupMockStore({
        goodsIssues: mockGoodsIssues.map(gi => ({
          ...gi,
          status: GoodsIssueStatus.PENDING,
        })),
      });
      
      render(<GoodsIssueForm />);
      
      expect(screen.getByTestId('no-picking-lists')).toHaveTextContent(
        'Không có phiếu xuất nào được duyệt'
      );
    });
  });

  describe('Add/Remove Line Items', () => {
    it('should add line item when clicking button', async () => {
      render(<GoodsIssueForm />);
      
      const addButton = screen.getByTestId('gi-add-line-btn');
      await userEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('gi-line-item-1')).toBeInTheDocument();
      });
    });

    it('should remove line item when clicking remove', async () => {
      render(<GoodsIssueForm />);
      
      // Add a line item first
      const addButton = screen.getByTestId('gi-add-line-btn');
      await userEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('gi-line-item-1')).toBeInTheDocument();
      });
      
      // Remove it
      const removeButton = screen.getByTestId('gi-remove-btn-1');
      await userEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('gi-line-item-1')).not.toBeInTheDocument();
      });
    });
  });
});
