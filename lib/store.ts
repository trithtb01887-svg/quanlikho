import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
  Product,
  Warehouse,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsIssue,
  GoodsIssueItem,
  StocktakeSession,
  StocktakeDiscrepancy,
  AuditLog,
  ProductCategory,
  UnitOfMeasure,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  GoodsIssueStatus,
  StocktakeStatus,
  AuditAction,
  UserRole,
  User,
} from './types';
import { apiFetchJSON } from './api';

// ============================================
// TYPES
// ============================================

export interface Alert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry' | 'quarantine';
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  message: string;
  quantity: number;
  reorderPoint?: number;
  createdAt: Date;
  isRead: boolean;
}

export interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  totalSuppliers: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingIssues: number;
  pendingOrders: number;
  activeStocktakes: number;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// ============================================
// API FUNCTIONS
// ============================================

const API_BASE = '/api';

// Re-export từ api.ts để sử dụng CSRF token
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  return apiFetchJSON<T>(url, options);
}

// Helper để extract data từ response có pagination hoặc không
async function fetchListData<T>(url: string, options?: RequestInit): Promise<T[]> {
  const json = await fetchJSON<{ data: T[]; pagination?: unknown } | T[]>(url, options);
  const data = Array.isArray(json) ? json : json.data;
  console.log(`[Store] Fetched ${url}:`, Array.isArray(data) ? `${data.length} items` : 'not an array', json);
  return data;
}

// ============================================
// STORE INTERFACE
// ============================================

interface WarehouseStore extends LoadingState {
  isInitialized: boolean;

  // Data
  products: Product[];
  warehouses: Warehouse[];
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  goodsIssues: GoodsIssue[];
  stocktakeSessions: StocktakeSession[];
  auditLogs: AuditLog[];
  alerts: Alert[];
  stats: DashboardStats;

