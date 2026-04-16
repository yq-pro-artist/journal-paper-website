import { LogSnag } from 'logsnag'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { event, description, icon, channel } = await request.json()

    if (!process.env.LOGSNAG_TOKEN) {
      console.warn('LOGSNAG_TOKEN not set, skipping tracking')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const logsnag = new LogSnag({
      token: process.env.LOGSNAG_TOKEN,
      project: 'joker',
    })

    await logsnag.track({
      channel: channel || 'errors',
      event: event || 'unknown',
      description: description || '',
      icon: icon || '🃏',
      notify: false,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('LogSnag API error:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
