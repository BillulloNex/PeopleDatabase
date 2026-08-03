import { NextResponse } from 'next/server';
import { searchCanonicalPeople, getTotalProfileCount } from '@/resolver/matcher';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || undefined;
  const company = searchParams.get('company') || undefined;
  const location = searchParams.get('location') || undefined;
  const skill = searchParams.get('skill') || undefined;
  const status = searchParams.get('status') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 500);
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const [{ records, matchingCount }, totalCount] = await Promise.all([
      searchCanonicalPeople({ query, company, location, skill, status, limit, offset }),
      getTotalProfileCount(),
    ]);
    return NextResponse.json({
      success: true,
      total: totalCount,
      matching: matchingCount,
      page,
      pageSize: limit,
      returned: records.length,
      data: records
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Search error' },
      { status: 500 }
    );
  }
}
