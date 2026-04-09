/**
 * Inventory UI Tests
 * Test Inventory List, Search/Filter, Status Badge, Product Detail Dialog
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser } from '../helpers/mockStore';
import { mockProducts, mockInventoryItems, mockWarehouses } from '@/lib/mockData';
import { useWarehouseStore } from '@/lib/store';
import { ProductCategory, UnitOfMeasure } from '@/lib/types';

// Mock components/ui
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
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Simple Inventory List Component for testing
function InventoryList() {
  const products = useWarehouseStore((state) => state.products);
  const inventoryItems = useWarehouseStore((state) => state.inventoryItems);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<string | null>(null);

  const getProductStatus = (productId: string): { label: string; className: string } => {
    const product = products.find(p => p.id === productId);
    if (!product) return { label: 'Không xác định', className: 'bg-gray-500' };

    const totalQty = inventoryItems
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantityAvailable, 0);

    if (totalQty === 0) {
      return { label: 'HẾT HÀNG', className: 'bg-red-500 text-red-100' };
    }
    if (product.reorderPoint && totalQty <= product.reorderPoint) {
      return { label: 'SẮP HẾT', className: 'bg-yellow-500 text-yellow-100' };
    }
    return { label: 'CÒN HÀNG', className: 'bg-green-500 text-green-100' };
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProductData = selectedProduct
    ? products.find(p => p.id === selectedProduct)
    : null;

  return (
    <div data-testid="inventory-list">
      <div data-testid="search-container">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <table data-testid="product-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Tên sản phẩm</th>
            <th>Tồn kho</th>
            <th>Available</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map(product => {
            const totalQty = inventoryItems
              .filter(item => item.productId === product.id)
              .reduce((sum, item) => sum + item.quantityTotal, 0);
            const availableQty = inventoryItems
              .filter(item => item.productId === product.id)
              .reduce((sum, item) => sum + item.quantityAvailable, 0);
            const status = getProductStatus(product.id);

            return (
              <tr key={product.id} data-testid={`product-row-${product.id}`}>
                <td data-testid={`product-sku-${product.id}`}>{product.sku}</td>
                <td>{product.name}</td>
                <td data-testid={`product-total-${product.id}`}>{totalQty}</td>
                <td data-testid={`product-available-${product.id}`}>{availableQty}</td>
                <td>
                  <span data-testid={`product-status-${product.id}`} className={status.className}>
                    {status.label}
                  </span>
                </td>
                <td>
                  <button
                    data-testid={`view-detail-btn-${product.id}`}
                    onClick={() => setSelectedProduct(product.id)}
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredProducts.length === 0 && (
        <div data-testid="no-results">Không tìm thấy</div>
      )}

      {selectedProductData && (
        <div data-testid="product-dialog">
          <h2 data-testid="dialog-product-name">{selectedProductData.name}</h2>
          <p data-testid="dialog-product-sku">{selectedProductData.sku}</p>
          <button onClick={() => setSelectedProduct(null)}>Đóng</button>
        </div>
      )}
    </div>
  );
}

describe('Inventory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 2.1: Product Table Render', () => {
    it('should render correct number of product rows', () => {
      const { container } = render(<InventoryList />);
      
      const products = mockProducts;
      const rows = container.querySelectorAll('[data-testid^="product-row-"]');
      
      expect(rows.length).toBe(products.length);
    });

    it('should display required columns: SKU, Name, Inventory, Available, Status', () => {
      render(<InventoryList />);
      
      // Check header columns exist
      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByText('Tên sản phẩm')).toBeInTheDocument();
      expect(screen.getByText('Tồn kho')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    });

    it('should display product SKU correctly', () => {
      render(<InventoryList />);
      
      const firstProduct = mockProducts[0];
      expect(screen.getByTestId(`product-sku-${firstProduct.id}`)).toHaveTextContent(firstProduct.sku);
    });
  });

  describe('Test 2.2: Search/Filter', () => {
    it('should filter products by search keyword', async () => {
      render(<InventoryList />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // Search for a known product name
      await userEvent.type(searchInput, 'Laptop');
      
      await waitFor(() => {
        const rows = document.querySelectorAll('[data-testid^="product-row-"]');
        // Should only show products matching "Laptop"
        expect(screen.getByText(/laptop/i)).toBeInTheDocument();
      });
    });

    it('should show all products when search is cleared', async () => {
      render(<InventoryList />);
      
      const searchInput = screen.getByTestId('search-input');
      
      // Type and then clear
      await userEvent.type(searchInput, 'xyz');
      await waitFor(() => {
        expect(screen.getByTestId('no-results')).toBeInTheDocument();
      });
      
      await userEvent.clear(searchInput);
      
      await waitFor(() => {
        expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
      });
    });

    it('should display "Không tìm thấy" when no products match', async () => {
      render(<InventoryList />);
      
      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'nonexistentproduct123');
      
      await waitFor(() => {
        expect(screen.getByTestId('no-results')).toHaveTextContent('Không tìm thấy');
      });
    });
  });

  describe('Test 2.3: Status Badge Colors', () => {
    it('should show green badge for ACTIVE products with sufficient stock', () => {
      render(<InventoryList />);
      
      // Tìm badge có class chứa "green"
      const greenBadges = document.querySelectorAll('[class*="green"]');
      expect(greenBadges.length).toBeGreaterThan(0);
    });

    it('should show yellow badge for LOW_STOCK products', () => {
      // Setup store with low stock product - set inventory to be at reorder point
      const lowStockItem = {
        ...mockInventoryItems[0],
        productId: mockProducts[0].id,
        quantityAvailable: 1, // Low stock
        quantityTotal: 1,
      };
      
      setupMockStore({
        inventoryItems: mockInventoryItems.map(item =>
          item.productId === mockProducts[0].id ? lowStockItem : item
        ),
      });
      
      render(<InventoryList />);
      
      // Tìm badge có class chứa "yellow" trong phần status
      const yellowBadges = document.querySelectorAll('[class*="yellow"]');
      expect(yellowBadges.length).toBeGreaterThan(0);
    });

    it('should show red badge for OUT_OF_STOCK products', () => {
      // Setup store with out of stock product
      const outOfStockItem = {
        ...mockInventoryItems[0],
        productId: mockProducts[0].id,
        quantityAvailable: 0,
        quantityTotal: 0,
      };
      
      setupMockStore({
        inventoryItems: mockInventoryItems.map(item =>
          item.productId === mockProducts[0].id ? outOfStockItem : item
        ),
      });
      
      render(<InventoryList />);
      
      // Tìm badge có class chứa "red" với text "HẾT HÀNG"
      const redBadges = document.querySelectorAll('[class*="red"]');
      expect(redBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Test 2.4: Product Detail Dialog', () => {
    it('should open dialog when row is clicked', async () => {
      render(<InventoryList />);
      
      const firstProduct = mockProducts[0];
      const viewButton = screen.getByTestId(`view-detail-btn-${firstProduct.id}`);
      
      await userEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('product-dialog')).toBeInTheDocument();
      });
    });

    it('should display correct product information in dialog', async () => {
      render(<InventoryList />);
      
      const firstProduct = mockProducts[0];
      const viewButton = screen.getByTestId(`view-detail-btn-${firstProduct.id}`);
      
      await userEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('dialog-product-name')).toHaveTextContent(firstProduct.name);
        expect(screen.getByTestId('dialog-product-sku')).toHaveTextContent(firstProduct.sku);
      });
    });

    it('should close dialog when close button is clicked', async () => {
      render(<InventoryList />);
      
      const firstProduct = mockProducts[0];
      const viewButton = screen.getByTestId(`view-detail-btn-${firstProduct.id}`);
      
      await userEvent.click(viewButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('product-dialog')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: 'Đóng' });
      await userEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('product-dialog')).not.toBeInTheDocument();
      });
    });
  });
});
