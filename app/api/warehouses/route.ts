import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/warehouses - Get all warehouses with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const includeStats = searchParams.get('includeStats') !== 'false';

    const where: any = {};
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (includeStats) {
      // Get warehouses with inventory stats
      const warehouses = await prisma.warehouse.findMany({
        where,
        include: {
          inventoryItems: {
            include: {
              product: {
                select: {
                  costPrice: true,
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
      });

      // Calculate stats for each warehouse
      const warehousesWithStats = warehouses.map((warehouse) => {
        const itemCount = warehouse.inventoryItems.length;
        const totalValue = warehouse.inventoryItems.reduce((sum, item) => {
          const costPrice = item.product?.costPrice || 0;
          return sum + (item.quantityAvailable * costPrice);
        }, 0);

        return {
          ...warehouse,
          inventoryItems: undefined, // Remove nested data from response
          _stats: {
            itemCount,
            totalValue,
          }
        };
      });

      return NextResponse.json({ data: warehousesWithStats });
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: warehouses });
  } catch (error) {
    console.error('GET /api/warehouses error:', error);
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

// GET /api/warehouses/[id] - Get single warehouse with details
export async function GET_BY_ID(id: string) {
  try {
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
      return null;
    }

    // Group by location
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

    return {
      ...warehouse,
      groupedByZone,
      stats,
    };
  } catch (error) {
    console.error('GET warehouse by id error:', error);
    throw error;
  }
}

// POST /api/warehouses - Create warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const warehouse = await prisma.warehouse.create({
      data: body,
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error('POST /api/warehouses error:', error);
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
}
