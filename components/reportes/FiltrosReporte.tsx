'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface Sede {
  id: string
  nombre: string
}

interface FiltrosReporteProps {
  onFiltrosChange: (filtros: {
    fechaInicio: string
    fechaFin?: string
    sedeId: string
  }) => void
  mostrarRangoFechas?: boolean
  fechaInicial?: string
}

export default function FiltrosReporte({
  onFiltrosChange,
  mostrarRangoFechas = false,
  fechaInicial = new Date().toISOString().split('T')[0],
}: FiltrosReporteProps) {
  const { data: session } = useSession()
  const [sedes, setSedes] = useState<Sede[]>([])
  const [fechaInicio, setFechaInicio] = useState(fechaInicial)
  const [fechaFin, setFechaFin] = useState(fechaInicial)
  const [sedeSeleccionada, setSedeSeleccionada] = useState('')

  const puedeSeleccionarSede =
    session?.user?.rol === 'admin' || session?.user?.rol === 'supervisor'

  useEffect(() => {
    cargarSedes()
  }, [session])

  async function cargarSedes() {
    try {
      const res = await fetch('/api/sedes')
      const json = await res.json()

      // El API devuelve {success: true, sedes: [...]}
      const sedesData = json.sedes || json
      setSedes(sedesData.filter((s: Sede & { activo: boolean }) => s.activo))

      // Configurar sede inicial según rol
      if (puedeSeleccionarSede) {
        setSedeSeleccionada('TODAS')
      } else if (session?.user?.sedeId) {
        setSedeSeleccionada(session.user.sedeId)
      }
    } catch (error) {
      console.error('Error cargando sedes:', error)
    }
  }

  useEffect(() => {
    if (sedeSeleccionada) {
      onFiltrosChange({
        fechaInicio,
        ...(mostrarRangoFechas && { fechaFin }),
        sedeId: sedeSeleccionada,
      })
    }
  }, [fechaInicio, fechaFin, sedeSeleccionada])

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex gap-4 items-end flex-wrap">
        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {mostrarRangoFechas ? 'Fecha Inicio' : 'Fecha'}
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Fecha Fin (opcional) */}
        {mostrarRangoFechas && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Selector de Sede */}
        {puedeSeleccionarSede ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal
            </label>
            <select
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="TODAS">📊 Todas las Sucursales</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  🏪 {sede.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sucursal
            </label>
            <div className="border border-gray-300 rounded px-3 py-2 bg-gray-50 min-w-[200px]">
              🏪 {sedes.find((s) => s.id === sedeSeleccionada)?.nombre || 'Cargando...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
