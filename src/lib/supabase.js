import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill in your credentials.'
  )
}

const isBrowser = typeof window !== 'undefined'

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      persistSession: isBrowser,
      storageKey: 'joker-auth',
      storage: isBrowser ? window.localStorage : undefined,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
    },
  }
)
