import { NextRequest, NextResponse } from 'next/server'
import { getCities } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const state = new URL(req.url).searchParams.get('state') || ''
  const cities = getCities(state)
  return NextResponse.json({ cities })
}
