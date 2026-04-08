'use client'

import { useEffect, useState } from 'react'
import { supabase, RifaNumber } from '../../utils/supabase' // Corregido: ruta relativa correcta
import { CheckCircle, ExternalLink, Lock, Trash2, RefreshCcw } from 'lucide-react'
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

  async function approve(id: string, num: number) {
    if (!confirm(`¿Confirmar pago del número #${num}?`)) return

    const { error } = await supabase
      .from('rifa_numbers')
      .update({ status: 'sold', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar')
    } else {
      toast.success('Número marcado como VENDIDO')
      loadData()
    }
  }

  async function reject(id: string, num: number) {
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
      toast.success('Registro borrado y número liberado')
      loadData()
    }
  }

  if (!authed) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
      <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
        <div className="text-center">
          <Lock className="mx-auto mb-4 text-amber-400" size={40}/>
          <h1 className="text-xl font-bold">Admin Acceso</h1>
        </div>
        <input type="password" required placeholder="Clave de administración" value={pwd} onChange={e => setPwd(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" />
        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 py-3 rounded-lg font-black transition-colors">ENTRAR</button>
      </form>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Panel de Control</h1>
            <p className="text-sm text-gray-500">Gestión de comprobantes y ventas</p>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''}/> Actualizar
          </button>
        </div>

        {/* SECCIÓN PENDIENTES */}
        <section>
          <h2 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"/> Por Revisar ({pending.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b">
                <tr>
                  <th className="p-4">Num</th>
                  <th className="p-4">Comprador</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Doc</th>
                  <th className="p-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-amber-600 text-lg">#{n.number}</td>
                    <td className="p-4">
                      <div className="font-bold">{n.buyer_name}</div>
                      <div className="text-pink-600 text-xs">{n.buyer_instagram ? `@${n.buyer_instagram}` : 'Sin Instagram'}</div>
                    </td>
                    <td className="p-4 text-gray-500">
                      <div>{n.buyer_phone}</div>
                      <div className="text-[10px]">{n.buyer_email}</div>
                    </td>
                    <td className="p-4">
                      <a href={n.receipt_url || '#'} target="_blank" className="bg-blue-500 text-white p-2 rounded flex items-center justify-center w-8 h-8">
                        <ExternalLink size={16}/>
                      </a>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => approve(n.id, n.number)} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg" title="Aprobar"><CheckCircle size={20}/></button>
                        <button onClick={() => reject(n.id, n.number)} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg" title="Rechazar"><Trash2 size={20}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN VENDIDOS */}
        <section>
          <h2 className="text-lg font-bold text-emerald-600 mb-4">Confirmados / Vendidos ({sold.length})</h2>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden opacity-90">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase text-xs font-bold border-b">
                <tr>
                  <th className="p-4">Num</th>
                  <th className="p-4">Comprador</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sold.map(n => (
                  <tr key={n.id}>
                    <td className="p-4 font-black text-emerald-600 text-lg">#{n.number}</td>
                    <td className="p-4 font-medium">{n.buyer_name}</td>
                    <td className="p-4 text-xs text-gray-500">
                      {n.buyer_instagram && <div className="text-pink-600 font-bold">@{n.buyer_instagram}</div>}
                      {n.buyer_phone}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => reject(n.id, n.number)} className="text-red-400 hover:text-red-600 p-2" title="Revertir a disponible">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}