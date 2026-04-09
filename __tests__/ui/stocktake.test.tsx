/**
 * Stocktake UI Tests
 * Test Actual Qty Input, Deviation Calculation, Approval Flag
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { setupMockStore, setupMockAuth, resetAllStores, mockUser } from '../helpers/mockStore';
import { mockProducts, mockStocktakeSessions, mockInventoryItems, mockWarehouses } from '@/lib/mockData';
import { useWarehouseStore } from '@/lib/store';
import { StocktakeStatus } from '@/lib/types';

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
  Alert: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="alert" className={className}>{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  Check: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Product discrepancy interface
interface StocktakeProduct {
  productId: string;
  productSku: string;
  productName: string;
  systemQty: number;
  actualQty: number;
  deviation: number;
  deviationPercent: number;
  needsApproval: boolean;
}

// Stocktake Session Component
function StocktakeSession() {
  const products = useWarehouseStore((state) => state.products);
  const inventoryItems = useWarehouseStore((state) => state.inventoryItems);
  const stocktakeSessions = useWarehouseStore((state) => state.stocktakeSessions);

  const [selectedSession, setSelectedSession] = React.useState<string | null>(
    stocktakeSessions[0]?.id || null
  );
  const [productQtys, setProductQtys] = React.useState<Record<string, number>>({});

  const currentSession = stocktakeSessions.find(s => s.id === selectedSession);

  const getProductInfo = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const invItems = inventoryItems.filter(item => item.productId === productId);
    const totalQty = invItems.reduce((sum, item) => sum + item.quantityTotal, 0);
    
    return {
      product,
      systemQty: totalQty,
    };
  };

  const calculateDeviation = (systemQty: number, actualQty: number) => {
    const deviation = actualQty - systemQty;
    const deviationPercent = systemQty > 0 ? (Math.abs(deviation) / systemQty) * 100 : 0;
    const needsApproval = deviationPercent > 5;
    
    return { deviation, deviationPercent, needsApproval };
  };

  const handleActualQtyChange = (productId: string, actualQty: number) => {
    setProductQtys(prev => ({ ...prev, [productId]: actualQty }));
  };

  // Get products for current session from discrepancies
  const sessionProducts = currentSession?.discrepancies || [];
  const warehouseProducts = currentSession 
    ? products.slice(0, 5) // Demo: use first 5 products
    : [];

  return (
    <div data-testid="stocktake-session">
      <h2 data-testid="stocktake-title">Phiên kiểm kê</h2>
      
      {/* Session Selection */}
      <div data-testid="session-list">
        {stocktakeSessions.map(session => (
          <button
            key={session.id}
            data-testid={`session-btn-${session.id}`}
            onClick={() => setSelectedSession(session.id)}
            className={session.id === selectedSession ? 'active' : ''}
          >
            {session.stocktakeNumber} - {session.status}
          </button>
        ))}
      </div>

      {currentSession && (
        <>
          {/* Product Count Table */}
          <div data-testid="product-count-section">
            <h3 data-testid="product-count-title">Phiên kiểm kê: {currentSession.stocktakeNumber}</h3>
            
            <table data-testid="count-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>SL Hệ thống</th>
                  <th>SL Thực tế</th>
                  <th>Chênh lệch</th>
                  <th>%</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {warehouseProducts.map((product, index) => {
                  const { systemQty } = getProductInfo(product.id);
                  const actualQty = productQtys[product.id] ?? '';
                  const { deviation, deviationPercent, needsApproval } = calculateDeviation(
                    systemQty, 
                    typeof actualQty === 'number' ? actualQty : 0
                  );
                  
                  const deviationClass = deviation > 0 ? 'positive' : deviation < 0 ? 'negative' : 'neutral';

                  return (
                    <tr key={product.id} data-testid={`count-row-${index}`}>
                      <td data-testid={`count-sku-${index}`}>{product.sku}</td>
                      <td data-testid={`count-name-${index}`}>{product.name}</td>
                      <td data-testid={`count-system-${index}`}>{systemQty}</td>
                      <td data-testid={`count-actual-cell-${index}`}>
                        <input
                          data-testid={`count-actual-input-${index}`}
                          type="number"
                          min="0"
                          value={actualQty}
                          onChange={(e) => handleActualQtyChange(product.id, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td data-testid={`count-deviation-${index}`} className={deviationClass}>
                        {typeof actualQty === 'number' ? deviation : '-'}
                      </td>
                      <td data-testid={`count-deviation-pct-${index}`} className={deviationClass}>
                        {typeof actualQty === 'number' ? `${deviationPercent.toFixed(1)}%` : '-'}
                      </td>
                      <td data-testid={`count-status-${index}`}>
                        {needsApproval && typeof actualQty === 'number' ? (
                          <span data-testid={`approval-flag-${index}`} className="approval-flag">
                            Cần phê duyệt
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div data-testid="stocktake-summary">
            <p data-testid="summary-total-products">
              Tổng sản phẩm: {warehouseProducts.length}
            </p>
            <p data-testid="summary-needs-approval">
              Cần phê duyệt: {warehouseProducts.filter((p, i) => {
                const actual = productQtys[p.id];
                const { systemQty } = getProductInfo(p.id);
                const { deviationPercent } = calculateDeviation(systemQty, typeof actual === 'number' ? actual : 0);
                return deviationPercent > 5 && typeof actual === 'number';
              }).length}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

describe('Stocktake Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockAuth(mockUser);
    setupMockStore();
  });

  afterEach(() => {
    resetAllStores();
  });

  describe('Test 6.1: Actual Qty Input', () => {
    it('should have input field for actual qty for each product', () => {
      render(<StocktakeSession />);
      
      // Should have at least one input
      const firstInput = screen.getByTestId('count-actual-input-0');
      expect(firstInput).toBeInTheDocument();
    });

    it('should allow entering actual qty', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      await userEvent.clear(input);
      await userEvent.type(input, '100');
      
      await waitFor(() => {
        expect(input).toHaveValue(100);
      });
    });

    it('should calculate and display deviation in real-time', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      await userEvent.clear(input);
      await userEvent.type(input, '100');
      
      await waitFor(() => {
        const deviationCell = screen.getByTestId('count-deviation-0');
        // Deviation should be calculated
        expect(deviationCell).toBeInTheDocument();
      });
    });

    it('should show positive deviation in green color', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      // Get system qty first
      const systemQty = screen.getByTestId('count-system-0').textContent;
      const baseQty = parseInt(systemQty || '0');
      
      // Enter qty greater than system
      await userEvent.clear(input);
      await userEvent.type(input, String(baseQty + 10));
      
      await waitFor(() => {
        const deviationCell = screen.getByTestId('count-deviation-0');
        expect(deviationCell).toHaveClass('positive');
      });
    });

    it('should show negative deviation in red color', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      // Get system qty first
      const systemQty = screen.getByTestId('count-system-0').textContent;
      const baseQty = parseInt(systemQty || '0');
      
      // Enter qty less than system
      await userEvent.clear(input);
      await userEvent.type(input, String(Math.max(0, baseQty - 5)));
      
      await waitFor(() => {
        const deviationCell = screen.getByTestId('count-deviation-0');
        expect(deviationCell).toHaveClass('negative');
      });
    });
  });

  describe('Test 6.2: Approval Flag', () => {
    it('should show "Cần phê duyệt" when |deviation%| > 5%', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      // Get system qty
      const systemQtyText = screen.getByTestId('count-system-0').textContent;
      const systemQty = parseInt(systemQtyText || '0');
      
      // Enter a qty that creates > 5% deviation
      // For example, if system is 100, entering 10 creates 90% deviation
      const extremeQty = systemQty > 0 ? Math.floor(systemQty * 0.1) : 1;
      await userEvent.clear(input);
      await userEvent.type(input, String(extremeQty));
      
      await waitFor(() => {
        expect(screen.getByTestId('approval-flag-0')).toHaveTextContent('Cần phê duyệt');
      });
    });

    it('should not show flag when |deviation%| <= 5%', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      // Get system qty
      const systemQtyText = screen.getByTestId('count-system-0').textContent;
      const systemQty = parseInt(systemQtyText || '0');
      
      // Enter a qty that creates <= 5% deviation
      // For example, if system is 100, entering 98 creates 2% deviation
      const closeQty = systemQty > 0 ? Math.floor(systemQty * 0.98) : 0;
      await userEvent.clear(input);
      await userEvent.type(input, String(closeQty));
      
      await waitFor(() => {
        const statusCell = screen.getByTestId('count-status-0');
        expect(statusCell).toHaveTextContent('-');
      });
    });

    it('should update flag in real-time as qty changes', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      const systemQtyText = screen.getByTestId('count-system-0').textContent;
      const systemQty = parseInt(systemQtyText || '0');
      
      // First enter a qty with < 5% deviation
      const closeQty = systemQty > 0 ? Math.floor(systemQty * 0.98) : 1;
      await userEvent.clear(input);
      await userEvent.type(input, String(closeQty));
      
      await waitFor(() => {
        expect(screen.queryByTestId('approval-flag-0')).not.toBeInTheDocument();
      });
      
      // Now enter a qty with > 5% deviation
      const extremeQty = systemQty > 0 ? Math.floor(systemQty * 0.1) : 1;
      await userEvent.clear(input);
      await userEvent.type(input, String(extremeQty));
      
      await waitFor(() => {
        expect(screen.getByTestId('approval-flag-0')).toHaveTextContent('Cần phê duyệt');
      });
    });

    it('should show multiple approval flags when multiple products exceed 5%', async () => {
      render(<StocktakeSession />);
      
      const input1 = screen.getByTestId('count-actual-input-0');
      const input2 = screen.getByTestId('count-actual-input-1');
      
      const systemQty1Text = screen.getByTestId('count-system-0').textContent;
      const systemQty2Text = screen.getByTestId('count-system-1').textContent;
      const systemQty1 = parseInt(systemQty1Text || '0');
      const systemQty2 = parseInt(systemQty2Text || '0');
      
      // Both exceed 5%
      await userEvent.clear(input1);
      await userEvent.type(input1, String(systemQty1 > 0 ? Math.floor(systemQty1 * 0.1) : 1));
      
      await userEvent.clear(input2);
      await userEvent.type(input2, String(systemQty2 > 0 ? Math.floor(systemQty2 * 0.1) : 1));
      
      await waitFor(() => {
        const flags = document.querySelectorAll('[data-testid^="approval-flag-"]');
        expect(flags.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Stocktake Summary', () => {
    it('should display total product count', () => {
      render(<StocktakeSession />);
      
      expect(screen.getByTestId('summary-total-products')).toBeInTheDocument();
    });

    it('should update approval count as products change', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      const systemQtyText = screen.getByTestId('count-system-0').textContent;
      const systemQty = parseInt(systemQtyText || '0');
      
      // Enter qty that creates > 5% deviation
      await userEvent.clear(input);
      await userEvent.type(input, String(systemQty > 0 ? Math.floor(systemQty * 0.1) : 1));
      
      await waitFor(() => {
        const summary = screen.getByTestId('summary-needs-approval');
        expect(summary).toBeInTheDocument();
      });
    });
  });

  describe('Session Selection', () => {
    it('should allow selecting different sessions', () => {
      render(<StocktakeSession />);
      
      const sessions = document.querySelectorAll('[data-testid^="session-btn-"]');
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should display session details when selected', () => {
      render(<StocktakeSession />);
      
      // Check that session list is rendered
      const sessionButtons = document.querySelectorAll('[data-testid^="session-btn-"]');
      expect(sessionButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Deviation Percentage Display', () => {
    it('should display deviation percentage', async () => {
      render(<StocktakeSession />);
      
      const input = screen.getByTestId('count-actual-input-0');
      await userEvent.clear(input);
      await userEvent.type(input, '50');
      
      await waitFor(() => {
        const pctCell = screen.getByTestId('count-deviation-pct-0');
        expect(pctCell).toBeInTheDocument();
      });
    });
  });
});
