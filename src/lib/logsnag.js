import { LogSnag } from 'logsnag'

const logsnag = new LogSnag({
  token: process.env.LOGSNAG_TOKEN,
  project: 'joker'
})

export async function trackEvent(event, description, icon = '🃏') {
  try {
    await logsnag.track({
      channel: 'errors',
      event,
      description,
      icon,
      notify: true
    })
  } catch (e) {
    console.error('LogSnag error:', e)
  }
}

export async function trackSubmit(title, author) {
  try {
    await logsnag.track({
      channel: 'errors',
      event: '新投稿',
      description: `${author} 投稿了「${title}」`,
      icon: '📄',
      notify: false
    })
  } catch (e) {
    console.error('LogSnag error:', e)
  }
}
