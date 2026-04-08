'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, RifaNumber } from '../utils/supabase'
import { X, Upload, CheckCircle, Ticket, Star, Users, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const BANK_INFO = {
  banco: 'Banco Estado',
  titular: 'Juan Pérez González',
  rut: '12.345.678-9',
  cuenta: '123456789',
  tipo: 'Cuenta Corriente',
  email: 'juan.perez@gmail.com',
  monto: '$5.000',
}

function statusStyle(status: string) {
  if (status === 'available')
    return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-400 hover:text-emerald-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer active:scale-95'
  if (status === 'pending')
    return 'bg-amber-500/10 border-amber-500/30 text-amber-600/60 line-through cursor-not-allowed opacity-60'
  return 'bg-slate-700/60 border-slate-600/40 text-slate-500 line-through cursor-not-allowed opacity-50'
}

type FormData = {
  name: string; email: string; phone: string; instagram: string; file: File | null
}

export default function Home() {
  const [numbers, setNumbers] = useState<RifaNumber[]>([])
  const [selected, setSelected] = useState<RifaNumber | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', instagram: '', file: null })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rifa_numbers')
        .select('*')
        .order('number')
      if (data) setNumbers(data as RifaNumber[])
      setLoading(false)
    }
    load()

    // BUG 2 FIX: Realtime subscription correcta — payload.new incluye status actualizado
    const channel = supabase
      .channel('rifa-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rifa_numbers' },
        (payload) => {
          setNumbers(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new as RifaNumber : n)
          )
        }
      )
      .subscribe()

    // BUG 3 FIX: Polling cada 30s como fallback
    const interval = setInterval(() => load(), 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  function handleClick(n: RifaNumber) {
    if (n.status !== 'available') return
    setSelected(n)
    setForm({ name: '', email: '', phone: '', instagram: '', file: null })
    setSuccess(false)
  }

  function closeModal() {
    if (submitting) return
    setSelected(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.file) {
      toast.error('Por favor, completa todos los campos obligatorios.')
      return
    }
    if (!selected || !form.file) return
    setSubmitting(true)
    const toastId = toast.loading('Reservando tu número...')

    setNumbers(prev =>
      prev.map(n => n.id === selected.id ? { ...n, status: 'pending' } : n)
    )

    try {
      const ext = form.file.name.split('.').pop()
      const path = `numero-${selected.number}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, form.file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)

      const { error: dbError } = await supabase
        .from('rifa_numbers')
        .update({
          status: 'pending',
          buyer_name: form.name,
          buyer_email: form.email,
          buyer_phone: form.phone,
          buyer_instagram: form.instagram,
          receipt_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id)
        .eq('status', 'available')
      if (dbError) throw dbError

      toast.success('¡Número reservado con éxito!', { id: toastId })
      setSuccess(true)
    } catch (err) {
      setNumbers(prev =>
        prev.map(n => n.id === selected.id ? { ...n, status: 'available' } : n)
      )
      toast.error('Error al procesar tu reserva. Intenta nuevamente.', { id: toastId })
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    available: numbers.filter(n => n.status === 'available').length,
    pending:   numbers.filter(n => n.status === 'pending').length,
    sold:      numbers.filter(n => n.status === 'sold').length,
  }
  const totalSold = stats.sold + stats.pending
  const progress = numbers.length > 0 ? Math.round((totalSold / numbers.length) * 100) : 0

  return (
    <main className="min-h-screen" style={{ background: '#0f172a', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8 md:py-12">

        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
            <Star size={12} fill="currentColor" /> Rifa Solidaria 2024
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4" style={{ color: '#f1f5f9', lineHeight: 1.05 }}>
            Elige tu<br/>
            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>número</span> de suerte
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem' }}>
            Selecciona un número disponible, transfiere y sube tu comprobante.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Disponibles', value: stats.available, icon: Ticket, color: '#10b981', glow: 'rgba(16,185,129,0.12)' },
            { label: 'En revisión',  value: stats.pending,   icon: Users,  color: '#f59e0b', glow: 'rgba(245,158,11,0.12)' },
            { label: 'Vendidos',     value: stats.sold,      icon: TrendingUp, color: '#6366f1', glow: 'rgba(99,102,241,0.12)' },
          ].map(({ label, value, icon: Icon, color, glow }) => (
            <div key={label} className="rounded-2xl p-4 md:p-5 text-center" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)', boxShadow: `0 0 30px ${glow}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: glow, color }}>
                <Icon size={18} />
              </div>
              <div className="text-3xl font-black mb-0.5" style={{ color }}>{value}</div>
              <div className="text-xs font-medium" style={{ color: '#475569' }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Progreso de la rifa</span>
            <span className="text-sm font-black" style={{ color: '#f59e0b' }}>{progress}% vendido</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 mb-6 text-xs font-semibold">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.5)' }} />
            <span style={{ color: '#94a3b8' }}>Disponible</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }} />
            <span style={{ color: '#94a3b8' }}>En revisión</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-md" style={{ background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)' }} />
            <span style={{ color: '#94a3b8' }}>Vendido</span>
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(245,158,11,0.3)', borderTopColor: '#f59e0b' }} />
            <p style={{ color: '#475569', fontSize: '0.875rem' }}>Cargando números...</p>
          </div>
        ) : (
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 md:gap-2">
            {numbers.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                disabled={n.status !== 'available'}
                title={n.status === 'pending' ? 'En revisión' : n.status === 'sold' ? 'Vendido' : 'Disponible'}
                className={`aspect-square rounded-xl border text-xs md:text-sm font-bold flex items-center justify-center transition-all duration-200 ${statusStyle(n.status)}`}
              >
                {n.number}
              </button>
            ))}
          </div>
        )}

        <p className="text-center mt-8 text-xs" style={{ color: '#334155' }}>
          Los números se actualizan automáticamente en tiempo real
        </p>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between px-7 pt-7 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#f59e0b' }}>
                  {success ? 'Reserva exitosa' : 'Reservar número'}
                </div>
                <h2 className="text-2xl font-black" style={{ color: '#f1f5f9' }}>
                  {success ? '¡Todo listo!' : `Número #${selected.number}`}
                </h2>
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div className="px-7 py-6">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <CheckCircle size={40} style={{ color: '#10b981' }} />
                  </div>
                  <h3 className="text-xl font-black mb-2" style={{ color: '#f1f5f9' }}>¡Reserva recibida!</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                    Tu número <strong style={{ color: '#f59e0b' }}>#{selected.number}</strong> está en revisión.<br/>
                    Te contactaremos a <strong style={{ color: '#94a3b8' }}>{form.email}</strong> para confirmar.
                  </p>
                  <button onClick={closeModal} className="mt-8 px-10 py-3 rounded-2xl font-black text-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#0f172a' }}>
                    Perfecto
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl p-5 mb-5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: '#f59e0b', color: '#0f172a' }}>1</div>
                      <h3 className="font-bold text-sm" style={{ color: '#fbbf24' }}>Realiza la transferencia</h3>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                      {Object.entries({ Banco: BANK_INFO.banco, Titular: BANK_INFO.titular, RUT: BANK_INFO.rut, Cuenta: BANK_INFO.cuenta, Tipo: BANK_INFO.tipo, Email: BANK_INFO.email, Monto: BANK_INFO.monto }).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{k}</dt>
                          <dd style={{ color: '#e2e8f0', fontWeight: 700 }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: '#10b981', color: '#0f172a' }}>2</div>
                      <h3 className="font-bold text-sm" style={{ color: '#10b981' }}>Completa tus datos y sube el comprobante</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      {[
                        { label: 'Nombre completo *', key: 'name', type: 'text', placeholder: 'Juan Pérez' },
                        { label: 'Email *', key: 'email', type: 'email', placeholder: 'juan@ejemplo.com' },
                        { label: 'Teléfono *', key: 'phone', type: 'tel', placeholder: '+56 9 1234 5678' },
                      ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                          <input
                            type={type} required
                            value={form[key as keyof FormData] as string}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instagram (Opcional)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>@</span>
                          <input
                            type="text"
                            value={form.instagram}
                            onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                            placeholder="usuario"
                            className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comprobante *</label>
                        <div
                          onClick={() => fileRef.current?.click()}
                          className="rounded-xl p-5 text-center cursor-pointer transition-all"
                          style={{ border: form.file ? '2px solid rgba(16,185,129,0.5)' : '2px dashed rgba(255,255,255,0.1)', background: form.file ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)' }}
                        >
                          {form.file ? (
                            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: '#10b981' }}>
                              <CheckCircle size={18} />{form.file.name}
                            </div>
                          ) : (
                            <>
                              <Upload size={24} className="mx-auto mb-2" style={{ color: '#475569' }} />
                              <p className="text-sm" style={{ color: '#475569' }}>Haz clic para subir imagen o PDF</p>
                            </>
                          )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*,.pdf" required className="hidden" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                      </div>
                      <button
                        type="submit" disabled={submitting}
                        className="w-full py-3.5 rounded-2xl font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#0f172a', marginTop: '0.5rem' }}
                      >
                        {submitting ? 'Enviando...' : 'Confirmar reserva →'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
