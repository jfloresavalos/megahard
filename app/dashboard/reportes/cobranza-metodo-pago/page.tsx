'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface MetodoPago {
  metodo: string
  monto: number
}

interface ReporteData {
  fechaInicio: string
  fechaFin: string
  sede: string | null
  metodos: MetodoPago[]
  total: number
  cantidad_metodos: number
}

export default function CobranzaMetodoPagoReport() {
  const { data: session } = useSession()
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date()
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    return primero.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('')
  const [sedes, setSedes] = useState<any[]>([])
  const [sedeName, setSedeName] = useState<string>('')

  const puedeSeleccionarSede = session?.user?.rol === 'admin' || session?.user?.rol === 'supervisor'

  // Inicializar sede y cargar sedes
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/sedes')
        const json = await res.json()
        const sedesData = Array.isArray(json) ? json : (json.sedes || json)
        setSedes(sedesData.filter((s: any) => s.activo))

        if (puedeSeleccionarSede) {
          setSedeSeleccionada('TODAS')
          setSedeName('CONSOLIDADO')
        } else if (session?.user?.sedeId) {
          setSedeSeleccionada(session.user.sedeId)
          const sede = sedesData.find((s: any) => s.id === session.user.sedeId)
          setSedeName(sede?.nombre || '')
        }
      } catch (error) {
        console.error('Error cargando sedes:', error)
      }
    }
    if (session) init()
  }, [session, puedeSeleccionarSede])

  useEffect(() => {
    if (!sedeSeleccionada) return
    async function cargarDatos() {
      setLoading(true)
      try {
        const sedeParam = sedeSeleccionada && sedeSeleccionada !== 'TODAS' ? `&sede=${sedeSeleccionada}` : ''
        const res = await fetch(`/api/reportes/cobranza-metodo-pago?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}${sedeParam}`)
        const json = await res.json()
        if (json.error) {
          alert('Error: ' + json.error)
          return
        }
        setData(json)
      } catch (error) {
        console.error('Error:', error)
        alert('Error al cargar el reporte')
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [fechaInicio, fechaFin, sedeSeleccionada])

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Reporte de Cobranza por Método de Pago', 14, 20)
    doc.setFontSize(11)
    doc.text(`Período: ${new Date(fechaInicio).toLocaleDateString('es-PE')} - ${new Date(fechaFin).toLocaleDateString('es-PE')}`, 14, 28)
    doc.text(`Sucursal: ${sedeName}`, 14, 34)
    
    if (data.metodos.length > 0) {
      autoTable(doc, {
        startY: 44,
        head: [['Método de Pago', 'Ingreso (S/)']],
        body: data.metodos.map((m: any) => [
          m.metodo,
          `S/ ${Number(m.monto).toFixed(2)}`,
        ]),
        foot: [
          [
            'TOTAL',
            `S/ ${data.total.toFixed(2)}`,
          ]
        ]
      })
    }
    doc.save(`cobranza-metodo-pago-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['REPORTE DE COBRANZA POR MÉTODO DE PAGO'],
      [`Período: ${new Date(fechaInicio).toLocaleDateString('es-PE')} - ${new Date(fechaFin).toLocaleDateString('es-PE')}`],
      [`Sucursal: ${sedeName}`],
      [''],
      ['Método de Pago', 'Ingreso (S/)'],
      ...(data.metodos?.map((m: any) => [
        m.metodo,
        m.monto
      ]) || []),
      [''],
      ['TOTAL', data.total],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranza')
    XLSX.writeFile(wb, `cobranza-metodo-pago-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>Cargando reporte...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2rem' }}>
          📊 Cobranza por Método de Pago
        </h1>

        {/* Filtros */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
          backgroundColor: '#f3f4f6',
          padding: '1.5rem',
          borderRadius: '0.5rem'
        }}>
          {/* Fecha Inicio */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
              📅 Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
              📅 Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filtro Sede (solo para admin/supervisor) */}
          {puedeSeleccionarSede && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                🏪 Sede
              </label>
              <select
                value={sedeSeleccionada}
                onChange={(e) => setSedeSeleccionada(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#ec4899'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="TODAS">🏪 Todas las Sedes</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>🏪 {sede.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {data && (
              <div style={{ width: '100%' }}>
                <ExportButtons onExportPDF={exportarPDF} onExportExcel={exportarExcel} />
              </div>
            )}
          </div>
        </div>

        {/* Datos */}
        {data && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: '#f0fdf4',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                borderLeft: '4px solid #22c55e'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Total Ingresos</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#22c55e' }}>
                  S/ {data.total.toFixed(2)}
                </p>
              </div>

              <div style={{
                backgroundColor: '#f0f9ff',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                borderLeft: '4px solid #0ea5e9'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Métodos de Pago</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0ea5e9' }}>
                  {data.cantidad_metodos}
                </p>
              </div>
            </div>

            {/* Tabla */}
            {data.metodos.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: '1rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}>
                        Método de Pago
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}>
                        Ingreso (S/)
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#374151'
                      }}>
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.metodos.map((metodo, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb'; }}
                      >
                        <td style={{
                          padding: '1rem',
                          color: '#374151'
                        }}>
                          {metodo.metodo}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'right',
                          color: '#059669',
                          fontWeight: '500'
                        }}>
                          S/ {metodo.monto.toFixed(2)}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'right',
                          color: '#6b7280'
                        }}>
                          {((metodo.monto / data.total) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #e5e7eb', fontWeight: 'bold' }}>
                      <td style={{
                        padding: '1rem',
                        color: '#374151'
                      }}>
                        TOTAL
                      </td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'right',
                        color: '#059669',
                        fontSize: '1.125rem'
                      }}>
                        S/ {data.total.toFixed(2)}
                      </td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'right',
                        color: '#374151'
                      }}>
                        100.0%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                <p>No hay datos para el período seleccionado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
