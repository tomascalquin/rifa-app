// Ruta del archivo: src/app/api/admin/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export async function POST(request: Request) {
  try {
    const { action, id, password } = await request.json()

    if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (action === 'approve') {
      const { error } = await supabaseAdmin
        .from('rifa_numbers')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } 
    
    else if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('rifa_numbers')
        .update({
          status: 'available',
          buyer_name: null,
          buyer_email: null,
          buyer_phone: null,
          buyer_instagram: null,
          receipt_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}