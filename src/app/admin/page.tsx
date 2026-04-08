'use client'

import { useEffect, useState } from 'react'
import { supabase, RifaNumber } from '../../utils/supabase' // IMPORTANTE: Usa '../../' si está en src/app/admin/page.tsx
import { CheckCircle, ExternalLink, Lock, Trash2, RefreshCcw, Shield, Users, TrendingUp, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pending, setPending] = useState<RifaNumber[]>([])
  const [sold, setSold] = useState<RifaNumber[]>([])
  const [loading, setLoading] = useState(false)

  // Login simple
  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pwd === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      toast.error('Contraseña incorrecta')
    }
  }

  // Carga al autenticar
  useEffect(() => {
    if (authed) loadData()
  }, [authed])

  // Carga de datos real desde la API interna (para saltar RLS)
  async function loadData() {
    setLoading(true)
    const { data: pendingData } = await supabase.from('rifa_numbers').select('*').eq('status', 'pending').order('number')
    const { data: soldData } = await supabase.from('rifa_numbers').select('*').eq('status', 'sold').order('number')
    if (pendingData) setPending(pendingData as RifaNumber[])
    if (soldData) setSold(soldData as RifaNumber[])
    setLoading(false)
  }

  // Acción: Aprobar (llama a /api/admin)
  async function approve(id: string, num: number) {
    if (!confirm(`¿Confirmar pago del número #${num}?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id, password: pwd })
      })

      if (!res.ok) throw new Error('Fallo en la base de datos')

      toast.success(`Número #${num} marcado como VENDIDO`)
      await loadData() // Carga los datos reales actualizados
    } catch (err) {
      toast.error('Error de seguridad: No se pudo actualizar')
      setLoading(false)
    }
  }

  // Acción: Rechazar/Liberar (llama a /api/admin)
  async function reject(id: string, num: number) {
    if (!confirm(`¿RECHAZAR número #${num}? Se borrarán los datos del comprador y quedará disponible.`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id, password: pwd })
      })

      if (!res.ok) throw new Error('Fallo en la base de datos')

      toast.success(`Número #${num} liberado correctamente`)
      await loadData()
    } catch (err) {
      toast.error('Error de seguridad: No se pudo liberar')
      setLoading(false)
    }
  }

  // ─── Vista de Login (Soberbia y Elegante) ───────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4 text-slate-100" style={{ background: '#0a0f1e' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[40%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
      </div>
      <form onSubmit={handleLogin} className="relative w-full max-w-sm rounded-3xl p-8 space-y-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
        <div className="text-center mb-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Lock size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-50 tracking-tighter">Acceso Admin</h1>
          <p className="text-sm mt-1 text-slate-500">Panel exclusivo de gestión de rifas</p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-slate-600">Contraseña Maestra</label>
          <input
            type="password" required
            placeholder="••••••••"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm outline-none text-slate-100 focus:border-amber-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full py-4 rounded-2xl font-black text-sm tracking-wide bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all active:scale-95"
        >
          AUTENTICAR Y ENTRAR
        </button>
      </form>
    </div>
  )

  // ─── Vista Principal Admin (Responsiva y Premium) ─────────────────────────
  return (
    <main className="min-h-screen p-4 md:p-8 text-slate-100" style={{ background: '#0a0f1e', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      
      {/* Luces de fondo sutiles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[20%] w-[500px] h-[500px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-8">

        {/* Header Responsivo */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl p-6 bg-slate-900 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <Shield size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-50 tracking-tight">Centro de Control</h1>
              <p className="text-xs text-slate-500">Validación de pagos y gestión operativa</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <div className="rounded-xl px-4 py-2 text-center bg-slate-950 border border-slate-800 shadow-inner">
                <div className="text-xl font-black text-amber-400">{pending.length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Revisiones</div>
              </div>
              <div className="rounded-xl px-4 py-2 text-center bg-slate-950 border border-slate-800 shadow-inner">
                <div className="text-xl font-black text-emerald-400">{sold.length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Confirmados</div>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Actualizar Datos</span>
            </button>
          </div>
        </header>

        {/* ── SECCIÓN PENDIENTES (Responsiva) ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse bg-amber-500 shadow-lg shadow-amber-500/20" />
            <h2 className="font-black text-base text-amber-300 tracking-tight">Solicitudes por Revisar</h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-950 border border-amber-800 text-amber-400">{pending.length}</span>
          </div>

          <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {pending.length === 0 ? (
              <div className="py-20 text-center text-slate-600">
                <Users size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium tracking-wide">No hay comprobantes pendientes de revisión.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Tabla adaptada para responsividad */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800">
                      {['#', 'Comprador', 'Contacto', 'Doc', 'Acciones'].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {pending.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-5">
                          <span className="text-2xl font-black text-amber-400 tracking-tighter">#{n.number}</span>
                        </td>
                        <td className="px-5 py-5">
                          <div className="font-bold text-slate-100">{n.buyer_name}</div>
                          {n.buyer_instagram && (
                            <a href={`https://instagram.com/${n.buyer_instagram}`} target="_blank" className="text-xs font-semibold mt-1 inline-flex items-center gap-1 text-pink-400 hover:text-pink-300">
                              @{n.buyer_instagram}
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-5 whitespace-nowrap">
                          <div className="text-sm text-slate-400">{n.buyer_phone}</div>
                          <div className="text-xs mt-0.5 text-slate-600">{n.buyer_email}</div>
                        </td>
                        <td className="px-5 py-5">
                          <a href={n.receipt_url || '#'} target="_blank" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:scale-105">
                            <ExternalLink size={14} /> Ver Doc
                          </a>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex gap-2">
                            <button onClick={() => approve(n.id, n.number)} disabled={loading} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 disabled:opacity-50">
                              <CheckCircle size={15} /> Validar
                            </button>
                            <button onClick={() => reject(n.id, n.number)} disabled={loading} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-950/50 border border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-50">
                              <XCircle size={15} /> Rechazar
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
        </section>

        {/* ── SECCIÓN VENDIDOS (Sobria y Responsiva) ───────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5 px-1 mt-10">
            <TrendingUp size={18} className="text-emerald-500" />
            <h2 className="font-black text-base text-emerald-400 tracking-tight">Ventas Confirmadas</h2>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">{sold.length}</span>
          </div>

          <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl opacity-90 hover:opacity-100 transition-opacity">
            {sold.length === 0 ? (
              <div className="py-20 text-center text-slate-700">
                <TrendingUp size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium tracking-wide">Aún no se han confirmado ventas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      {['#', 'Comprador', 'Contacto', 'Acción'].map(h => (
                        <th key={h} className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {sold.map((n) => (
                      <tr key={n.id}>
                        <td className="px-5 py-5">
                          <span className="text-2xl font-black text-emerald-500 tracking-tighter">#{n.number}</span>
                        </td>
                        <td className="px-5 py-5 font-medium text-slate-300">
                          {n.buyer_name}
                          {n.buyer_instagram && <div className="text-xs font-semibold text-pink-500/80">@{n.buyer_instagram}</div>}
                        </td>
                        <td className="px-5 py-5 text-slate-600 text-xs">
                          {n.buyer_phone}<br/>{n.buyer_email}
                        </td>
                        <td className="px-5 py-5">
                          <button onClick={() => reject(n.id, n.number)} disabled={loading} className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-950/30 transition-colors" title="Revertir a disponible">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}