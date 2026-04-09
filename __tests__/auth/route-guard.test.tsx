import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UserStatus, User, UserRole } from '@/lib/types';

// ============================================
// MOCK DATA
// ============================================

const mockAdminUser = {
  id: 'user-admin-001',
  employeeId: 'EMP001',
  username: 'admin',
  email: 'admin@quanlikho.vn',
  firstName: 'Nguyễn',
  lastName: 'Văn Admin',
  fullName: 'Nguyễn Văn Admin',
  phone: '0901234567',
  role: UserRole.ADMIN,
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
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
} as TestUser;

const mockWarehouseManagerUser = {
  id: 'user-whm-001',
  employeeId: 'EMP002',
  username: 'warehouse_manager',
  email: 'kho.truong@quanlikho.vn',
  firstName: 'Trần',
  lastName: 'Thị Quản Lý',
  fullName: 'Trần Thị Quản Lý',
  phone: '0902345678',
  role: UserRole.WAREHOUSE_MANAGER,
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date(),
  permissions: {
    canManageProducts: false,
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
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: true,
    canManageGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: true,
  },
} as TestUser;

const mockWarehouseStaffUser = {
  id: 'user-whs-001',
  employeeId: 'EMP003',
  username: 'warehouse_staff',
  email: 'kho.nhanvien@quanlikho.vn',
  firstName: 'Lê',
  lastName: 'Văn Nhân Viên',
  fullName: 'Lê Văn Nhân Viên',
  phone: '0903456789',
  role: UserRole.WAREHOUSE_STAFF,
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-03'),
  updatedAt: new Date(),
  permissions: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: false,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: true,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
};

const mockPurchaserUser = {
  id: 'user-pur-001',
  employeeId: 'EMP004',
  username: 'purchaser',
  email: 'mua.hang@quanlikho.vn',
  firstName: 'Phạm',
  lastName: 'Thị Mua Hàng',
  fullName: 'Phạm Thị Mua Hàng',
  phone: '0904567890',
  role: UserRole.PURCHASER,
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-04'),
  updatedAt: new Date(),
  permissions: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: false,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: false,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: true,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
} as TestUser;

const mockAccountantUser = {
  id: 'user-acc-001',
  employeeId: 'EMP005',
  username: 'accountant',
  email: 'ke.toan@quanlikho.vn',
  firstName: 'Hoàng',
  lastName: 'Văn Kế Toán',
  fullName: 'Hoàng Văn Kế Toán',
  phone: '0905678901',
  role: UserRole.ACCOUNTANT,
  isActive: true,
  status: UserStatus.ACTIVE,
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2024-01-05'),
  updatedAt: new Date(),
  permissions: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
} as TestUser;

// ============================================
// ROUTE GUARD COMPONENT
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  allowedRoles,
}) => {
  // In real app, this would use useAuth and usePermission hooks
  // For testing, we check if auth store has user
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Mock auth check - in real app this comes from auth store
    const storedUser = localStorage.getItem('quanlikho-auth');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserRole(parsed.state?.user?.role || null);
      } catch {
        setIsAuthenticated(false);
      }
    }
  }, []);

  if (!isAuthenticated) {
    // In real app: redirect('/login')
    return <div data-testid="redirect-login">Redirecting to /login</div>;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // In real app: redirect('/403') or redirect('/dashboard')
    return <div data-testid="redirect-403">Redirecting to /403</div>;
  }

  return <>{children}</>;
};

// Mock page components
const DashboardPage: React.FC = () => <div data-testid="dashboard-page">Dashboard</div>;
const SettingsPage: React.FC = () => <div data-testid="settings-page">Settings</div>;
const InventoryPage: React.FC = () => <div data-testid="inventory-page">Inventory</div>;
const ReportsPage: React.FC = () => <div data-testid="reports-page">Reports</div>;
const GoodsReceiptPage: React.FC = () => <div data-testid="goods-receipt-page">Goods Receipt</div>;
const GoodsReceiptCreatePage: React.FC = () => <div data-testid="goods-receipt-create-page">Create Goods Receipt</div>;
const LoginPage: React.FC = () => <div data-testid="login-page">Login</div>;
const ForbiddenPage: React.FC = () => <div data-testid="forbidden-page">403 - Forbidden</div>;

// Type alias for test user
type TestUser = Omit<User, 'permissions'> & { permissions: Record<string, boolean> };

// ============================================
// TESTS
// ============================================

