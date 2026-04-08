import { createClient } from '@supabase/supabase-js'

export type RifaNumber = {
  id: string
  number: number
  status: 'available' | 'pending' | 'sold'
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  receipt_url: string | null
  buyer_instagram: string | null
}

// Cliente público — para el frontend (anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cliente admin — SOLO para uso en Server Actions o Route Handlers
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}