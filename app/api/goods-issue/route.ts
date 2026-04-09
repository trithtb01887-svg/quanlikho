import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Zod validation schema for goods issue
const GoodsIssueItemSchema = z.object({
  productId: z.string().min(1),
  productSku: z.string().optional(),
  productName: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive("Số lượng phải > 0"),
  unitPrice: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  serialNumbers: z.array(z.string()).optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
});

const GoodsIssueSchema = z.object({
  warehouseId: z.string().min(1, "Thiếu warehouseId"),
  reason: z.enum(["sales", "production", "transfer", "sample", "damage", "expiry", "adjustment", "return"]),
  items: z.array(GoodsIssueItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
  issueDate: z.union([z.string(), z.date()]).optional(),
  issuedBy: z.string().min(1, "Thiếu issuedBy"),
  ginNumber: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
  customerName: z.string().optional(),
  customerCode: z.string().optional(),
  subtotal: z.number().optional(),
  totalValue: z.number().optional(),
  status: z.string().optional(),
  requiredDate: z.union([z.string(), z.date()]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.union([z.string(), z.date()]).optional(),
  destinationWarehouseId: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
});

// GET /api/goods-issue - Get all goods issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
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

    if (reason) {
      where.reason = reason;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) {
        where.issueDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.issueDate.lte = new Date(dateTo);
      }
    }

    const [issues, total] = await Promise.all([
      prisma.goodsIssue.findMany({
        where,
        include: {
          warehouse: true,
          destinationWarehouse: true,
          issuedByUser: {
            select: { id: true, fullName: true, email: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.goodsIssue.count({ where }),
    ]);

    return NextResponse.json({
      data: issues,
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
    console.error('GET /api/goods-issue error:', error);
    return NextResponse.json({ error: 'Failed to fetch goods issues' }, { status: 500 });
  }
}

// POST /api/goods-issue - Create goods issue
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const parsed = GoodsIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const validatedBody = parsed.data;
    const { items, ...issueData } = validatedBody;

    // Generate issue number
    const count = await prisma.goodsIssue.count();
    const issueNumber = `GI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const issue = await prisma.goodsIssue.create({
      data: {
        issueNumber,
        ginNumber: body.ginNumber,
        reason: body.reason,
        referenceType: body.referenceType,
        referenceId: body.referenceId,
        referenceNumber: body.referenceNumber,
        customerName: body.customerName,
        customerCode: body.customerCode,
        subtotal: body.subtotal || 0,
        totalValue: body.totalValue || 0,
        status: body.status || 'DRAFT',
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
        issuedBy: body.issuedBy,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        warehouseId: body.warehouseId,
        destinationWarehouseId: body.destinationWarehouseId,
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
            serialNumbers: item.serialNumbers || [],
            lotNumber: item.lotNumber,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: {
        warehouse: true,
        destinationWarehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // If status is COMPLETED, update inventory with transaction to prevent race condition
    if (issue.status === 'COMPLETED' && items) {
      const userId = request.headers.get("x-user-id") ?? "system";
      const userName = request.headers.get("x-user-name") ?? "System";

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          // Get all inventory items for this product in the warehouse (for FEFO)
          const allInventoryItems = await tx.inventoryItem.findMany({
            where: {
              productId: item.productId,
              warehouseId: body.warehouseId,
              quantityAvailable: { gt: 0 },
            },
          });

          // Sort by expiryDate ascending (FEFO - lô gần hết hạn xuất trước)
          // null/undefined expiryDate xếp cuối
          allInventoryItems.sort((a, b) => {
            if (!a.expiryDate && !b.expiryDate) return 0;
            if (!a.expiryDate) return 1;
            if (!b.expiryDate) return -1;
            return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          });

          if (allInventoryItems.length === 0) {
            throw new Error(`Không tìm thấy sản phẩm ${item.productName} trong kho`);
          }

          let remainingQty = item.quantity;
          const oldValues: Record<string, { quantityTotal: number; quantityAvailable: number }> = {};
          const inventoryUpdates: { id: string; newTotal: number; newAvailable: number }[] = [];

          // Allocate from FEFO lots
          for (const inv of allInventoryItems) {
            if (remainingQty <= 0) break;

            oldValues[inv.id] = {
              quantityTotal: inv.quantityTotal,
              quantityAvailable: inv.quantityAvailable,
            };

            const qtyToDeduct = Math.min(remainingQty, inv.quantityAvailable);
            const newQuantityTotal = inv.quantityTotal - qtyToDeduct;
            const newQuantityAvailable = Math.max(
              0,
              newQuantityTotal - inv.quantityReserved - inv.quantityQuarantine - inv.quantityDamaged
            );

            inventoryUpdates.push({
              id: inv.id,
              newTotal: newQuantityTotal,
              newAvailable: newQuantityAvailable,
            });

            remainingQty -= qtyToDeduct;
          }

          if (remainingQty > 0) {
            throw new Error(
              `Không đủ hàng tồn kho cho sản phẩm ${item.productName}. ` +
              `Yêu cầu: ${item.quantity}, Khả dụng: ${item.quantity - remainingQty}`
            );
          }

          // Update all affected inventory items
          for (const update of inventoryUpdates) {
            const oldVal = oldValues[update.id];
            await tx.inventoryItem.update({
              where: { id: update.id },
              data: {
                quantityTotal: update.newTotal,
                quantityAvailable: update.newAvailable,
                lastIssueDate: new Date(),
              },
            });

            // Create audit log
            await tx.auditLog.create({
              data: {
                action: "GOODS_ISSUE",
                entity: "InventoryItem",
                entityId: update.id,
                entityName: item.productName,
                userId: userId,
                userName: userName,
                oldValue: JSON.stringify({
                  quantityTotal: oldVal.quantityTotal,
                  quantityAvailable: oldVal.quantityAvailable,
                }),
                newValue: JSON.stringify({
                  quantityTotal: update.newTotal,
                  quantityAvailable: update.newAvailable,
                }),
                metadata: JSON.stringify({
                  goodsIssueId: issue.id,
                  issueNumber: issue.issueNumber,
                  issuedQty: item.quantity,
                }),
              },
            });
          }
        }
      });
    }

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error('[API_ERROR] POST /api/goods-issue:', error);
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
