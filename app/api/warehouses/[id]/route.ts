import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/warehouses/[id] - Get single warehouse with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                category: true,
                unit: true,
                costPrice: true,
                sellingPrice: true,
                reorderPoint: true,
              }
            }
          },
          orderBy: [
            { locationZone: 'asc' },
            { locationRack: 'asc' },
            { locationShelf: 'asc' },
          ]
        }
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    // Group by location: Zone -> Rack -> Shelf
    const groupedByZone: Record<string, Record<string, typeof warehouse.inventoryItems>> = {};
    
    warehouse.inventoryItems.forEach((item) => {
      const zone = item.locationZone || 'None';
      const rack = item.locationRack || 'None';
      
      if (!groupedByZone[zone]) {
        groupedByZone[zone] = {};
      }
      if (!groupedByZone[zone][rack]) {
        groupedByZone[zone][rack] = [];
      }
      groupedByZone[zone][rack].push(item);
    });

    const stats = {
      itemCount: warehouse.inventoryItems.length,
      totalValue: warehouse.inventoryItems.reduce((sum, item) => {
        return sum + (item.quantityAvailable * (item.product?.costPrice || 0));
      }, 0),
      lowStockCount: warehouse.inventoryItems.filter((item) => {
        return item.quantityAvailable <= (item.product?.reorderPoint || 0);
      }).length,
    };

    return NextResponse.json({
      ...warehouse,
      inventoryItems: undefined,
      groupedByZone,
      stats,
    });
  } catch (error) {
    console.error('GET /api/warehouses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch warehouse' }, { status: 500 });
  }
}
