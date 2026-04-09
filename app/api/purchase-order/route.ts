import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Zod validation schema for purchase order
const PurchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  productSku: z.string().optional(),
  productName: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive("Số lượng phải > 0"),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0).optional(),
  orderedQuantity: z.number().optional(),
  receivedQuantity: z.number().optional(),
  pendingQuantity: z.number().optional(),
  deliveryStatus: z.string().optional(),
  expectedDeliveryDate: z.union([z.string(), z.date()]).optional().nullable(),
  notes: z.string().optional(),
});

const PurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Thiếu supplierId"),
  items: z.array(PurchaseOrderItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
  orderDate: z.union([z.string(), z.date()]).optional(),
  createdBy: z.string().min(1, "Thiếu createdBy"),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  totalValue: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  expectedDeliveryDate: z.union([z.string(), z.date()]).optional().nullable(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.union([z.string(), z.date()]).optional().nullable(),
  cancelledBy: z.string().optional(),
  cancelledReason: z.string().optional(),
});

// GET /api/purchase-order - Get all purchase orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
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

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) {
        where.orderDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.orderDate.lte = new Date(dateTo);
      }
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          createdByUser: {
            select: { id: true, fullName: true, email: true },
          },
          approvedByUser: {
            select: { id: true, fullName: true, email: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
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
    console.error('GET /api/purchase-order error:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

// POST /api/purchase-order - Create purchase order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const parsed = PurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const validatedBody = parsed.data;
    const { items, ...orderData } = validatedBody;

    // Generate order number
    const count = await prisma.purchaseOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: body.supplierId,
        subtotal: body.subtotal || 0,
        taxAmount: body.taxAmount || 0,
        discountAmount: body.discountAmount || 0,
        totalValue: body.totalValue || 0,
        currency: body.currency || 'VND',
        status: body.status || 'DRAFT',
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        shippingAddress: body.shippingAddress,
        notes: body.notes,
        internalNotes: body.internalNotes,
        attachmentUrls: body.attachmentUrls || [],
        createdBy: body.createdBy,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        cancelledBy: body.cancelledBy,
        cancelledReason: body.cancelledReason,
        items: items ? {
          create: items.map((item: any) => ({
            productId: item.productId,
            productSku: item.productSku,
            productName: item.productName,
            unit: item.unit || 'PIECE',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            orderedQuantity: item.orderedQuantity || 0,
            receivedQuantity: item.receivedQuantity || 0,
            pendingQuantity: item.pendingQuantity || 0,
            deliveryStatus: item.deliveryStatus || 'PENDING',
            expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate) : null,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[API_ERROR] POST /api/purchase-order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi server, vui lòng thử lại" },
      { status: 500 }
    );
  }
}

// PATCH /api/purchase-order - Update purchase order status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...updateData,
        approvedAt: updateData.approvedBy ? new Date() : undefined,
        actualDeliveryDate: updateData.status === 'FULLY_RECEIVED' ? new Date() : undefined,
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('[API_ERROR] PATCH /api/purchase-order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi server, vui lòng thử lại" },
      { status: 500 }
    );
  }
}
