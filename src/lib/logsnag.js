/**
 * Client-safe LogSnag helpers.
 * These call our own API route (/api/track) which holds the secret token server-side.
 */

async function track(payload) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('LogSnag client error:', e)
  }
}

export async function trackEvent(event, description, icon = '🃏') {
  await track({ event, description, icon, channel: 'errors' })
}

export async function trackSubmit(title, author) {
  await track({
    event: '新投稿',
    description: `${author} 投稿了「${title}」`,
    icon: '📄',
    channel: 'errors',
  })
}
