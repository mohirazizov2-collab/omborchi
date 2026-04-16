import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');

    const products = await prisma.product.findMany({
      where: warehouseId ? { warehouseId } : {},
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Xatolik' }, { status: 500 });
  }
}
