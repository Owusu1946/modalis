import { NextResponse } from 'next/server'

import 'server-only'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Alternative token route using different approach
export async function GET() {
  const apiKey = process.env.HUME_API_KEY
  const secretKey = process.env.HUME_SECRET_KEY

  console.log('[HumeTokenAlt] env check', {
    hasApiKey: !!apiKey,
    hasSecretKey: !!secretKey,
    apiKeyLength: apiKey?.length,
    secretKeyLength: secretKey?.length
  })

  if (!apiKey || !secretKey) {
    console.error('[HumeTokenAlt] missing credentials')
    return NextResponse.json(
      { error: 'Missing Hume credentials. Please set HUME_API_KEY and HUME_SECRET_KEY.' },
      { status: 500 }
    )
  }

  try {
    // Try using Node's https module instead of fetch
    const https = require('https')
    const { URL } = require('url')

    const postData = new URLSearchParams({ grant_type: 'client_credentials' }).toString()
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'User-Agent': 'modalis/1.0'
      },
      timeout: 30000
    }

    console.log('[HumeTokenAlt] making request with https module')

    const response = await new Promise<any>((resolve, reject) => {
      const req = https.request('https://api.hume.ai/v0/oauth2-cc/token', options, (res: any) => {
        let data = ''
        res.on('data', (chunk: any) => data += chunk)
        res.on('end', () => {
          console.log('[HumeTokenAlt] response received', { statusCode: res.statusCode })
          resolve({ statusCode: res.statusCode, data: data })
        })
      })

      req.on('error', (error: any) => {
        console.error('[HumeTokenAlt] request error', error)
        reject(error)
      })

      req.on('timeout', () => {
        console.error('[HumeTokenAlt] request timeout')
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.write(postData)
      req.end()
    })

    if (response.statusCode !== 200) {
      console.error('[HumeTokenAlt] HTTP error', { statusCode: response.statusCode, body: response.data })
      return NextResponse.json({ error: `Token error: ${response.statusCode} ${response.data}` }, { status: 500 })
    }

    const data = JSON.parse(response.data)
    console.log('[HumeTokenAlt] token OK, expires_in', data?.expires_in)
    return NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in })

  } catch (e: any) {
    console.error('[HumeTokenAlt] error', e)
    return NextResponse.json({ error: e?.message || 'Token request failed' }, { status: 500 })
  }
}
