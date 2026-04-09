import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/dashboard - Get aggregated dashboard stats (lightweight)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');

    // Get all stats in parallel - no inventory items loaded
    const [
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingIssues,
      pendingOrders,
      recentReceipts,
      recentIssues,
      activeStocktakes,
    ] = await Promise.all([
      // Basic counts
      prisma.product.count({ where: { isActive: true } }),
      prisma.warehouse.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { status: 'ACTIVE' } }),

      // Low stock - lấy hết inventory items rồi filter ở JS
      prisma.inventoryItem.findMany({
        where: warehouseId ? { warehouseId } : {},
        include: { product: { select: { reorderPoint: true } } },
      }),

      // Out of stock
      prisma.inventoryItem.count({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          quantityAvailable: 0,
        },
      }),

      // Pending counts
      prisma.goodsReceipt.count({
        where: { status: { in: ['PENDING', 'CONFIRMED', 'DRAFT'] } },
      }),
      prisma.goodsIssue.count({
        where: { status: { in: ['PENDING', 'CONFIRMED', 'DRAFT'] } },
      }),
      prisma.purchaseOrder.count({
        where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'SENT'] } },
      }),

      // Recent activity (limit 10 each)
      prisma.goodsReceipt.findMany({
        orderBy: { receiptDate: 'desc' },
        take: 10,
        include: {
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
        },
      }),
      prisma.goodsIssue.findMany({
        orderBy: { issueDate: 'desc' },
        take: 10,
        include: {
          warehouse: { select: { id: true, name: true } },
        },
      }),

      // Active stocktakes
      prisma.stocktakeSession.count({
        where: { status: { in: ['IN_PROGRESS', 'PENDING_APPROVAL'] } },
      }),
    ]);

    // Calculate low stock count (items where quantity <= reorderPoint)
    const lowStockCount = lowStockItems.filter(
      item => item.quantityAvailable > 0 && item.quantityAvailable <= (item.product?.reorderPoint ?? 10)
    ).length;

    // Get top products by issue volume this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const topProductsRaw = await prisma.goodsIssueItem.groupBy({
      by: ['productId'],
      where: {
        goodsIssue: {
          status: 'COMPLETED',
          issueDate: { gte: startOfMonth },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    // Get product details for top products
    const productIds = topProductsRaw.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    const topProducts = topProductsRaw.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        sku: product?.sku || '',
        totalQuantity: item._sum.quantity || 0,
      };
    });

    // Get inventory by category (using Prisma ORM instead of raw SQL)
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        quantityAvailable: { gt: 0 },
      },
      include: {
        product: { select: { category: true, costPrice: true } },
      },
    });

    // Aggregate by category
    const categoryMap = new Map<string, { totalValue: number; productCount: Set<string> }>();
    inventoryItems.forEach(item => {
      const category = item.product?.category || 'OTHER';
      const existing = categoryMap.get(category) || { totalValue: 0, productCount: new Set() };
      existing.totalValue += Number(item.quantityAvailable) * Number(item.product?.costPrice || 0);
      existing.productCount.add(item.productId);
      categoryMap.set(category, existing);
    });

    const inventoryByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalValue: Math.round(data.totalValue),
      productCount: data.productCount.size,
    }));

    return NextResponse.json({
      // Basic stats
      totalProducts,
      totalWarehouses,
      totalSuppliers,
      lowStockCount,
      outOfStockCount: outOfStockItems,
      pendingReceipts,
      pendingIssues,
      pendingOrders,
      activeStocktakes,

      // Recent activity
      recentReceipts: recentReceipts.map(r => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        supplierName: r.supplier?.name || 'N/A',
        warehouseName: r.warehouse?.name || 'N/A',
        totalValue: r.totalValue,
        receiptDate: r.receiptDate,
        status: r.status,
      })),
      recentIssues: recentIssues.map(gi => ({
        id: gi.id,
        issueNumber: gi.issueNumber,
        warehouseName: gi.warehouse?.name || 'N/A',
        totalValue: gi.totalValue,
        issueDate: gi.issueDate,
        status: gi.status,
      })),

      // Charts data
      topProducts,
      inventoryByCategory,

      // Loading timestamps for cache invalidation
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Dashboard API Error]', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}