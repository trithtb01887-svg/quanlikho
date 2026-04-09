import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/stocktake - Get all stocktake sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');
    const type = searchParams.get('type');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (type) {
      where.type = type;
    }

    const [sessions, total] = await Promise.all([
      prisma.stocktakeSession.findMany({
        where,
        include: {
          warehouse: true,
          assignedToUser: {
            select: { id: true, fullName: true, email: true },
          },
          discrepancies: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.stocktakeSession.count({ where }),
    ]);

    return NextResponse.json({
      data: sessions,
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
    console.error('GET /api/stocktake error:', error);
    return NextResponse.json({ error: 'Failed to fetch stocktake sessions' }, { status: 500 });
  }
}

// POST /api/stocktake - Create stocktake session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { discrepancies, ...sessionData } = body;

    // Generate stocktake number
    const count = await prisma.stocktakeSession.count();
    const stocktakeNumber = `STK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const session = await prisma.stocktakeSession.create({
      data: {
        stocktakeNumber,
        type: body.type,
        name: body.name,
        description: body.description,
        warehouseId: body.warehouseId,
        area: body.area,
        zones: body.zones || [],
        status: body.status || 'DRAFT',
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
        assignedTo: body.assignedTo,
        counters: body.counters,
        notes: body.notes,
        createdBy: body.createdBy,
        discrepancies: discrepancies ? {
          create: discrepancies.map((disc: any) => ({
            productId: disc.productId,
            productSku: disc.productSku,
            productName: disc.productName,
            unit: disc.unit || 'PIECE',
            warehouseId: disc.warehouseId,
            locationZone: disc.locationZone,
            locationAisle: disc.locationAisle,
            locationRack: disc.locationRack,
            locationShelf: disc.locationShelf,
            systemQuantity: disc.systemQuantity || 0,
            countedQuantity: disc.countedQuantity || 0,
            difference: disc.difference || 0,
            variancePercentage: disc.variancePercentage || 0,
            lotNumber: disc.lotNumber,
            expiryDate: disc.expiryDate ? new Date(disc.expiryDate) : null,
            reason: disc.reason,
            adjustmentStatus: disc.adjustmentStatus || 'PENDING',
            notes: disc.notes,
          })),
        } : undefined,
      },
      include: {
        warehouse: true,
        discrepancies: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('POST /api/stocktake error:', error);
    return NextResponse.json({ error: 'Failed to create stocktake session' }, { status: 500 });
  }
}

// PATCH /api/stocktake - Update stocktake session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, discrepancies, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // If completing stocktake, apply adjustments with transaction to prevent race condition
    if (updateData.status === 'APPROVED' && discrepancies) {
      const userId = request.headers.get("x-user-id") ?? "system";
      const userName = request.headers.get("x-user-name") ?? "System";

      await prisma.$transaction(async (tx) => {
        for (const disc of discrepancies) {
          if (disc.adjustmentStatus === 'APPROVED' && disc.difference !== 0) {
            // Read current inventory within transaction
            const inventory = await tx.inventoryItem.findFirst({
              where: {
                productId: disc.productId,
                warehouseId: disc.warehouseId,
              },
            });

            if (!inventory) {
              throw new Error(`Không tìm thấy sản phẩm ${disc.productName} trong kho`);
            }

            // For negative adjustments (stock loss), check if enough stock available
            if (disc.difference < 0 && inventory.quantityAvailable < Math.abs(disc.difference)) {
              throw new Error(
                `Không đủ hàng tồn kho cho sản phẩm ${disc.productName}. ` +
                `Cần giảm: ${Math.abs(disc.difference)}, Khả dụng: ${inventory.quantityAvailable}`
              );
            }

            // Calculate new quantity after adjustment
            const newQuantityTotal = inventory.quantityTotal + disc.difference;
            const newQuantityAvailable = Math.max(
              0,
              newQuantityTotal - inventory.quantityReserved - inventory.quantityQuarantine - inventory.quantityDamaged
            );

            // Update inventory
            await tx.inventoryItem.update({
              where: {
                id: inventory.id,
              },
              data: {
                quantityTotal: newQuantityTotal,
                quantityAvailable: newQuantityAvailable,
                lastStocktakeDate: new Date(),
              },
            });

            // Create audit log
            await tx.auditLog.create({
              data: {
                action: "STOCKTAKE_ADJUSTMENT",
                entity: "InventoryItem",
                entityId: inventory.id,
                entityName: disc.productName,
                userId: userId,
                userName: userName,
                oldValue: JSON.stringify({
                  quantityTotal: inventory.quantityTotal,
                  quantityAvailable: inventory.quantityAvailable,
                }),
                newValue: JSON.stringify({
                  quantityTotal: newQuantityTotal,
                  quantityAvailable: newQuantityAvailable,
                }),
                reason: disc.reason,
                metadata: JSON.stringify({
                  stocktakeSessionId: id,
                  difference: disc.difference,
                  systemQuantity: disc.systemQuantity,
                  countedQuantity: disc.countedQuantity,
                }),
              },
            });
          }
        }
      });
    }

    const session = await prisma.stocktakeSession.update({
      where: { id },
      data: {
        ...updateData,
        startedDate: updateData.status === 'IN_PROGRESS' ? new Date() : undefined,
        completedDate: updateData.status === 'PENDING_APPROVAL' ? new Date() : undefined,
        approvedAt: updateData.approvedBy ? new Date() : undefined,
      },
      include: {
        warehouse: true,
        discrepancies: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('PATCH /api/stocktake error:', error);
    return NextResponse.json({ error: 'Failed to update stocktake session' }, { status: 500 });
  }
}
