import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://app:8000'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND}/api/generator/templates?type=${type}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
