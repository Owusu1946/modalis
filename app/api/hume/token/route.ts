export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.HUME_API_KEY
  const secretKey = process.env.HUME_SECRET_KEY

  console.log('[HumeToken] env check', {
    hasApiKey: !!apiKey,
    hasSecretKey: !!secretKey,
    apiKeyLength: apiKey?.length,
    secretKeyLength: secretKey?.length
  })

  if (!apiKey || !secretKey) {
    console.error('[HumeToken] missing credentials', { apiKey: !!apiKey, secretKey: !!secretKey })
    return NextResponse.json(
      { error: 'Missing Hume credentials. Please set HUME_API_KEY and HUME_SECRET_KEY.' },
      { status: 500 }
    )
  }

  try {
    const basic = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')
    // eslint-disable-next-line no-console
    console.log('[HumeToken] requesting token via oauth2-cc')
    // Try with extended timeout and different approach
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
    
    try {
      const res = await fetch('https://api.hume.ai/oauth2-cc/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'modalis/1.0'
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      console.log('[HumeToken] response received', { status: res.status, ok: res.ok })

    if (!res.ok) {
      const text = await res.text()
      console.error('[HumeToken] HTTP error', { status: res.status, statusText: res.statusText, body: text })
      return NextResponse.json({ error: `Token error: ${res.status} ${text}` }, { status: 500 })
    }

      const data = await res.json()
      // eslint-disable-next-line no-console
      console.log('[HumeToken] token OK, expires_in', data?.expires_in)
      return NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in })
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      console.error('[HumeToken] fetch error', fetchError)
      throw fetchError
    }
    
  } catch (e: any) {
    console.error('[HumeToken] error', e)
    return NextResponse.json({ error: e?.message || 'Token request failed' }, { status: 500 })
  }
}
