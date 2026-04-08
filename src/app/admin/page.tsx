'use client'

import { useEffect, useState } from 'react'
import { supabase, RifaNumber } from '../../utils/supabase'
import { CheckCircle, ExternalLink, Lock, Trash2, RefreshCcw, Shield, Users, TrendingUp, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pending, setPending] = useState<RifaNumber[]>([])
  const [sold, setSold] = useState<RifaNumber[]>([])
  const [loading, setLoading] = useState(false)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (pwd === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      toast.error('Contraseña incorrecta')
    }
  }

  useEffect(() => {
    if (authed) loadData()
  }, [authed])

  async function loadData() {
    setLoading(true)
    const { data: pendingData } = await supabase.from('rifa_numbers').select('*').eq('status', 'pending').order('number')
    const { data: soldData } = await supabase.from('rifa_numbers').select('*').eq('status', 'sold').order('number')
    if (pendingData) setPending(pendingData as RifaNumber[])
    if (soldData) setSold(soldData as RifaNumber[])
    setLoading(false)
  }

  // BUG 1 FIX: approve usa setState en vez de loadData()
  async function approve(id: string, num: number) {
    if (!confirm(`¿Confirmar pago del número #${num}?`)) return

    const { error } = await supabase
      .from('rifa_numbers')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar')
    } else {
      toast.success(`Número #${num} marcado como VENDIDO`)
      // Quita de pending y agrega a sold con setState
      const item = pending.find(n => n.id === id)
      if (item) {
        setPending(prev => prev.filter(n => n.id !== id))
        setSold(prev => [...prev, { ...item, status: 'sold' as const }].sort((a, b) => a.number - b.number))
      }
    }
  }

  // BUG 1 FIX: reject diferencia si viene de pending o sold
  async function reject(id: string, num: number, fromSection: 'pending' | 'sold') {
    if (!confirm(`¿RECHAZAR número #${num}? Se borrarán los datos y quedará disponible nuevamente.`)) return

    const { error } = await supabase
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

    if (error) {
      toast.error('Error al liberar número')
    } else {
      toast.success(`Número #${num} liberado`)
      // BUG 1 FIX: quita de la sección correcta, no agrega a sold
      if (fromSection === 'pending') {
        setPending(prev => prev.filter(n => n.id !== id))
      } else {
        setSold(prev => prev.filter(n => n.id !== id))
      }
    }
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[40%] w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
      </div>
      <form onSubmit={handleLogin} className="relative w-full max-w-sm rounded-3xl p-8 space-y-5" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
        <div className="text-center mb-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Lock size={28} style={{ color: '#f59e0b' }} />
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#f1f5f9' }}>Acceso Admin</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Panel de gestión de rifas</p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#64748b' }}>Contraseña</label>
          <input
            type="password" required
            placeholder="••••••••"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
          />
        </div>
        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl font-black text-sm tracking-wide"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#0f172a' }}
        >
          ENTRAR
        </button>
      </form>
    </div>
  )

  return (
    <main className="min-h-screen" style={{ background: '#0f172a', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[20%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl p-6" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Shield size={22} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: '#f1f5f9' }}>Panel de Control</h1>
              <p className="text-xs" style={{ color: '#475569' }}>Gestión de comprobantes y ventas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-3">
              <div className="rounded-2xl px-4 py-2 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="text-xl font-black" style={{ color: '#f59e0b' }}>{pending.length}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>Pendientes</div>
              </div>
              <div className="rounded-2xl px-4 py-2 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="text-xl font-black" style={{ color: '#10b981' }}>{sold.length}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>Vendidos</div>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* ── PENDIENTES ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
            <h2 className="font-black text-base" style={{ color: '#fbbf24' }}>Por Revisar</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{pending.length}</span>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)' }}>
            {pending.length === 0 ? (
              <div className="py-14 text-center" style={{ color: '#334155' }}>
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay comprobantes pendientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Número', 'Comprador', 'Contacto', 'Comprobante', 'Acciones'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: '#334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((n, i) => (
                      <tr key={n.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td className="px-5 py-4">
                          <span className="text-xl font-black" style={{ color: '#f59e0b' }}>#{n.number}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{n.buyer_name}</div>
                          {n.buyer_instagram && (
                            <div className="text-xs font-semibold mt-0.5" style={{ color: '#ec4899' }}>@{n.buyer_instagram}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm" style={{ color: '#94a3b8' }}>{n.buyer_phone}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{n.buyer_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={n.receipt_url || '#'}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                          >
                            <ExternalLink size={12} /> Ver doc
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => approve(n.id, n.number)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                              title="Aprobar"
                            >
                              <CheckCircle size={14} /> Aprobar
                            </button>
                            <button
                              onClick={() => reject(n.id, n.number, 'pending')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}
                              title="Rechazar"
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
        </section>

        {/* ── VENDIDOS ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={16} style={{ color: '#10b981' }} />
            <h2 className="font-black text-base" style={{ color: '#10b981' }}>Confirmados / Vendidos</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{sold.length}</span>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)' }}>
            {sold.length === 0 ? (
              <div className="py-14 text-center" style={{ color: '#334155' }}>
                <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay ventas confirmadas aún</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Número', 'Comprador', 'Contacto', 'Revertir'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-widest" style={{ color: '#334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sold.map((n, i) => (
                      <tr key={n.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black" style={{ color: '#10b981' }}>#{n.number}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Vendido</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{n.buyer_name}</div>
                          {n.buyer_instagram && <div className="text-xs font-semibold mt-0.5" style={{ color: '#ec4899' }}>@{n.buyer_instagram}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm" style={{ color: '#94a3b8' }}>{n.buyer_phone}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{n.buyer_email}</div>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => reject(n.id, n.number, 'sold')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)' }}
                            title="Revertir a disponible"
                          >
                            <Trash2 size={12} /> Revertir
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