  // Lightweight dashboard data (aggregated, no inventory items loaded)
  dashboardData: {
    totalProducts: number;
    totalWarehouses: number;
    totalSuppliers: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingReceipts: number;
    pendingIssues: number;
    pendingOrders: number;
    activeStocktakes: number;
    recentReceipts: any[];
    recentIssues: any[];
    topProducts: any[];
    inventoryByCategory: any[];
    generatedAt: string;
  } | null;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Product Actions
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductByBarcode: (barcode: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
  getLowStockProductList: () => Product[];
  fetchProducts: () => Promise<void>;
  
  // Warehouse Actions
  setWarehouses: (warehouses: Warehouse[]) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  getWarehouseById: (id: string) => Warehouse | undefined;
  fetchWarehouses: () => Promise<void>;
  
  // Inventory Actions
  setInventoryItems: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustInventoryQuantity: (productId: string, warehouseId: string, quantityChange: number, type: 'add' | 'subtract') => void;
  checkLowStockAlerts: () => void;
  markAlertAsRead: (alertId: string) => void;
  clearAlerts: () => void;
  getInventoryByProduct: (productId: string) => InventoryItem[];
  getInventoryByWarehouse: (warehouseId: string) => InventoryItem[];
  getTotalProductQuantity: (productId: string) => number;
  fetchInventory: (params?: { warehouseId?: string; search?: string }) => Promise<void>;
  
  // Supplier Actions
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  getSupplierById: (id: string) => Supplier | undefined;
  fetchSuppliers: () => Promise<void>;
  
  // Purchase Order Actions
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  approvePurchaseOrder: (id: string, approvedBy: string) => void;
  cancelPurchaseOrder: (id: string, reason: string) => void;
  sendPurchaseOrder: (id: string) => void;
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined;
  fetchPurchaseOrders: (params?: { status?: string; supplierId?: string }) => Promise<void>;
  createPurchaseOrder: (data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => Promise<PurchaseOrder>;
  
  // Goods Receipt Actions
  setGoodsReceipts: (receipts: GoodsReceipt[]) => void;
  addGoodsReceipt: (receipt: GoodsReceipt) => void;
  updateGoodsReceipt: (id: string, updates: Partial<GoodsReceipt>) => void;
  deleteGoodsReceipt: (id: string) => void;
  completeGoodsReceipt: (id: string, completedBy: string) => void;
  getGoodsReceiptById: (id: string) => GoodsReceipt | undefined;
  fetchGoodsReceipts: (params?: { status?: string; supplierId?: string; warehouseId?: string }) => Promise<void>;
  createGoodsReceipt: (data: Partial<GoodsReceipt>) => Promise<GoodsReceipt>;
  
  // Goods Issue Actions
  setGoodsIssues: (issues: GoodsIssue[]) => void;
  addGoodsIssue: (issue: GoodsIssue) => void;
  updateGoodsIssue: (id: string, updates: Partial<GoodsIssue>) => void;
  deleteGoodsIssue: (id: string) => void;
  completeGoodsIssue: (id: string, completedBy: string) => void;
  validatePickingList: (issueId: string, scannedBarcode: string) => boolean;
  getGoodsIssueById: (id: string) => GoodsIssue | undefined;
  fetchGoodsIssues: (params?: { status?: string; reason?: string; warehouseId?: string }) => Promise<void>;
  createGoodsIssue: (data: Partial<GoodsIssue>) => Promise<GoodsIssue>;
  
  // Stocktake Actions
  setStocktakeSessions: (sessions: StocktakeSession[]) => void;
  addStocktakeSession: (session: StocktakeSession) => void;
  updateStocktakeSession: (id: string, updates: Partial<StocktakeSession>) => void;
  deleteStocktakeSession: (id: string) => void;
  startStocktake: (id: string, startedBy: string) => void;
  completeStocktake: (id: string) => void;
  approveStocktake: (id: string, approvedBy: string) => void;
  getStocktakeById: (id: string) => StocktakeSession | undefined;
  fetchStocktakes: (params?: { status?: string; warehouseId?: string }) => Promise<void>;
  createStocktake: (data: Partial<StocktakeSession>) => Promise<StocktakeSession>;
  updateStocktakeStatus: (id: string, updates: Partial<StocktakeSession>) => Promise<StocktakeSession>;
  
  // Audit Log Actions
  setAuditLogs: (logs: AuditLog[]) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogsByEntity: (entity: string, entityId: string) => AuditLog[];
  getRecentAuditLogs: (limit?: number) => AuditLog[];
  
  // Dashboard Actions
  refreshStats: () => void;
  fetchDashboardStats: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  setDashboardData: (data: any) => void;
  getLowStockProducts: () => { product: Product; totalQuantity: number }[];
  getTopProductsByValue: () => { product: Product; totalValue: number }[];
  
  // Auth Actions
  login: (user: User) => void;
  logout: () => void;
  
  // Store Actions
  initializeStore: () => Promise<void>;
  resetStore: () => void;
}

// ============================================
// MAIN STORE
// ============================================

export const useWarehouseStore = create<WarehouseStore>()((set, get) => ({
  // Initial State
  isInitialized: false,
  isLoading: false,
  error: null,
  
  // Data
  products: [],
  warehouses: [],
  inventoryItems: [],
  suppliers: [],
  purchaseOrders: [],
  goodsReceipts: [],
  goodsIssues: [],
  stocktakeSessions: [],
  auditLogs: [],
  alerts: [],
  stats: {
    totalProducts: 0,
    totalWarehouses: 0,
    totalSuppliers: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingReceipts: 0,
    pendingIssues: 0,
    pendingOrders: 0,
    activeStocktakes: 0,
  },
  
  // Auth
  user: null,
  isAuthenticated: false,

  // Dashboard data (lightweight aggregated stats)
  dashboardData: null,

  // ============================================
  // PRODUCT ACTIONS
  // ============================================
  
  setProducts: (products) => set({ products }),
  
  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),
  
  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    })),
  
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id === id),
    })),
  
  getProductById: (id) => get().products.find((p) => p.id === id),
  
  getProductByBarcode: (barcode) => {
    return get().products.find((p) => p.barcode === barcode);
  },
  
  searchProducts: (query) => {
    if (!query || query.trim() === '') return get().products;
    const lowerQuery = query.toLowerCase().trim();
    return get().products.filter((p) => {
      return (
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        (p.barcode && p.barcode.includes(query)) ||
        p.description?.toLowerCase().includes(lowerQuery)
      );
    });
  },
  
  getLowStockProductList: () => {
    const state = get();
    return state.products.filter((p) => {
      if (!p.reorderPoint) return false;
      const totalQty = state.getTotalProductQuantity(p.id);
      return totalQty <= p.reorderPoint;
    });
  },
  
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await fetchListData<Product>(`${API_BASE}/products`);
      set({ products, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  // ============================================
  // WAREHOUSE ACTIONS
  // ============================================
  
  setWarehouses: (warehouses) => set({ warehouses }),
  
  addWarehouse: (warehouse) =>
    set((state) => ({
      warehouses: [...state.warehouses, warehouse],
    })),
  
  updateWarehouse: (id, updates) =>
    set((state) => ({
      warehouses: state.warehouses.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
      ),
    })),
  
  deleteWarehouse: (id) =>
    set((state) => ({
      warehouses: state.warehouses.filter((w) => w.id !== id),
    })),
  
  getWarehouseById: (id) => get().warehouses.find((w) => w.id === id),
  
  fetchWarehouses: async () => {
    set({ isLoading: true, error: null });
    try {
      const warehouses = await fetchListData<Warehouse>(`${API_BASE}/warehouses`);
      set({ warehouses, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  // ============================================
  // INVENTORY ACTIONS
  // ============================================
  
  setInventoryItems: (items) => set({ inventoryItems: items }),
  
  addInventoryItem: (item) =>
    set((state) => ({
      inventoryItems: [...state.inventoryItems, item],
    })),
  
  updateInventoryItem: (id, updates) =>
    set((state) => ({
      inventoryItems: state.inventoryItems.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date() } : item
      ),
    })),
  
  deleteInventoryItem: (id) =>
    set((state) => ({
      inventoryItems: state.inventoryItems.filter((item) => item.id !== id),
    })),
  
  adjustInventoryQuantity: (productId, warehouseId, quantityChange, type) => {
    const existingItem = get().inventoryItems.find(
      (item) => item.productId === productId && item.warehouseId === warehouseId
    );

    if (existingItem) {
      const newQuantity = type === 'add'
        ? existingItem.quantityTotal + quantityChange
        : existingItem.quantityTotal - quantityChange;

      const newAvailable = type === 'add'
        ? existingItem.quantityAvailable + quantityChange
        : Math.max(0, existingItem.quantityAvailable - quantityChange);

      set((state) => ({
        inventoryItems: state.inventoryItems.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantityTotal: Math.max(0, newQuantity),
                quantityAvailable: newAvailable,
                lastReceiptDate: type === 'add' ? new Date() : item.lastReceiptDate,
                lastIssueDate: type === 'subtract' ? new Date() : item.lastIssueDate,
                updatedAt: new Date(),
              }
            : item
        ),
      }));
    }
    get().checkLowStockAlerts();
    toast.success(`Đã ${type === 'add' ? 'thêm' : 'trừ'} ${quantityChange} đơn vị`);
  },
  
  checkLowStockAlerts: () => {
    const state = get();
    const alerts: Alert[] = [];

    state.inventoryItems.forEach((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      const warehouse = state.warehouses.find((w) => w.id === item.warehouseId);

      if (!product || !warehouse) return;

      const existingAlert = state.alerts.find(
        (a) => a.productId === product.id && a.warehouseId === warehouse.id && !a.isRead
      );

      if (existingAlert) return;

      if (item.quantityAvailable === 0) {
        alerts.push({
          id: `alert-${product.id}-${warehouse.id}-oos-${Date.now()}`,
          type: 'out_of_stock',
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          message: `${product.name} (${product.sku}) đã hết hàng tại ${warehouse.name}`,
          quantity: 0,
          createdAt: new Date(),
          isRead: false,
        });
      } else if (product.reorderPoint && item.quantityAvailable <= product.reorderPoint) {
        alerts.push({
          id: `alert-${product.id}-${warehouse.id}-ls-${Date.now()}`,
          type: 'low_stock',
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          message: `${product.name} (${product.sku}) sắp hết hàng tại ${warehouse.name}. Tồn kho: ${item.quantityAvailable}, Mức tối thiểu: ${product.reorderPoint}`,
          quantity: item.quantityAvailable,
          reorderPoint: product.reorderPoint,
          createdAt: new Date(),
          isRead: false,
        });
      }
    });

    if (alerts.length > 0) {
      set((state) => ({
        alerts: [...alerts, ...state.alerts].slice(0, 100),
      }));

      // Show toast cho alert critical đầu tiên
      const criticalAlert = alerts.find(a => a.type === 'out_of_stock');
      if (criticalAlert) {
        toast.warning("Cảnh báo: Có sản phẩm hết hàng", {
          description: criticalAlert.productName,
          duration: 5000,
        });
      } else {
        const lowStockAlert = alerts[0];
        if (lowStockAlert) {
          toast.warning("Cảnh báo: Có sản phẩm sắp hết hàng", {
            description: lowStockAlert.productName,
            duration: 5000,
          });
        }
      }
    }
  },
  
  markAlertAsRead: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, isRead: true } : a
      ),
    })),
  
  clearAlerts: () => set({ alerts: [] }),
  
  getInventoryByProduct: (productId) =>
    get().inventoryItems.filter((item) => item.productId === productId),
  
  getInventoryByWarehouse: (warehouseId) =>
    get().inventoryItems.filter((item) => item.warehouseId === warehouseId),
  
  getTotalProductQuantity: (productId: string): number =>
    get().inventoryItems
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantityAvailable, 0),
  
  fetchInventory: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
      if (params?.search) query.set('search', params.search);
      
      const url = `${API_BASE}/inventory${query.toString() ? `?${query}` : ''}`;
      const inventoryItems = await fetchListData<InventoryItem>(url);
      set({ inventoryItems, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  // ============================================
  // SUPPLIER ACTIONS
  // ============================================
  
  setSuppliers: (suppliers) => set({ suppliers }),
  
  addSupplier: (supplier) =>
    set((state) => ({
      suppliers: [...state.suppliers, supplier],
    })),
  
  updateSupplier: (id, updates) =>
    set((state) => ({
      suppliers: state.suppliers.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      ),
    })),
  
  deleteSupplier: (id) =>
    set((state) => ({
      suppliers: state.suppliers.filter((s) => s.id !== id),
    })),
  
  getSupplierById: (id) => get().suppliers.find((s) => s.id === id),
  
  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const suppliers = await fetchListData<Supplier>(`${API_BASE}/suppliers`);
      set({ suppliers, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  // ============================================
  // PURCHASE ORDER ACTIONS
  // ============================================
  
  setPurchaseOrders: (orders) => set({ purchaseOrders: orders }),
  
  addPurchaseOrder: (order) =>
    set((state) => ({
      purchaseOrders: [...state.purchaseOrders, order],
    })),
  
  updatePurchaseOrder: (id, updates) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((po) =>
        po.id === id ? { ...po, ...updates, updatedAt: new Date() } : po
      ),
    })),
  
  deletePurchaseOrder: (id) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id),
    })),
  
  approvePurchaseOrder: (id, approvedBy) => {
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((po) =>
        po.id === id
          ? {
              ...po,
              status: PurchaseOrderStatus.APPROVED,
              approvedBy,
              approvedAt: new Date(),
              updatedAt: new Date(),
            }
          : po
      ),
    }));
    toast.success("Đã duyệt đơn đặt hàng");
  },

  cancelPurchaseOrder: (id, reason) => {
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((po) =>
        po.id === id
          ? {
              ...po,
              status: PurchaseOrderStatus.CANCELLED,
              cancelledReason: reason,
              updatedAt: new Date(),
            }
          : po
      ),
    }));

    const po = get().purchaseOrders.find((p) => p.id === id);
    if (po) {
      get().addAuditLog({
        action: AuditAction.REJECT,
        entity: 'PurchaseOrder',
        entityId: id,
        entityName: po.orderNumber,
        userId: 'system',
        userName: 'System',
        reason,
        notes: `Hủy đơn đặt hàng: ${po.orderNumber}`,
      });
    }
    toast.info("Đã hủy đơn đặt hàng");
  },
  
  sendPurchaseOrder: (id) => {
    const po = get().purchaseOrders.find((p) => p.id === id);
    if (!po || po.status !== PurchaseOrderStatus.APPROVED) return;
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((p) =>
        p.id === id
          ? {
              ...p,
              status: PurchaseOrderStatus.SENT,
              updatedAt: new Date(),
            }
          : p
      ),
    }));
  },
  
  getPurchaseOrderById: (id) => get().purchaseOrders.find((po) => po.id === id),
  
  fetchPurchaseOrders: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.supplierId) query.set('supplierId', params.supplierId);
      
      const url = `${API_BASE}/purchase-order${query.toString() ? `?${query}` : ''}`;
      const purchaseOrders = await fetchListData<PurchaseOrder>(url);
      set({ purchaseOrders, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  createPurchaseOrder: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const order = await fetchJSON<PurchaseOrder>(`${API_BASE}/purchase-order`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((state) => ({
        purchaseOrders: [order, ...state.purchaseOrders],
        isLoading: false,
      }));
      toast.success("Tạo đơn đặt hàng thành công");
      return order;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      toast.error("Tạo đơn đặt hàng thất bại");
      throw error;
    }
  },
  
  updatePurchaseOrderStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const order = await fetchJSON<PurchaseOrder>(`${API_BASE}/purchase-order`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === id ? order : po
        ),
        isLoading: false,
      }));
      return order;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  // ============================================
  // GOODS RECEIPT ACTIONS
  // ============================================
  
  setGoodsReceipts: (receipts) => set({ goodsReceipts: receipts }),
  
  addGoodsReceipt: (receipt) =>
    set((state) => ({
      goodsReceipts: [...state.goodsReceipts, receipt],
    })),
  
  updateGoodsReceipt: (id, updates) =>
    set((state) => ({
      goodsReceipts: state.goodsReceipts.map((gr) =>
        gr.id === id ? { ...gr, ...updates, updatedAt: new Date() } : gr
      ),
    })),
  
  deleteGoodsReceipt: (id) =>
    set((state) => ({
      goodsReceipts: state.goodsReceipts.filter((gr) => gr.id !== id),
    })),
  
  completeGoodsReceipt: (id) => {
    const receipt = get().goodsReceipts.find((gr) => gr.id === id);
    if (!receipt) return;

    receipt.items.forEach((item) => {
      get().adjustInventoryQuantity(
        item.productId,
        item.warehouseId,
        item.acceptedQuantity,
        'add'
      );
    });

    set((state) => ({
      goodsReceipts: state.goodsReceipts.map((gr) =>
        gr.id === id
          ? {
              ...gr,
              status: GoodsReceiptStatus.COMPLETED,
              updatedAt: new Date(),
            }
          : gr
      ),
    }));

    get().checkLowStockAlerts();
    toast.success("Hoàn thành nhập kho");
  },
  
  getGoodsReceiptById: (id) => get().goodsReceipts.find((gr) => gr.id === id),
  
  fetchGoodsReceipts: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.supplierId) query.set('supplierId', params.supplierId);
      if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
      
      const url = `${API_BASE}/goods-receipt${query.toString() ? `?${query}` : ''}`;
      const goodsReceipts = await fetchListData<GoodsReceipt>(url);
      set({ goodsReceipts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  createGoodsReceipt: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const receipt = await fetchJSON<GoodsReceipt>(`${API_BASE}/goods-receipt`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((state) => ({
        goodsReceipts: [receipt, ...state.goodsReceipts],
        isLoading: false,
      }));
      toast.success("Tạo phiếu nhập kho thành công");
      return receipt;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      toast.error("Tạo phiếu nhập kho thất bại");
      throw error;
    }
  },
  
  // ============================================
  // GOODS ISSUE ACTIONS
  // ============================================
  
  setGoodsIssues: (issues) => set({ goodsIssues: issues }),
  
  addGoodsIssue: (issue) =>
    set((state) => ({
      goodsIssues: [...state.goodsIssues, issue],
    })),
  
  updateGoodsIssue: (id, updates) =>
    set((state) => ({
      goodsIssues: state.goodsIssues.map((gi) =>
        gi.id === id ? { ...gi, ...updates, updatedAt: new Date() } : gi
      ),
    })),
  
  deleteGoodsIssue: (id) =>
    set((state) => ({
      goodsIssues: state.goodsIssues.filter((gi) => gi.id !== id),
    })),
  
  completeGoodsIssue: (id) => {
    const issue = get().goodsIssues.find((gi) => gi.id === id);
    if (!issue) return;

    issue.items.forEach((item) => {
      get().adjustInventoryQuantity(
        item.productId,
        item.warehouseId,
        item.quantity,
        'subtract'
      );
    });

    set((state) => ({
      goodsIssues: state.goodsIssues.map((gi) =>
        gi.id === id
          ? {
              ...gi,
              status: GoodsIssueStatus.COMPLETED,
              updatedAt: new Date(),
            }
          : gi
      ),
    }));

    get().checkLowStockAlerts();
    toast.success("Hoàn thành xuất kho");
  },
  
  getGoodsIssueById: (id) => get().goodsIssues.find((gi) => gi.id === id),
  
  validatePickingList: (issueId, scannedBarcode) => {
    const issue = get().goodsIssues.find((gi) => gi.id === issueId);
    if (!issue) return false;
    
    const product = get().getProductByBarcode(scannedBarcode);
    if (!product) return false;
    
    const item = issue.items.find((i) => i.productId === product.id);
    return !!item;
  },
  
  fetchGoodsIssues: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.reason) query.set('reason', params.reason);
      if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
      
      const url = `${API_BASE}/goods-issue${query.toString() ? `?${query}` : ''}`;
      const goodsIssues = await fetchListData<GoodsIssue>(url);
      set({ goodsIssues, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  createGoodsIssue: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const issue = await fetchJSON<GoodsIssue>(`${API_BASE}/goods-issue`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((state) => ({
        goodsIssues: [issue, ...state.goodsIssues],
        isLoading: false,
      }));
      toast.success("Tạo phiếu xuất kho thành công");
      return issue;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      toast.error("Tạo phiếu xuất kho thất bại");
      throw error;
    }
  },
  
  // ============================================
  // STOCKTAKE ACTIONS
  // ============================================
  
  setStocktakeSessions: (sessions) => set({ stocktakeSessions: sessions }),
  
  addStocktakeSession: (session) =>
    set((state) => ({
      stocktakeSessions: [...state.stocktakeSessions, session],
    })),
  
  updateStocktakeSession: (id, updates) =>
    set((state) => ({
      stocktakeSessions: state.stocktakeSessions.map((st) =>
        st.id === id ? { ...st, ...updates, updatedAt: new Date() } : st
      ),
    })),
  
  deleteStocktakeSession: (id) =>
    set((state) => ({
      stocktakeSessions: state.stocktakeSessions.filter((st) => st.id !== id),
    })),
  
  startStocktake: (id) =>
    set((state) => ({
      stocktakeSessions: state.stocktakeSessions.map((st) =>
        st.id === id
          ? {
              ...st,
              status: StocktakeStatus.IN_PROGRESS,
              startedDate: new Date(),
              updatedAt: new Date(),
            }
          : st
      ),
    })),
  
  completeStocktake: (id) =>
    set((state) => ({
      stocktakeSessions: state.stocktakeSessions.map((st) =>
        st.id === id
          ? {
              ...st,
              status: StocktakeStatus.PENDING_APPROVAL,
              completedDate: new Date(),
              updatedAt: new Date(),
            }
          : st
      ),
    })),
  
  approveStocktake: (id, approvedBy) => {
    const session = get().stocktakeSessions.find((st) => st.id === id);
    if (!session) return;

    session.discrepancies?.forEach((disc) => {
      if ((disc.adjustmentStatus as string) === 'PENDING' && disc.difference !== 0) {
        get().adjustInventoryQuantity(
          disc.productId,
          disc.warehouseId,
          Math.abs(disc.difference),
          disc.difference > 0 ? 'add' : 'subtract'
        );
      }
    });

    set((state) => ({
      stocktakeSessions: state.stocktakeSessions.map((st) =>
        st.id === id
          ? {
              ...st,
              status: StocktakeStatus.APPROVED,
              approvedBy,
              approvedAt: new Date(),
              updatedAt: new Date(),
            }
          : st
      ),
    }));
    toast.success("Đã duyệt kiểm kê");
  },
  
  getStocktakeById: (id) => get().stocktakeSessions.find((st) => st.id === id),
  
  fetchStocktakes: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.warehouseId) query.set('warehouseId', params.warehouseId);
      
      const url = `${API_BASE}/stocktake${query.toString() ? `?${query}` : ''}`;
      const stocktakeSessions = await fetchListData<StocktakeSession>(url);
      set({ stocktakeSessions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  createStocktake: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const session = await fetchJSON<StocktakeSession>(`${API_BASE}/stocktake`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      set((state) => ({
        stocktakeSessions: [session, ...state.stocktakeSessions],
        isLoading: false,
      }));
      toast.success("Tạo phiên kiểm kê thành công");
      return session;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  updateStocktakeStatus: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const session = await fetchJSON<StocktakeSession>(`${API_BASE}/stocktake`, {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates }),
      });
      set((state) => ({
        stocktakeSessions: state.stocktakeSessions.map((st) =>
          st.id === id ? session : st
        ),
        isLoading: false,
      }));
      return session;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  // ============================================
  // AUDIT LOG ACTIONS
  // ============================================
  
  setAuditLogs: (logs) => set({ auditLogs: logs }),
  
  addAuditLog: (log) =>
    set((state) => ({
      auditLogs: [
        {
          ...log,
          id: `log-${Date.now()}`,
          timestamp: new Date(),
        },
        ...state.auditLogs,
      ].slice(0, 1000),
    })),
  
  getAuditLogsByEntity: (entity, entityId) =>
    get().auditLogs.filter(
      (log) => log.entity === entity && log.entityId === entityId
    ),
  
  getRecentAuditLogs: (limit = 30) =>
    get().auditLogs.slice(0, limit),
  
  // ============================================
  // DASHBOARD ACTIONS
  // ============================================
  
  refreshStats: () => {
    const state = get();

    const totalInventoryValue = state.inventoryItems.reduce(
      (sum, item) => {
        const product = state.products.find((p) => p.id === item.productId);
        return sum + (product ? product.costPrice * item.quantityAvailable : 0);
      },
      0
    );

    const lowStockCount = state.inventoryItems.filter((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      return product && item.quantityAvailable <= product.reorderPoint && item.quantityAvailable > 0;
    }).length;

    const outOfStockCount = state.inventoryItems.filter((item) => {
      return item.quantityAvailable === 0;
    }).length;

    const pendingReceipts = state.goodsReceipts.filter(
      (gr) => gr.status === GoodsReceiptStatus.PENDING || gr.status === GoodsReceiptStatus.CONFIRMED
    ).length;

    const pendingIssues = state.goodsIssues.filter(
      (gi) => gi.status === GoodsIssueStatus.PENDING || gi.status === GoodsIssueStatus.CONFIRMED
    ).length;

    const pendingOrders = state.purchaseOrders.filter(
      (po) =>
        po.status === PurchaseOrderStatus.PENDING_APPROVAL ||
        po.status === PurchaseOrderStatus.APPROVED ||
        po.status === PurchaseOrderStatus.SENT ||
        po.status === PurchaseOrderStatus.CONFIRMED
    ).length;

    const activeStocktakes = state.stocktakeSessions.filter(
      (st) => st.status === StocktakeStatus.IN_PROGRESS
    ).length;

    set({
      stats: {
        totalProducts: state.products.length,
        totalWarehouses: state.warehouses.length,
        totalSuppliers: state.suppliers.length,
        totalInventoryValue,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingIssues,
        pendingOrders,
        activeStocktakes,
      },
    });
  },
  
  fetchDashboardStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await fetchJSON<DashboardStats>(`${API_BASE}/reports?type=dashboard`);
      set({ stats, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  getLowStockProducts: () => {
    const state = get();
    const lowStock: { product: Product; totalQuantity: number }[] = [];

    state.products.forEach((product) => {
      const totalQty = state.getTotalProductQuantity(product.id);
      if (totalQty <= product.reorderPoint) {
        lowStock.push({ product, totalQuantity: totalQty });
      }
    });

    return lowStock.sort((a, b) => a.totalQuantity - b.totalQuantity);
  },
  
  getTopProductsByValue: () => {
    const state = get();
    const productsWithValue: { product: Product; totalValue: number }[] = [];

    state.products.forEach((product) => {
      const totalQty = state.getTotalProductQuantity(product.id);
      productsWithValue.push({
        product,
        totalValue: product.costPrice * totalQty,
      });
    });

    return productsWithValue
      .filter((p) => p.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  },
  
  // ============================================
  // DASHBOARD ACTIONS (LIGHTWEIGHT)
  // ============================================

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      // Only fetch aggregated dashboard stats - no inventory items
      const data = await fetchJSON<any>(`${API_BASE}/dashboard`);
      set({ dashboardData: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setDashboardData: (data) => set({ dashboardData: data }),

  // ============================================
  // AUTH ACTIONS
  // ============================================

  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false, dashboardData: null }),

  // ============================================
  // STORE ACTIONS (LIGHTWEIGHT INIT)
  // ============================================

  initializeStore: async () => {
    set({ isLoading: true, error: null });

    try {
      // Lightweight initialization - only essential data
      await Promise.all([
        get().fetchProducts(),
        get().fetchWarehouses(),
        get().fetchDashboard(), // Fetch only aggregated stats
      ]);

      // Note: NOT loading inventoryItems, goodsReceipts, goodsIssues here
      // Each page will load its own data when needed

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  resetStore: () => {
    set({
      products: [],
      warehouses: [],
      inventoryItems: [],
      suppliers: [],
      purchaseOrders: [],
      goodsReceipts: [],
      goodsIssues: [],
      stocktakeSessions: [],
      auditLogs: [],
      alerts: [],
      dashboardData: null,
      stats: {
        totalProducts: 0,
        totalWarehouses: 0,
        totalSuppliers: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        pendingReceipts: 0,
        pendingIssues: 0,
        pendingOrders: 0,
        activeStocktakes: 0,
      },
      isInitialized: false,
    });
  },
}));

// ============================================
// SELECTOR HOOKS
// ============================================

export const useProducts = () => useWarehouseStore((state) => state.products);
export const useWarehouses = () => useWarehouseStore((state) => state.warehouses);
export const useInventoryItems = () => useWarehouseStore((state) => state.inventoryItems);
export const useSuppliers = () => useWarehouseStore((state) => state.suppliers);
export const usePurchaseOrders = () => useWarehouseStore((state) => state.purchaseOrders);
export const useGoodsReceipts = () => useWarehouseStore((state) => state.goodsReceipts);
export const useGoodsIssues = () => useWarehouseStore((state) => state.goodsIssues);
export const useStocktakeSessions = () => useWarehouseStore((state) => state.stocktakeSessions);
export const useAuditLogs = () => useWarehouseStore((state) => state.auditLogs);
export const useAlerts = () => useWarehouseStore((state) => state.alerts);
export const useDashboardStats = () => useWarehouseStore((state) => state.stats);
export const useDashboardData = () => useWarehouseStore((state) => state.dashboardData);
export const useIsLoading = () => useWarehouseStore((state) => state.isLoading);
export const useStoreError = () => useWarehouseStore((state) => state.error);
export const useIsInitialized = () => useWarehouseStore((state) => state.isInitialized);

// ============================================
// ACTION HOOKS
// ============================================

type ProductActions = Pick<
  WarehouseStore,
  "addProduct" | "updateProduct" | "deleteProduct" | "fetchProducts"
>;
type WarehouseActions = Pick<
  WarehouseStore,
  "addWarehouse" | "updateWarehouse" | "deleteWarehouse" | "fetchWarehouses"
>;
type InventoryActions = Pick<
  WarehouseStore,
  | "addInventoryItem"
  | "updateInventoryItem"
  | "deleteInventoryItem"
  | "adjustInventoryQuantity"
  | "checkLowStockAlerts"
  | "fetchInventory"
>;
type SupplierActions = Pick<
  WarehouseStore,
  "addSupplier" | "updateSupplier" | "deleteSupplier" | "fetchSuppliers"
>;
type PurchaseOrderActions = Pick<
  WarehouseStore,
  | "addPurchaseOrder"
  | "updatePurchaseOrder"
  | "deletePurchaseOrder"
  | "approvePurchaseOrder"
  | "fetchPurchaseOrders"
  | "createPurchaseOrder"
  | "updatePurchaseOrderStatus"
>;
type GoodsReceiptActions = Pick<
  WarehouseStore,
  | "addGoodsReceipt"
  | "updateGoodsReceipt"
  | "deleteGoodsReceipt"
  | "completeGoodsReceipt"
  | "fetchGoodsReceipts"
  | "createGoodsReceipt"
>;
type GoodsIssueActions = Pick<
  WarehouseStore,
  | "addGoodsIssue"
  | "updateGoodsIssue"
  | "deleteGoodsIssue"
  | "completeGoodsIssue"
  | "fetchGoodsIssues"
  | "createGoodsIssue"
>;
type StocktakeActions = Pick<
  WarehouseStore,
  | "addStocktakeSession"
  | "updateStocktakeSession"
  | "deleteStocktakeSession"
  | "startStocktake"
  | "completeStocktake"
  | "approveStocktake"
  | "fetchStocktakes"
  | "createStocktake"
  | "updateStocktakeStatus"
>;
type AuditLogActions = Pick<WarehouseStore, "addAuditLog">;
type AlertActions = Pick<WarehouseStore, "markAlertAsRead" | "clearAlerts">;
type DashboardActions = Pick<WarehouseStore, "refreshStats" | "fetchDashboardStats">;

export const useProductActions = (): ProductActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addProduct: state.addProduct,
      updateProduct: state.updateProduct,
      deleteProduct: state.deleteProduct,
      fetchProducts: state.fetchProducts,
    }))
  );

