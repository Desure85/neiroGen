import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://app:8000'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const res = await fetch(`${BACKEND}/api/generator/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: any
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
