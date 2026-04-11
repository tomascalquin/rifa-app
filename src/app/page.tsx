'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, RifaNumber } from '../utils/supabase' // IMPORTANTE: Usa '../' si está en src/app/page.tsx
import { X, Upload, CheckCircle, Ticket } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Configuración Visual Elegante ───────────────────────────────────────
const BANK_INFO = {
  banco: 'Banco Falabella',
  titular: 'Gabriel Rojas Campos',
  rut: '21.853.410-4',
  cuenta: '19840580347',
  tipo: 'Cuenta Corriente',
  monto: '$3.000 CLP',
}

// Colores sobrios y elegantes por estado
function statusStyle(status: string) {
  if (status === 'available')
    return 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-amber-500 hover:text-amber-400 cursor-pointer active:scale-95 transition-all duration-150'
  if (status === 'pending')
    return 'bg-amber-950 border-amber-800 text-amber-500 line-through cursor-not-allowed opacity-80'
  // Vendido: gris oscuro, sobrio, integrado en el fondo
  return 'bg-slate-900 border-slate-800 text-slate-600 line-through cursor-not-allowed opacity-50'
}

// ─── Tipos ────────────────────────────────────────────────────────────────
type FormData = {
  name: string; email: string; phone: string; instagram: string; file: File | null
}