export const useWarehouseActions = (): WarehouseActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addWarehouse: state.addWarehouse,
      updateWarehouse: state.updateWarehouse,
      deleteWarehouse: state.deleteWarehouse,
      fetchWarehouses: state.fetchWarehouses,
    }))
  );

export const useInventoryActions = (): InventoryActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addInventoryItem: state.addInventoryItem,
      updateInventoryItem: state.updateInventoryItem,
      deleteInventoryItem: state.deleteInventoryItem,
      adjustInventoryQuantity: state.adjustInventoryQuantity,
      checkLowStockAlerts: state.checkLowStockAlerts,
      fetchInventory: state.fetchInventory,
    }))
  );

export const useSupplierActions = (): SupplierActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addSupplier: state.addSupplier,
      updateSupplier: state.updateSupplier,
      deleteSupplier: state.deleteSupplier,
      fetchSuppliers: state.fetchSuppliers,
    }))
  );

export const usePurchaseOrderActions = (): PurchaseOrderActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addPurchaseOrder: state.addPurchaseOrder,
      updatePurchaseOrder: state.updatePurchaseOrder,
      deletePurchaseOrder: state.deletePurchaseOrder,
      approvePurchaseOrder: state.approvePurchaseOrder,
      fetchPurchaseOrders: state.fetchPurchaseOrders,
      createPurchaseOrder: state.createPurchaseOrder,
      updatePurchaseOrderStatus: state.updatePurchaseOrderStatus,
    }))
  );

