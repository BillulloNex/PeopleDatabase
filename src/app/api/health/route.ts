import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'PeopleDatabase Global Intelligence Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