// ─── Componente Home ─────────────────────────────────────────────────────
export default function Home() {
  const [numbers, setNumbers] = useState<RifaNumber[]>([])
  const [selected, setSelected] = useState<RifaNumber | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', instagram: '', file: null })
  const fileRef = useRef<HTMLInputElement>(null)

  // Carga inicial y Realtime
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('rifa_numbers').select('*').order('number')
      if (data) setNumbers(data as RifaNumber[])
      setLoading(false)
    }
    load()

    const channel = supabase.channel('rifa-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rifa_numbers' }, (payload) => {
        setNumbers(prev => prev.map(n => n.id === payload.new.id ? payload.new as RifaNumber : n))
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Gestión Modal
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

  // Submit Formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.file) {
      toast.error('Por favor, completa los campos requeridos.')
      return
    }
    if (!selected || !form.file) return
    
    setSubmitting(true)
    const toastId = toast.loading('Procesando tu reserva...')

    // Bloqueo optimista UI
    setNumbers(prev => prev.map(n => n.id === selected.id ? { ...n, status: 'pending' } : n))

    try {
      const ext = form.file.name.split('.').pop()
      const path = `numero-${selected.number}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(path, form.file)
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

      toast.success('¡Número reservado!', { id: toastId })
      setSuccess(true)
    } catch (err) {
      setNumbers(prev => prev.map(n => n.id === selected.id ? { ...n, status: 'available' } : n))
      toast.error('Error. El número podría haberse ocupado.', { id: toastId })
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Estadísticas
  const stats = {
    available: numbers.filter(n => n.status === 'available').length,
    sold:      numbers.filter(n => n.status === 'sold').length,
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen text-slate-200 p-4 md:p-8 lg:p-12" style={{ background: '#0a0f1e' }}>
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Elegante */}
        <header className="flex flex-col items-center text-center border-b border-slate-800 pb-10">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Ticket size={32} className="text-amber-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tighter">Rifa Tatuaje Gabo Tattooo <span className="text-amber-400"></span></h1>
          <p className="text-slate-400 mt-3 max-w-xl text-base md:text-lg">Participa y llevate un tatuaje. Selecciona tu número de la suerte a continuación y sigue los pasos.</p>
        </header>

        {/* Estadísticas Sobrias */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Disponibles</div>
            <div className="text-4xl font-black text-amber-400">{stats.available}</div>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Vendidos</div>
            <div className="text-4xl font-black text-slate-500">{stats.sold}</div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm border border-slate-800 bg-slate-900/50 p-4 rounded-full max-w-xl mx-auto">
          <span className="flex items-center gap-2.5 text-slate-300"><span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"/>Disponible</span>
          <span className="flex items-center gap-2.5 text-amber-500"><span className="w-3 h-3 rounded-full bg-amber-600 animate-pulse"/>En revisión</span>
          <span className="flex items-center gap-2.5 text-slate-600 line-through"><span className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800"/>Vendido</span>
        </div>

        {/* Grilla Responsiva Pulida */}
        {loading ? (
          <div className="text-center py-20 text-slate-600 font-medium tracking-wide">Cargando grilla de números...</div>
        ) : (
          // Ajuste clave: grid-cols adaptable para celulares (6 cols) hasta escritorio (16 cols)
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2.5 md:gap-3 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            {numbers.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                disabled={n.status !== 'available'}
                title={n.status === 'available' ? 'Disponible' : n.status === 'pending' ? 'En revisión' : 'Vendido'}
                className={`aspect-square rounded-xl border text-base md:text-lg font-bold flex items-center justify-center ${statusStyle(n.status)}`}
              >
                {n.number}
              </button>
            ))}
          </div>
        )}

        <footer className="text-center py-10 border-t border-slate-800 text-slate-700 text-xs">
          Rifa App &copy; 2026
        </footer>
      </div>

      {/* Modal Pulido y Responsivo */}
      {selected && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-800" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl md:text-2xl font-black text-slate-50 tracking-tight">
                {success ? '¡Número Reservado!' : `Reservar Número #${selected.number}`}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-200"><X size={20} /></button>
            </div>

            <div className="p-6">
              {success ? (
                /* Estado Éxito */
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">¡Solicitud recibida correctamente!</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">Tu número <strong>#{selected.number}</strong> está en proceso de revisión. Te confirmaremos por correo o Instagram una vez validado el pago.</p>
                  <button onClick={closeModal} className="mt-8 bg-slate-100 text-slate-950 px-10 py-3 rounded-full font-black hover:bg-white active:scale-95 transition-all text-sm tracking-wide">ENTENDIDO</button>
                </div>
              ) : (
                <>
                  {/* Datos Bancarios Elegantes */}
                  <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4 text-center">Instrucciones de Pago</h3>
                    <p className="text-sm text-slate-300 text-center mb-4">Realiza una transferencia por <strong>{BANK_INFO.monto}</strong> y sube el comprobante.</p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-slate-800 pt-4">
                      {Object.entries({ Banco: BANK_INFO.banco, Titular: BANK_INFO.titular, RUT: BANK_INFO.rut, Cuenta: BANK_INFO.cuenta, Tipo: BANK_INFO.tipo }).map(([k, v]) => (
                        <div key={k} className="contents"><dt className="text-slate-500 font-medium">{k}</dt><dd className="text-slate-200 font-semibold">{v}</dd></div>
                      ))}
                    </dl>
                  </div>

                  {/* Formulario Pulido */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest text-slate-500">Nombre completo *</label>
                      <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" placeholder="Juan Pérez"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest text-slate-500">Email *</label>
                      <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" placeholder="juan@ejemplo.com"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest text-slate-500">Teléfono *</label>
                        <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" placeholder="+56 9..."/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest text-slate-500">Instagram</label>
                        <div className="relative"><span className="absolute left-4 top-3 text-slate-600">@</span><input type="text" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" placeholder="usuario"/></div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest text-slate-500">Comprobante *</label>
                      <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-950 hover:border-slate-700 transition-colors">
                        {form.file ? (
                          <div className="text-sm text-emerald-400 font-semibold flex items-center justify-center gap-2"><CheckCircle size={18} /> {form.file.name}</div>
                        ) : (
                          <div className="text-slate-500 text-sm"><Upload size={24} className="mx-auto mb-2 text-slate-700"/> Haz clic para subir imagen o PDF</div>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" required className="hidden" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                    </div>
                    <button type="submit" disabled={submitting} className="w-full bg-amber-500 text-slate-950 py-4 rounded-xl font-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm tracking-wide mt-2">
                      {submitting ? 'ENVIANDO SOLICITUD...' : 'CONFIRMAR Y ENVIAR COMPROBANTE'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}