export const useGoodsReceiptActions = (): GoodsReceiptActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addGoodsReceipt: state.addGoodsReceipt,
      updateGoodsReceipt: state.updateGoodsReceipt,
      deleteGoodsReceipt: state.deleteGoodsReceipt,
      completeGoodsReceipt: state.completeGoodsReceipt,
      fetchGoodsReceipts: state.fetchGoodsReceipts,
      createGoodsReceipt: state.createGoodsReceipt,
    }))
  );

export const useGoodsIssueActions = (): GoodsIssueActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addGoodsIssue: state.addGoodsIssue,
      updateGoodsIssue: state.updateGoodsIssue,
      deleteGoodsIssue: state.deleteGoodsIssue,
      completeGoodsIssue: state.completeGoodsIssue,
      fetchGoodsIssues: state.fetchGoodsIssues,
      createGoodsIssue: state.createGoodsIssue,
    }))
  );

export const useStocktakeActions = (): StocktakeActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addStocktakeSession: state.addStocktakeSession,
      updateStocktakeSession: state.updateStocktakeSession,
      deleteStocktakeSession: state.deleteStocktakeSession,
      startStocktake: state.startStocktake,
      completeStocktake: state.completeStocktake,
      approveStocktake: state.approveStocktake,
      fetchStocktakes: state.fetchStocktakes,
      createStocktake: state.createStocktake,
      updateStocktakeStatus: state.updateStocktakeStatus,
    }))
  );

export const useAuditLogActions = (): AuditLogActions =>
  useWarehouseStore(
    useShallow((state) => ({
      addAuditLog: state.addAuditLog,
    }))
  );

export const useAlertActions = (): AlertActions =>
  useWarehouseStore(
    useShallow((state) => ({
      markAlertAsRead: state.markAlertAsRead,
      clearAlerts: state.clearAlerts,
    }))
  );

export const useDashboardActions = (): DashboardActions =>
  useWarehouseStore(
    useShallow((state) => ({
      refreshStats: state.refreshStats,
      fetchDashboardStats: state.fetchDashboardStats,
    }))
  );



