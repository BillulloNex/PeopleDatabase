import { NextResponse } from 'next/server';
import { searchCanonicalPeople } from '@/resolver/matcher';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const company = searchParams.get('company') || undefined;
  const location = searchParams.get('location') || undefined;
  const skill = searchParams.get('skill') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const people = await searchCanonicalPeople({ query, company, location, skill, status, limit: Math.min(limit, 50000) });
    return NextResponse.json({
      success: true,
      total: people.length,
      data: people
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Search error' },
      { status: 500 }
    );
  }
}
