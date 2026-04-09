import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Zod validation schema for goods receipt
const GoodsReceiptItemSchema = z.object({
  productId: z.string().min(1),
  productSku: z.string().optional(),
  productName: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  poItemId: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.union([z.string(), z.date()]).optional().nullable(),
  manufacturingDate: z.union([z.string(), z.date()]).optional().nullable(),
  receivedQuantity: z.number().min(0).optional(),
  acceptedQuantity: z.number().min(0).optional(),
  rejectedQuantity: z.number().min(0).optional(),
  quarantineQuantity: z.number().min(0).optional(),
  locationZone: z.string().optional(),
  locationAisle: z.string().optional(),
  locationRack: z.string().optional(),
  locationShelf: z.string().optional(),
  notes: z.string().optional(),
});

const GoodsReceiptSchema = z.object({
  warehouseId: z.string().min(1, "Thiếu warehouseId"),
  supplierId: z.string().optional(),
  items: z.array(GoodsReceiptItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
  receiptDate: z.union([z.string(), z.date()]).optional(),
  receivedBy: z.string().min(1, "Thiếu receivedBy"),
  grnNumber: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalValue: z.number().optional(),
  status: z.string().optional(),
  inspectedBy: z.string().optional(),
  inspectedAt: z.union([z.string(), z.date()]).optional().nullable(),
  approvedBy: z.string().optional(),
  approvedAt: z.union([z.string(), z.date()]).optional().nullable(),
  notes: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
});

// GET /api/goods-receipt - Get all goods receipts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const warehouseId = searchParams.get('warehouseId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (dateFrom || dateTo) {
      where.receiptDate = {};
      if (dateFrom) {
        where.receiptDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.receiptDate.lte = new Date(dateTo);
      }
    }

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          receivedByUser: {
            select: { id: true, fullName: true, email: true },
          },
          items: {
            include: {
              product: true,
              serialNumbers: true,
            },
          },
        },
        orderBy: { receiptDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);

    return NextResponse.json({
      data: receipts,
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
    console.error('GET /api/goods-receipt error:', error);
    return NextResponse.json({ error: 'Failed to fetch goods receipts' }, { status: 500 });
  }
}

// POST /api/goods-receipt - Create goods receipt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const parsed = GoodsReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const validatedBody = parsed.data;
    const { items, ...receiptData } = validatedBody;

    // Generate receipt number
    const count = await prisma.goodsReceipt.count();
    const receiptNumber = `GR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const receipt = await prisma.goodsReceipt.create({
      data: {
        receiptNumber,
        grnNumber: body.grnNumber,
        referenceType: body.referenceType,
        referenceId: body.referenceId,
        referenceNumber: body.referenceNumber,
        supplierId: body.supplierId,
        subtotal: body.subtotal || 0,
        taxAmount: body.taxAmount || 0,
        totalValue: body.totalValue || 0,
        status: body.status || 'DRAFT',
        receiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        receivedBy: body.receivedBy,
        inspectedBy: body.inspectedBy,
        inspectedAt: body.inspectedAt ? new Date(body.inspectedAt) : null,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        warehouseId: body.warehouseId,
        notes: body.notes,
        attachmentUrls: body.attachmentUrls || [],
        items: items ? {
          create: items.map((item: any) => ({
            productId: item.productId,
            productSku: item.productSku,
            productName: item.productName,
            unit: item.unit || 'PIECE',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            poItemId: item.poItemId,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            receivedQuantity: item.receivedQuantity || 0,
            acceptedQuantity: item.acceptedQuantity || 0,
            rejectedQuantity: item.rejectedQuantity || 0,
            quarantineQuantity: item.quarantineQuantity || 0,
            locationZone: item.locationZone,
            locationAisle: item.locationAisle,
            locationRack: item.locationRack,
            locationShelf: item.locationShelf,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // If status is COMPLETED, update inventory with transaction to prevent race condition
    if (receipt.status === 'COMPLETED' && items) {
      const userId = request.headers.get("x-user-id") ?? "system";
      const userName = request.headers.get("x-user-name") ?? "System";

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const receivedQty = item.acceptedQuantity || item.receivedQuantity || 0;
          const lotNumber = item.lotNumber || '';

          // Read current inventory within transaction
          const inventory = await tx.inventoryItem.findFirst({
            where: {
              productId: item.productId,
              warehouseId: body.warehouseId,
              lotNumber: lotNumber,
            },
          });

          if (!inventory) {
            // Create new inventory item
            const newInventory = await tx.inventoryItem.create({
              data: {
                productId: item.productId,
                warehouseId: body.warehouseId,
                lotNumber: lotNumber,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                locationZone: item.locationZone,
                locationAisle: item.locationAisle,
                locationRack: item.locationRack,
                locationShelf: item.locationShelf,
                quantityTotal: receivedQty,
                quantityAvailable: receivedQty,
                lastReceiptDate: new Date(),
              },
            });

            // Create audit log for new inventory
            await tx.auditLog.create({
              data: {
                action: "GOODS_RECEIPT",
                entity: "InventoryItem",
                entityId: newInventory.id,
                entityName: item.productName,
                userId: userId,
                userName: userName,
                oldValue: null,
                newValue: JSON.stringify({
                  quantityTotal: receivedQty,
                  quantityAvailable: receivedQty,
                }),
                metadata: JSON.stringify({
                  goodsReceiptId: receipt.id,
                  receiptNumber: receipt.receiptNumber,
                  receivedQty: receivedQty,
                  lotNumber: lotNumber,
                }),
              },
            });
          } else {
            // Calculate new quantity after receipt
            const newQuantityTotal = inventory.quantityTotal + receivedQty;
            const newQuantityAvailable = Math.max(
              0,
              newQuantityTotal - inventory.quantityReserved - inventory.quantityQuarantine - inventory.quantityDamaged
            );

            // Update existing inventory
            await tx.inventoryItem.update({
              where: {
                id: inventory.id,
              },
              data: {
                quantityTotal: newQuantityTotal,
                quantityAvailable: newQuantityAvailable,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : inventory.expiryDate,
                locationZone: item.locationZone || inventory.locationZone,
                locationAisle: item.locationAisle || inventory.locationAisle,
                locationRack: item.locationRack || inventory.locationRack,
                locationShelf: item.locationShelf || inventory.locationShelf,
                lastReceiptDate: new Date(),
              },
            });

            // Create audit log
            await tx.auditLog.create({
              data: {
                action: "GOODS_RECEIPT",
                entity: "InventoryItem",
                entityId: inventory.id,
                entityName: item.productName,
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
                metadata: JSON.stringify({
                  goodsReceiptId: receipt.id,
                  receiptNumber: receipt.receiptNumber,
                  receivedQty: receivedQty,
                  lotNumber: lotNumber,
                }),
              },
            });
          }
        }
      });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    console.error('[API_ERROR] POST /api/goods-receipt:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("Không đủ hàng tồn kho")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Không tìm thấy")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Lỗi server, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
