import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/inventory - Get all inventory items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouseId = searchParams.get('warehouseId');
    const search = searchParams.get('search');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { product: { barcode: { contains: search, mode: 'insensitive' } } },
        { lotNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
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
              isESDSensitive: true,
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST /api/inventory - Create inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const item = await prisma.inventoryItem.create({
      data: {
        productId: body.productId,
        warehouseId: body.warehouseId,
        locationZone: body.locationZone,
        locationAisle: body.locationAisle,
        locationRack: body.locationRack,
        locationShelf: body.locationShelf,
        locationBin: body.locationBin,
        lotNumber: body.lotNumber,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        quantityTotal: body.quantityTotal || 0,
        quantityAvailable: body.quantityAvailable || 0,
        quantityReserved: body.quantityReserved || 0,
        quantityQuarantine: body.quantityQuarantine || 0,
        quantityDamaged: body.quantityDamaged || 0,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}

// PATCH /api/inventory - Update inventory item
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...updateData,
        expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined,
        manufacturingDate: updateData.manufacturingDate ? new Date(updateData.manufacturingDate) : undefined,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}
