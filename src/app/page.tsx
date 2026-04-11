'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, RifaNumber } from '../utils/supabase' 
import { X, Upload, CheckCircle, Ticket, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Configuración Visual Elegante con datos de Gabriel ──────────────────
const BANK_INFO = {
  banco: 'Banco Falabella',
  titular: 'Gabriel Rojas', // Actualizado a Gabriel
  rut: '21.853.410-4',      // Asegúrate de cambiar esto por el RUT real de Gabriel
  cuenta: '19840580347',      // Asegúrate de cambiar esto por la cuenta real de Gabriel
  tipo: 'Cuenta Corriente',
  email: 'gaborojasc88@gmail.com', // Actualizado según tu solicitud
  monto: '$3.000 CLP',
}

function statusStyle(status: string) {
  if (status === 'available')
    return 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 hover:border-amber-500 hover:text-amber-400 cursor-pointer active:scale-95 transition-all duration-150'
  if (status === 'pending')
    return 'bg-amber-950 border-amber-800 text-amber-500 line-through cursor-not-allowed opacity-80'
  return 'bg-slate-900 border-slate-800 text-slate-600 line-through cursor-not-allowed opacity-50'
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success(`${field} copiado`)
    setTimeout(() => setCopiedField(null), 2000)
  }

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
      toast.error('Por favor, completa los campos requeridos.')
      return
    }
    if (!selected || !form.file) return
    
    setSubmitting(true)
    const toastId = toast.loading('Procesando tu reserva...')

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
      toast.error('Error al procesar la reserva.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    available: numbers.filter(n => n.status === 'available').length,
    sold:      numbers.filter(n => n.status === 'sold').length,
  }

  return (
    <main className="min-h-screen text-slate-200 p-4 md:p-8 lg:p-12" style={{ background: '#0a0f1e' }}>
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center border-b border-slate-800 pb-10">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <Ticket size={32} className="text-amber-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tighter">Gran Rifa <span className="text-amber-400">Solidaria</span></h1>
          <p className="text-slate-400 mt-3 max-w-xl">Selecciona tu número, realiza la transferencia y sube tu comprobante para participar.</p>
        </header>

        {/* Estadísticas */}
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

        {/* Grilla */}
        {loading ? (
          <div className="text-center py-20 text-slate-600 font-medium tracking-wide">Cargando grilla de números...</div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2.5 md:gap-3 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            {numbers.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                disabled={n.status !== 'available'}
                className={`aspect-square rounded-xl border text-base md:text-lg font-bold flex items-center justify-center ${statusStyle(n.status)}`}
              >
                {n.number}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl md:text-2xl font-black text-slate-50 tracking-tight">
                {success ? '¡Número Reservado!' : `Reservar Número #${selected.number}`}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-200"><X size={20} /></button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                  <h3 className="text-lg font-bold text-slate-100 mb-2">¡Solicitud enviada!</h3>
                  <p className="text-slate-400 text-sm">Tu número <strong>#{selected.number}</strong> está siendo validado. Te avisaremos pronto.</p>
                  <button onClick={closeModal} className="mt-8 bg-slate-100 text-slate-950 px-10 py-3 rounded-full font-black">ENTENDIDO</button>
                </div>
              ) : (
                <>
                  {/* Datos Bancarios con Copiado */}
                  <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 mb-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 text-center">Datos de Gabriel</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Titular', value: BANK_INFO.titular },
                        { label: 'RUT', value: BANK_INFO.rut, copyable: true },
                        { label: 'Cuenta', value: BANK_INFO.cuenta, copyable: true },
                        { label: 'Banco', value: BANK_INFO.banco },
                        { label: 'Email', value: BANK_INFO.email }
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">{item.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-semibold">{item.value}</span>
                            {item.copyable && (
                              <button 
                                onClick={() => copyToClipboard(item.value, item.label)}
                                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-amber-400"
                              >
                                {copiedField === item.label ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm" placeholder="Nombre completo *"/>
                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm" placeholder="Email *"/>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="tel" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm" placeholder="Teléfono *"/>
                      <input type="text" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm" placeholder="Instagram (@)"/>
                    </div>
                    <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-950">
                      {form.file ? <div className="text-emerald-400 font-semibold">{form.file.name}</div> : <div className="text-slate-500 text-sm">Sube tu comprobante *</div>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" required className="hidden" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                    <button type="submit" disabled={submitting} className="w-full bg-amber-500 text-slate-950 py-4 rounded-xl font-black hover:bg-amber-400 disabled:opacity-50">
                      {submitting ? 'ENVIANDO...' : 'CONFIRMAR Y ENVIAR'}
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