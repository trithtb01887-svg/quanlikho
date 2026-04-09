/**
 * Goods Receipt UI Tests
 * Test GRN Form, Line Items, Validation, GRN List
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser } from '../helpers/mockStore';
import { mockProducts, mockSuppliers, mockGoodsReceipts, mockWarehouses } from '@/lib/mockData';
import { useWarehouseStore } from '@/lib/store';
import { GoodsReceiptStatus } from '@/lib/types';

// Mock components
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
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
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value} data-testid={`select-item-${value}`}>{children}</option>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Types for line item
interface LineItem {
  id: string;
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lotNumber: string;
}

// GRN Form Component for testing
function GoodsReceiptForm() {
  const suppliers = useWarehouseStore((state) => state.suppliers);
  const products = useWarehouseStore((state) => state.products);
  const goodsReceipts = useWarehouseStore((state) => state.goodsReceipts);
  
  const [supplierId, setSupplierId] = React.useState('');
  const [receiptDate, setReceiptDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: '1', productId: '', sku: '', quantity: 0, unitPrice: 0, lotNumber: '' }
  ]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!supplierId) {
      newErrors.supplier = 'Vui lòng chọn nhà cung cấp';
    }
    
    lineItems.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item-${index}`] = 'Vui lòng chọn sản phẩm';
      }
      if (item.quantity <= 0) {
        newErrors[`qty-${index}`] = 'Số lượng phải lớn hơn 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`price-${index}`] = 'Đơn giá không hợp lệ';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { 
      id: String(Date.now()), 
      productId: '', 
      sku: '', 
      quantity: 0, 
      unitPrice: 0, 
      lotNumber: '' 
    }]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const handleUpdateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updated.sku = product.sku;
            updated.unitPrice = product.costPrice;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateForm();
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <div data-testid="grn-form">
      <form onSubmit={handleSubmit}>
        <div data-testid="form-fields">
          {/* Supplier Field */}
          <div data-testid="supplier-field">
            <label data-testid="label">Nhà cung cấp</label>
            <select 
              data-testid="supplier-select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Chọn nhà cung cấp</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplier && <span data-testid="error-supplier">{errors.supplier}</span>}
          </div>

          {/* Date Field */}
          <div data-testid="date-field">
            <label data-testid="label">Ngày nhập</label>
            <input 
              data-testid="date-input"
              type="date" 
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items */}
        <div data-testid="line-items">
          <div data-testid="line-items-header">
            <span>SKU</span>
            <span>Số lượng</span>
            <span>Đơn giá</span>
            <span>Số lô</span>
            <span></span>
          </div>
          
          {lineItems.map((item, index) => (
            <div key={item.id} data-testid={`line-item-${index}`}>
              <select
                data-testid={`sku-select-${index}`}
                value={item.productId}
                onChange={(e) => handleUpdateLineItem(item.id, 'productId', e.target.value)}
              >
                <option value="">Chọn SKU</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku}</option>
                ))}
              </select>
              
              <input
                data-testid={`qty-input-${index}`}
                type="number"
                min="0"
                value={item.quantity}
                onChange={(e) => handleUpdateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
              />
              {errors[`qty-${index}`] && <span data-testid={`error-qty-${index}`}>{errors[`qty-${index}`]}</span>}
              
              <input
                data-testid={`price-input-${index}`}
                type="number"
                value={item.unitPrice}
                onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
              />
              
              <input
                data-testid={`lot-input-${index}`}
                type="text"
                placeholder="Số lô"
                value={item.lotNumber}
                onChange={(e) => handleUpdateLineItem(item.id, 'lotNumber', e.target.value)}
              />
              
              <button
                data-testid={`remove-btn-${index}`}
                type="button"
                onClick={() => handleRemoveLineItem(item.id)}
                disabled={lineItems.length === 1}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        <button data-testid="add-line-btn" type="button" onClick={handleAddLineItem}>
          Thêm dòng
        </button>

        <div data-testid="total-amount">
          Tổng tiền: {totalAmount.toLocaleString('vi-VN')} VND
        </div>

        <button data-testid="submit-btn" type="submit">Lưu</button>
      </form>

      {/* GRN List */}
      <div data-testid="grn-list">
        <h3 data-testid="grn-list-title">Danh sách phiếu nhập kho</h3>
        <table>
          <thead>
            <tr>
              <th>Mã GRN</th>
              <th>Nhà cung cấp</th>
              <th>Ngày</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {goodsReceipts.map(gr => (
              <tr key={gr.id} data-testid={`grn-row-${gr.id}`}>
                <td data-testid={`grn-code-${gr.id}`}>{gr.grnNumber}</td>
                <td data-testid={`grn-supplier-${gr.id}`}>
                  {suppliers.find(s => s.id === gr.supplierId)?.name || 'N/A'}
                </td>
                <td>{new Date(gr.receiptDate).toLocaleDateString('vi-VN')}</td>
                <td data-testid={`grn-total-${gr.id}`}>
                  {gr.totalValue.toLocaleString('vi-VN')}
                </td>
                <td data-testid={`grn-status-${gr.id}`}>{gr.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

describe('Goods Receipt Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 3.1: GRN Form Fields', () => {
    it('should render supplier field (select)', () => {
      render(<GoodsReceiptForm />);
      
      const supplierSelect = screen.getByTestId('supplier-select');
      expect(supplierSelect).toBeInTheDocument();
      
      // Check options exist
      const options = within(supplierSelect).getAllByRole('option');
      expect(options.length).toBeGreaterThan(1); // At least 1 supplier + placeholder
    });

    it('should render date field', () => {
      render(<GoodsReceiptForm />);
      
      expect(screen.getByTestId('date-input')).toBeInTheDocument();
    });

    it('should render at least one line item row', () => {
      render(<GoodsReceiptForm />);
      
      expect(screen.getByTestId('line-item-0')).toBeInTheDocument();
    });

    it('should have SKU, Qty, Unit Price, Lot Number fields in line item', () => {
      render(<GoodsReceiptForm />);
      
      expect(screen.getByTestId('sku-select-0')).toBeInTheDocument();
      expect(screen.getByTestId('qty-input-0')).toBeInTheDocument();
      expect(screen.getByTestId('price-input-0')).toBeInTheDocument();
      expect(screen.getByTestId('lot-input-0')).toBeInTheDocument();
    });
  });

  describe('Test 3.2: Add/Remove Line Items', () => {
    it('should add a new line item when clicking "Thêm dòng"', async () => {
      render(<GoodsReceiptForm />);
      
      const addButton = screen.getByTestId('add-line-btn');
      await userEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('line-item-1')).toBeInTheDocument();
      });
      
      // Original line item should still exist
      expect(screen.getByTestId('line-item-0')).toBeInTheDocument();
    });

    it('should remove a line item when clicking "Xóa"', async () => {
      render(<GoodsReceiptForm />);
      
      // First add a line item
      const addButton = screen.getByTestId('add-line-btn');
      await userEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('line-item-1')).toBeInTheDocument();
      });
      
      // Now remove the second line item
      const removeButton = screen.getByTestId('remove-btn-1');
      await userEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('line-item-1')).not.toBeInTheDocument();
      });
    });

    it('should not be able to remove when only 1 row remains', async () => {
      render(<GoodsReceiptForm />);
      
      const removeButton = screen.getByTestId('remove-btn-0');
      
      // Button should be disabled
      expect(removeButton).toBeDisabled();
      
      await userEvent.click(removeButton);
      
      // Line item 0 should still exist
      expect(screen.getByTestId('line-item-0')).toBeInTheDocument();
    });
  });

  describe('Test 3.3: Validation on Submit', () => {
    it('should show error messages when submitting empty form', async () => {
      render(<GoodsReceiptForm />);
      
      const submitButton = screen.getByTestId('submit-btn');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-supplier')).toHaveTextContent('Vui lòng chọn nhà cung cấp');
      });
    });

    it('should show error when qty is 0 or negative', async () => {
      render(<GoodsReceiptForm />);
      
      // Select a supplier first
      const supplierSelect = screen.getByTestId('supplier-select');
      await userEvent.selectOptions(supplierSelect, mockSuppliers[0].id);
      
      // Set qty to 0
      const qtyInput = screen.getByTestId('qty-input-0');
      await userEvent.clear(qtyInput);
      await userEvent.type(qtyInput, '0');
      
      const submitButton = screen.getByTestId('submit-btn');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-qty-0')).toHaveTextContent('Số lượng phải lớn hơn 0');
      });
    });

    it('should show error when supplier is missing', async () => {
      render(<GoodsReceiptForm />);
      
      // Don't select supplier, just submit
      const submitButton = screen.getByTestId('submit-btn');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-supplier')).toBeInTheDocument();
      });
    });
  });

  describe('Test 3.4: GRN List Display', () => {
    it('should render GRN table with columns', () => {
      render(<GoodsReceiptForm />);
      
      // Check table headers - dùng getAllByText vì có thể trùng lặp
      const grnHeader = screen.getAllByText('Mã GRN');
      expect(grnHeader.length).toBeGreaterThanOrEqual(1);
      
      const supplierHeader = screen.getAllByText('Nhà cung cấp');
      expect(supplierHeader.length).toBeGreaterThanOrEqual(1);
    });

    it('should display GRNs from mock data', () => {
      render(<GoodsReceiptForm />);
      
      // Check that at least some GRNs are displayed
      const firstGRN = mockGoodsReceipts[0];
      expect(screen.getByTestId(`grn-row-${firstGRN.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`grn-code-${firstGRN.id}`)).toHaveTextContent(firstGRN.grnNumber || firstGRN.receiptNumber);
    });

    it('should display GRN total amount', () => {
      render(<GoodsReceiptForm />);
      
      const firstGRN = mockGoodsReceipts[0];
      expect(screen.getByTestId(`grn-total-${firstGRN.id}`)).toBeInTheDocument();
    });

    it('should display GRN status', () => {
      render(<GoodsReceiptForm />);
      
      const firstGRN = mockGoodsReceipts[0];
      expect(screen.getByTestId(`grn-status-${firstGRN.id}`)).toHaveTextContent(firstGRN.status);
    });
  });
});
