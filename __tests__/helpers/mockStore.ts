/**
 * Mock Store Helper for UI Tests
 * Cung cấp helper function để setup Zustand store state cho UI tests
 */
import { useWarehouseStore } from '@/lib/store';
import { UserRole, UserStatus } from '@/lib/types';
import {
  mockProducts,
  mockWarehouses,
  mockInventoryItems,
  mockSuppliers,
  mockPurchaseOrders,
  mockGoodsReceipts,
  mockGoodsIssues,
  mockStocktakeSessions,
  mockAuditLogs,
} from '@/lib/mockData';

/**
 * Default mock user cho tests
 */
export const mockUser = {
  id: 'user-001',
  username: 'admin',
  employeeId: 'NV001',
  email: 'test@quanlikho.vn',
  firstName: 'Nguyễn',
  lastName: 'Văn Test',
  fullName: 'Nguyễn Văn Test',
  phone: '0912345678',
  role: UserRole.ADMIN,
  permissions: {
    canManageProducts: true,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryAdjustments: true,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: true,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: true,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: true,
    canManageGoodsReceipt: true,
    canManageGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: true,
    canManageSettings: true,
    canApproveTransactions: true,
  },
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Setup mock store với overrides tùy chọn
 */
export function setupMockStore(overrides: Record<string, unknown> = {}) {
  useWarehouseStore.setState({
    products: mockProducts,
    warehouses: mockWarehouses,
    inventoryItems: mockInventoryItems,
    suppliers: mockSuppliers,
    purchaseOrders: mockPurchaseOrders,
    goodsReceipts: mockGoodsReceipts,
    goodsIssues: mockGoodsIssues,
    stocktakeSessions: mockStocktakeSessions,
    auditLogs: mockAuditLogs,
    alerts: [],
    isInitialized: true,
    stats: {
      totalProducts: mockProducts.length,
      totalWarehouses: mockWarehouses.length,
      totalSuppliers: mockSuppliers.length,
      totalInventoryValue: mockInventoryItems.reduce((sum, item) => {
        const product = mockProducts.find(p => p.id === item.productId);
        return sum + (product ? product.costPrice * item.quantityAvailable : 0);
      }, 0),
      lowStockCount: 5,
      outOfStockCount: 2,
      pendingReceipts: 3,
      pendingIssues: 2,
      pendingOrders: 4,
      activeStocktakes: 1,
    },
    ...overrides,
  });

  // Initialize store methods
  useWarehouseStore.getState().refreshStats?.();
  useWarehouseStore.getState().checkLowStockAlerts?.();
}

/**
 * Setup mock auth store
 */
export function setupMockAuth(user?: typeof mockUser | null) {
  if (user) {
    useWarehouseStore.setState({
      user,
      isAuthenticated: true,
    });
  } else {
    useWarehouseStore.setState({
      user: null,
      isAuthenticated: false,
    });
  }
}

/**
 * Reset all stores về trạng thái ban đầu
 */
export function resetAllStores() {
  useWarehouseStore.getState().resetStore?.();
  useWarehouseStore.setState({
    user: null,
    isAuthenticated: false,
  });
}

/**
 * Tạo mock inventory item với quantity thấp (cho low stock tests)
 */
export function createLowStockInventoryItem(productId: string, warehouseId: string, quantity: number = 2) {
  return {
    id: `inv-lowstock-${Date.now()}`,
    productId,
    warehouseId,
    location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
    quantityTotal: quantity,
    quantityAvailable: quantity,
    quantityReserved: 0,
    quantityQuarantine: 0,
    quantityDamaged: 0,
    lastReceiptDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Tạo mock inventory item với quantity = 0 (cho out of stock tests)
 */
export function createOutOfStockInventoryItem(productId: string, warehouseId: string) {
  return createLowStockInventoryItem(productId, warehouseId, 0);
}

/**
 * Setup store với low stock products
 */
export function setupMockStoreWithLowStock() {
  const lowStockProduct = mockProducts.find(p => p.reorderPoint && p.reorderPoint > 0);
  
  if (lowStockProduct) {
    const lowStockItem = createLowStockInventoryItem(
      lowStockProduct.id,
      mockWarehouses[0].id,
      Math.min(lowStockProduct.reorderPoint - 1, 2)
    );

    setupMockStore({
      inventoryItems: [...mockInventoryItems.filter(i => i.productId !== lowStockProduct.id), lowStockItem],
    });
  }
}

/**
 * Setup store với out of stock products
 */
export function setupMockStoreWithOutOfStock() {
  const outOfStockProduct = mockProducts[0];
  const outOfStockItem = createOutOfStockInventoryItem(
    outOfStockProduct.id,
    mockWarehouses[0].id
  );

  setupMockStore({
    inventoryItems: [...mockInventoryItems.filter(i => i.productId !== outOfStockProduct.id), outOfStockItem],
  });
}
