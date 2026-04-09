import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/reports - Get aggregated report data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const warehouseId = searchParams.get('warehouseId');

    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo);
    }

    switch (type) {
      case 'dashboard': {
        // Dashboard KPIs
        const [
          totalProducts,
          totalWarehouses,
          totalSuppliers,
          inventoryItems,
          lowStockCount,
          outOfStockCount,
          pendingReceipts,
          pendingIssues,
          pendingOrders,
          recentReceipts,
          recentIssues,
        ] = await Promise.all([
          prisma.product.count({ where: { isActive: true } }),
          prisma.warehouse.count({ where: { isActive: true } }),
          prisma.supplier.count({ where: { status: 'ACTIVE' } }),
          prisma.inventoryItem.findMany({
            where: warehouseId ? { warehouseId } : undefined,
          }),
          prisma.inventoryItem.count({
            where: {
              ...(warehouseId ? { warehouseId } : {}),
              quantityAvailable: { gt: 0, lte: 10 },
            },
          }),
          prisma.inventoryItem.count({
            where: {
              ...(warehouseId ? { warehouseId } : {}),
              quantityAvailable: { equals: 0 },
            },
          }),
          prisma.goodsReceipt.count({
            where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          }),
          prisma.goodsIssue.count({
            where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          }),
          prisma.purchaseOrder.count({
            where: { status: { in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'] } },
          }),
          prisma.goodsReceipt.findMany({
            where: { receiptDate: dateFilter },
            orderBy: { receiptDate: 'desc' },
            take: 5,
            include: { supplier: true },
          }),
          prisma.goodsIssue.findMany({
            where: { issueDate: dateFilter },
            orderBy: { issueDate: 'desc' },
            take: 5,
          }),
        ]);

        // Calculate total inventory value
        const products = await prisma.product.findMany({
          where: { isActive: true },
        });
        
        const inventoryValue = inventoryItems.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return sum + (product ? product.costPrice * item.quantityAvailable : 0);
        }, 0);

        // Group inventory by category
        const inventoryByCategory = await prisma.product.groupBy({
          by: ['category'],
          where: { isActive: true },
          _count: true,
        });

        return NextResponse.json({
          totalProducts,
          totalWarehouses,
          totalSuppliers,
          totalInventoryValue: inventoryValue,
          lowStockCount,
          outOfStockCount,
          pendingReceipts,
          pendingIssues,
          pendingOrders,
          recentReceipts,
          recentIssues,
          inventoryByCategory,
        });
      }

      case 'inventory': {
        // Inventory report
        const items = await prisma.inventoryItem.findMany({
          where: warehouseId ? { warehouseId } : {},
          include: {
            product: true,
            warehouse: true,
          },
          orderBy: { product: { name: 'asc' } },
        });

        const report = items.map(item => ({
          productId: item.productId,
          productSku: item.product.sku,
          productName: item.product.name,
          category: item.product.category,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse.name,
          location: `${item.locationZone || ''}-${item.locationAisle || ''}/${item.locationRack || ''}/${item.locationShelf || ''}`,
          lotNumber: item.lotNumber,
          quantityTotal: item.quantityTotal,
          quantityAvailable: item.quantityAvailable,
          quantityReserved: item.quantityReserved,
          quantityQuarantine: item.quantityQuarantine,
          quantityDamaged: item.quantityDamaged,
          unitValue: item.product.costPrice,
          totalValue: item.product.costPrice * item.quantityAvailable,
        }));

        return NextResponse.json(report);
      }

      case 'movement': {
        // Stock movement report
        const [receipts, issues] = await Promise.all([
          prisma.goodsReceipt.findMany({
            where: {
              status: 'COMPLETED',
              receiptDate: dateFilter,
              ...(warehouseId ? { warehouseId } : {}),
            },
            include: {
              supplier: true,
              warehouse: true,
              items: { include: { product: true } },
            },
            orderBy: { receiptDate: 'desc' },
          }),
          prisma.goodsIssue.findMany({
            where: {
              status: 'COMPLETED',
              issueDate: dateFilter,
              ...(warehouseId ? { warehouseId } : {}),
            },
            include: {
              warehouse: true,
              items: { include: { product: true } },
            },
            orderBy: { issueDate: 'desc' },
          }),
        ]);

        return NextResponse.json({ receipts, issues });
      }

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
