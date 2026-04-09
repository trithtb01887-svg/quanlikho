import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/suppliers - Get all suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          contacts: true,
          bankAccounts: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      data: suppliers,
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
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { contacts, bankAccounts, ...supplierData } = body;
    
    const supplier = await prisma.supplier.create({
      data: {
        ...supplierData,
        contacts: contacts ? {
          create: contacts.map((c: any) => ({
            name: c.name,
            position: c.position,
            phone: c.phone,
            email: c.email,
            isPrimary: c.isPrimary || false,
          })),
        } : undefined,
        bankAccounts: bankAccounts ? {
          create: bankAccounts.map((b: any) => ({
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountName: b.accountName,
            branch: b.branch,
          })),
        } : undefined,
      },
      include: {
        contacts: true,
        bankAccounts: true,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error('POST /api/suppliers error:', error);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
