'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, RifaNumber } from '../utils/supabase'
import { X, Upload, CheckCircle, Clock, Ban } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Datos bancarios estáticos ───────────────────────────────────────────
const BANK_INFO = {
  banco: 'Banco Estado',
  titular: 'Juan Pérez González',
  rut: '12.345.678-9',
  cuenta: '123456789',
  tipo: 'Cuenta Corriente',
  email: 'juan.perez@gmail.com',
  monto: '$5.000',
}

// ─── Colores por estado ───────────────────────────────────────────────────
function statusStyle(status: string) {
  if (status === 'available')
    return 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer active:scale-95 transition-transform'
  if (status === 'pending')
    return 'bg-amber-50 border-amber-300 text-amber-700 line-through cursor-not-allowed opacity-70'
  return 'bg-red-50 border-red-300 text-red-700 line-through cursor-not-allowed opacity-60'
}

// ─── Tipos ────────────────────────────────────────────────────────────────
type FormData = {
  name: string; email: string; phone: string; instagram: string; file: File | null
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function Home() {
  const [numbers, setNumbers] = useState<RifaNumber[]>([])
  const [selected, setSelected] = useState<RifaNumber | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', instagram: '', file: null })
  const fileRef = useRef<HTMLInputElement>(null)

  // Carga inicial
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

    // Suscripción Realtime — auto-bloqueo optimista
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

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Abrir modal
  function handleClick(n: RifaNumber) {
    if (n.status !== 'available') return
    setSelected(n)
    setForm({ name: '', email: '', phone: '', instagram: '', file: null })
    setSuccess(false)
  }

  // Cerrar modal
  function closeModal() {
    if (submitting) return
    setSelected(null)
    setSuccess(false)
  }

  // Submit del formulario
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Validación de campos obligatorios
    if (!form.name || !form.email || !form.phone || !form.file) {
      toast.error('Por favor, completa todos los campos obligatorios.')
      return
    }

    if (!selected || !form.file) return
    setSubmitting(true)
    const toastId = toast.loading('Reservando tu número...')

    // 1. Bloqueo optimista: actualizar UI inmediatamente
    setNumbers(prev =>
      prev.map(n => n.id === selected.id ? { ...n, status: 'pending' } : n)
    )

    try {
      // 2. Subir comprobante al bucket
      const ext = form.file.name.split('.').pop()
      const path = `numero-${selected.number}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, form.file)
      if (uploadError) throw uploadError

      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)

      // 4. Actualizar fila en BD
      const { error: dbError } = await supabase
        .from('rifa_numbers')
        .update({
          status: 'pending',
          buyer_name: form.name,
          buyer_email: form.email,
          buyer_phone: form.phone,
          buyer_instagram: form.instagram, // NUEVO CAMPO
          receipt_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id)
        .eq('status', 'available') // ← seguridad: solo si sigue available
      if (dbError) throw dbError

      toast.success('¡Número reservado con éxito!', { id: toastId })
      setSuccess(true)
    } catch (err) {
      // Revertir optimistic update si falla
      setNumbers(prev =>
        prev.map(n => n.id === selected.id ? { ...n, status: 'available' } : n)
      )
      toast.error('Error al procesar tu reserva. Por favor intenta nuevamente.', { id: toastId })
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Estadísticas ──────────────────────────────────────────────────────
  const stats = {
    available: numbers.filter(n => n.status === 'available').length,
    pending:   numbers.filter(n => n.status === 'pending').length,
    sold:      numbers.filter(n => n.status === 'sold').length,
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rifa Solidaria 2024</h1>
          <p className="text-gray-500">Selecciona tu número y sigue las instrucciones para reservarlo.</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.available}</div>
            <div className="text-xs text-gray-500 mt-1">Disponibles</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
            <div className="text-xs text-gray-500 mt-1">En revisión</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.sold}</div>
            <div className="text-xs text-gray-500 mt-1">Vendidos</div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300 inline-block"/>Disponible</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 inline-block"/>En revisión</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-red-100 border border-red-300 inline-block"/>Vendido</span>
        </div>

        {/* Grilla de números */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando números...</div>
        ) : (
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {numbers.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                disabled={n.status !== 'available'}
                title={
                  n.status === 'pending' ? `En revisión` :
                  n.status === 'sold' ? 'Vendido' : 'Disponible'
                }
                className={`
                  aspect-square rounded-lg border text-sm font-medium
                  flex items-center justify-center
                  ${statusStyle(n.status)}
                `}
              >
                {n.number}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">
                {success ? '¡Número reservado!' : `Reservar número #${selected.number}`}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                /* Estado de éxito */
                <div className="text-center py-4">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">¡Reserva recibida!</h3>
                  <p className="text-gray-500 text-sm">
                    Tu número <strong>#{selected.number}</strong> está en revisión.
                    Te contactaremos a <strong>{form.email}</strong> para confirmar.
                  </p>
                  <button onClick={closeModal} className="mt-6 bg-emerald-500 text-white px-8 py-2 rounded-lg hover:bg-emerald-600">
                    Listo
                  </button>
                </div>
              ) : (
                <>
                  {/* Datos bancarios */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-3">Datos para la transferencia</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {Object.entries({
                        Banco: BANK_INFO.banco,
                        Titular: BANK_INFO.titular,
                        RUT: BANK_INFO.rut,
                        Cuenta: BANK_INFO.cuenta,
                        Tipo: BANK_INFO.tipo,
                        Email: BANK_INFO.email,
                        Monto: BANK_INFO.monto,
                      }).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-blue-600 font-medium">{k}</dt>
                          <dd className="text-blue-900 font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Formulario */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre completo *</label>
                      <input
                        type="text" required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email" required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="juan@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Teléfono *</label>
                      <input
                        type="tel" required
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                    
                    {/* CAMPO DE INSTAGRAM AÑADIDO AQUÍ */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Instagram (Opcional)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">@</span>
                        <input
                          type="text"
                          value={form.instagram}
                          onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                          className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          placeholder="usuario"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Comprobante de transferencia *</label>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {form.file ? (
                          <div className="text-sm text-emerald-600 font-medium">
                            <CheckCircle className="w-5 h-5 inline mr-2" />
                            {form.file.name}
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Haz clic para subir imagen o PDF</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={fileRef} type="file" accept="image/*,.pdf" required
                        className="hidden"
                        onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                      />
                    </div>
                    <button
                      type="submit" disabled={submitting}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Enviando...' : 'Confirmar reserva'}
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