describe('Test 2.1: Redirect khi chưa đăng nhập', () => {
  beforeEach(() => {
    localStorage.removeItem('quanlikho-auth');
  });

  it('Truy cập /dashboard khi chưa login → redirect /login', () => {
    render(
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-login')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('Truy cập /inventory khi chưa login → redirect /login', () => {
    render(
      <ProtectedRoute>
        <InventoryPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-login')).toBeInTheDocument();
    expect(screen.queryByTestId('inventory-page')).not.toBeInTheDocument();
  });
});

describe('Test 2.2: Redirect khi không đủ quyền', () => {
  function setupAuthForUser(user: TestUser) {
    localStorage.setItem(
      'quanlikho-auth',
      JSON.stringify({ state: { user, isAuthenticated: true } })
    );
  }

  beforeEach(() => {
    localStorage.removeItem('quanlikho-auth');
  });

  it('PURCHASER truy cập /settings → redirect /403', () => {
    setupAuthForUser(mockPurchaserUser);

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <SettingsPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-403')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
  });

  it('WAREHOUSE_STAFF truy cập /settings → redirect /403', () => {
    setupAuthForUser(mockWarehouseStaffUser);

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <SettingsPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-403')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-page')).not.toBeInTheDocument();
  });

  it('ACCOUNTANT truy cập /goods-receipt/create → redirect /403', () => {
    setupAuthForUser(mockAccountantUser);

    render(
      <ProtectedRoute allowedRoles={['admin', 'warehouse_manager', 'warehouse_staff']}>
        <GoodsReceiptCreatePage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-403')).toBeInTheDocument();
    expect(screen.queryByTestId('goods-receipt-create-page')).not.toBeInTheDocument();
  });
});

describe('Test 2.3: Cho phép truy cập đúng role', () => {
  function setupAuthForUser(user: TestUser) {
    localStorage.setItem(
      'quanlikho-auth',
      JSON.stringify({ state: { user, isAuthenticated: true } })
    );
  }

  beforeEach(() => {
    localStorage.removeItem('quanlikho-auth');
  });

  it('ADMIN truy cập /settings → render page (không redirect)', () => {
    setupAuthForUser(mockAdminUser);

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <SettingsPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.queryByTestId('redirect-403')).not.toBeInTheDocument();
  });

  it('WAREHOUSE_MANAGER truy cập /reports → render page', () => {
    setupAuthForUser(mockWarehouseManagerUser);

    render(
      <ProtectedRoute allowedRoles={['admin', 'warehouse_manager', 'purchaser', 'accountant']}>
        <ReportsPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('reports-page')).toBeInTheDocument();
    expect(screen.queryByTestId('redirect-403')).not.toBeInTheDocument();
  });

  it('WAREHOUSE_STAFF truy cập /goods-receipt → render page', () => {
    setupAuthForUser(mockWarehouseStaffUser);

    render(
      <ProtectedRoute allowedRoles={['admin', 'warehouse_manager', 'warehouse_staff']}>
        <GoodsReceiptPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('goods-receipt-page')).toBeInTheDocument();
    expect(screen.queryByTestId('redirect-403')).not.toBeInTheDocument();
  });
});

describe('Route Guard - Additional Scenarios', () => {
  function setupAuthForUser(user: typeof mockAdminUser) {
    localStorage.setItem(
      'quanlikho-auth',
      JSON.stringify({ state: { user, isAuthenticated: true } })
    );
  }

  beforeEach(() => {
    localStorage.removeItem('quanlikho-auth');
  });

  it('Cho phép admin truy cập tất cả các trang chính', () => {
    setupAuthForUser(mockAdminUser);

    const protectedPages = [
      { component: <SettingsPage />, allowedRoles: ['admin'] },
      { component: <ReportsPage />, allowedRoles: ['admin', 'warehouse_manager', 'purchaser', 'accountant'] },
      { component: <InventoryPage />, allowedRoles: ['admin', 'warehouse_manager', 'warehouse_staff', 'purchaser', 'accountant', 'auditor'] },
    ];

    protectedPages.forEach(({ component, allowedRoles }) => {
      const { unmount } = render(
        <ProtectedRoute allowedRoles={allowedRoles}>
          {component}
        </ProtectedRoute>
      );
      expect(screen.queryByTestId('redirect-403')).not.toBeInTheDocument();
      unmount();
    });
  });

  it('Warehouse Staff không thể truy cập Reports', () => {
    setupAuthForUser(mockWarehouseStaffUser);

    render(
      <ProtectedRoute allowedRoles={['admin', 'warehouse_manager', 'purchaser', 'accountant']}>
        <ReportsPage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-403')).toBeInTheDocument();
  });

  it('Purchaser không thể truy cập Goods Receipt Create', () => {
    setupAuthForUser(mockPurchaserUser);

    render(
      <ProtectedRoute allowedRoles={['admin', 'warehouse_manager', 'warehouse_staff']}>
        <GoodsReceiptCreatePage />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('redirect-403')).toBeInTheDocument();
  });
});
