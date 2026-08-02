import { NextResponse } from 'next/server';
import { getPersonById } from '@/resolver/matcher';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const person = await getPersonById(id);

  if (!person) {
    return NextResponse.json(
      { success: false, error: 'Person entity not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: person
  });
}
