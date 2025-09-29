import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://app:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/generator/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          exercise_type: 'test',
          items: ['test1', 'test2']
        },
        type: 'pronunciation',
        difficulty: 'medium'
      })
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy error', details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
