'use client'

import { useEffect, useState } from 'react'
import { supabase, RifaNumber } from '../../utils/supabase'
import { CheckCircle, XCircle, ExternalLink, Lock } from 'lucide-react'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pending, setPending] = useState<RifaNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  // Verificar password
  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pwd === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      alert('Contraseña incorrecta')
    }
  }

  // Cargar pendientes
  useEffect(() => {
    if (!authed) return
    loadPending()
  }, [authed])

  async function loadPending() {
    setLoading(true)
    const { data } = await supabase
      .from('rifa_numbers')
      .select('*')
      .eq('status', 'pending')
      .order('updated_at')
    if (data) setPending(data)
    setLoading(false)
  }

  // Aprobar número → sold
  async function approve(id: string) {
    setActionId(id)
    await supabase
      .from('rifa_numbers')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', id)
    setPending(p => p.filter(n => n.id !== id))
    setActionId(null)
  }

  // Rechazar número → available + limpiar datos
  async function reject(id: string) {
    setActionId(id)
    await supabase
      .from('rifa_numbers')
      .update({
        status: 'available',
        buyer_name: null,
        buyer_email: null,
        buyer_phone: null,
        receipt_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    setPending(p => p.filter(n => n.id !== id))
    setActionId(null)
  }

  // ─── Vista de login ───────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold">Panel de administración</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password" required placeholder="Contraseña"
            value={pwd} onChange={e => setPwd(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )

  // ─── Vista admin ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Comprobantes pendientes</h1>
          <button onClick={loadPending} className="text-sm text-blue-600 hover:underline">
            Actualizar
          </button>
        </div>

        {loading && <div className="text-gray-400 text-center py-12">Cargando...</div>}

        {!loading && pending.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            No hay comprobantes pendientes de revisión.
          </div>
        )}

        {!loading && pending.length > 0 && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'Nombre', 'Email', 'Teléfono', 'Comprobante', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map(n => (
                  <tr key={n.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-amber-600">#{n.number}</td>
                    <td className="px-4 py-3">{n.buyer_name}</td>
                    <td className="px-4 py-3 text-gray-500">{n.buyer_email}</td>
                    <td className="px-4 py-3 text-gray-500">{n.buyer_phone}</td>
                    <td className="px-4 py-3">
                      {n.receipt_url && (
                        <a
                          href={n.receipt_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          Ver <ExternalLink size={14} />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(n.id)}
                          disabled={actionId === n.id}
                          className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-600 disabled:opacity-40"
                        >
                          <CheckCircle size={14} /> Aprobar
                        </button>
                        <button
                          onClick={() => reject(n.id)}
                          disabled={actionId === n.id}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600 disabled:opacity-40"
                        >
                          <XCircle size={14} /> Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}