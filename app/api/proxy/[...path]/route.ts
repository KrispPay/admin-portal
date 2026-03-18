import { NextRequest, NextResponse } from 'next/server'

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const targetUrl = req.headers.get('x-target-url')
  const adminKey = req.headers.get('x-admin-key')

  if (!targetUrl) {
    return NextResponse.json({ error: 'x-target-url header required' }, { status: 400 })
  }

  const pathSegments = params.path.join('/')
  const searchParams = req.nextUrl.searchParams.toString()
  const fullUrl = `${targetUrl}/${pathSegments}${searchParams ? '?' + searchParams : ''}`

  const forwardHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (adminKey) {
    forwardHeaders['X-Super-Admin-Key'] = adminKey
  }

  let body: string | undefined
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await req.text()
  }

  try {
    const upstream = await fetch(fullUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    })

    const contentType = upstream.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await upstream.json()
      return NextResponse.json(data, { status: upstream.status })
    }

    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': contentType || 'text/plain' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Proxy error: ${err.message}`, detail: 'Could not reach the target server' },
      { status: 502 },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
