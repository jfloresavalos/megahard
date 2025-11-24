'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface CobranzaSede {
  sede: string
  totalCobrado: number
  totalPendiente: number
  totalCreado: number
  porcentajeCobrado: number
  ventasContado: number
  ventasCredito: number
  serviciosCobrado: number
  serviciosPendiente: number
}

export default function CobranzaSedeReport() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
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
        const res = await fetch(`/api/reportes/cobranza-sede?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}${sedeParam}`)
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
    doc.text('Reporte de Cobranza por Sede', 14, 20)
    doc.setFontSize(11)
    doc.text(`Período: ${new Date(fechaInicio).toLocaleDateString('es-PE')} - ${new Date(fechaFin).toLocaleDateString('es-PE')}`, 14, 28)
    
    if (data.sedes && data.sedes.length > 0) {
      autoTable(doc, {
        startY: 36,
        head: [['Sede', 'Cobrado', 'Pendiente', 'Créditos', '% Cobrado']],
        body: data.sedes.map((s: any) => [
          s.sede,
          `S/ ${Number(s.totalCobrado).toFixed(2)}`,
          `S/ ${Number(s.totalPendiente).toFixed(2)}`,
          `S/ ${Number(s.totalCreado).toFixed(2)}`,
          `${(s.porcentajeCobrado * 100).toFixed(1)}%`,
        ]),
        foot: [
          [
            'TOTAL',
            `S/ ${data.totales.cobrado.toFixed(2)}`,
            `S/ ${data.totales.pendiente.toFixed(2)}`,
            `S/ ${data.totales.creditos.toFixed(2)}`,
            `${(data.totales.porcentaje * 100).toFixed(1)}%`,
          ]
        ]
      })
    }
    doc.save(`cobranza-sede-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['REPORTE DE COBRANZA POR SEDE'],
      [`Período: ${new Date(fechaInicio).toLocaleDateString('es-PE')} - ${new Date(fechaFin).toLocaleDateString('es-PE')}`],
      [''],
      ['Sede', 'Cobrado', 'Pendiente', 'Créditos', '% Cobrado'],
      ...(data.sedes?.map((s: any) => [
        s.sede,
        s.totalCobrado,
        s.totalPendiente,
        s.totalCreado,
        s.porcentajeCobrado
      ]) || []),
      [''],
      ['TOTAL', data.totales.cobrado, data.totales.pendiente, data.totales.creditos, data.totales.porcentaje],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranza')
    XLSX.writeFile(wb, `cobranza-sede-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '1rem', backgroundColor: 'white', borderRadius: '9999px', marginBottom: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #dbeafe',
              borderTop: '4px solid #2563eb',
              borderRadius: '9999px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>Cargando reporte...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe, #f8fafc)',
      padding: '3rem 1.5rem'
    }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div>
            <div style={{
              display: 'inline-block',
              marginBottom: '1rem',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(to right, #fbcfe8, #fce7f3)',
              borderRadius: '9999px'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#be185d' }}>🏪 Cobranza por Sede</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Reporte de Cobranza
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>
              Análisis de pagos y saldos pendientes por sucursal
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem'
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
                onFocus={(e) => { e.currentTarget.style.borderColor = '#ec4899'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
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
                onFocus={(e) => { e.currentTarget.style.borderColor = '#ec4899'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
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
        </div>

        {/* Totales */}
        {data && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#10b981',
                padding: '1.5rem'
              }}>
                <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Total Cobrado</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                  S/ {data.totales.cobrado.toFixed(2)}
                </h3>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#f59e0b',
                padding: '1.5rem'
              }}>
                <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Pendiente de Cobro</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                  S/ {data.totales.pendiente.toFixed(2)}
                </h3>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#3b82f6',
                padding: '1.5rem'
              }}>
                <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Total en Créditos</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                  S/ {data.totales.creditos.toFixed(2)}
                </h3>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#06b6d4',
                padding: '1.5rem'
              }}>
                <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>% Cobrado</p>
                <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                  {(data.totales.porcentaje * 100).toFixed(1)}%
                </h3>
              </div>
            </div>

            {/* Tabla Sedes */}
            {data.sedes && data.sedes.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.5rem 2rem',
                  borderBottom: '1px solid #e5e7eb',
                  background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'
                }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                    📊 Cobranza por Sucursal
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sede</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobrado</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendiente</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Créditos</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>% Cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sedes.map((sede: any, idx: number) => (
                        <tr
                          key={sede.sede}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'; }}
                        >
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827' }}>
                            🏪 {sede.sede}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>
                            S/ {Number(sede.totalCobrado).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'right' }}>
                            S/ {Number(sede.totalPendiente).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'right' }}>
                            S/ {Number(sede.totalCreado).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#06b6d4', textAlign: 'right' }}>
                            {(sede.porcentajeCobrado * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sin Datos */}
            {(!data.sedes || data.sedes.length === 0) && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '4rem 2rem',
                textAlign: 'center',
                border: '2px dashed #d1d5db'
              }}>
                <p style={{ fontSize: '3.5rem', margin: '0 0 1rem 0' }}>📊</p>
                <p style={{ color: '#4b5563', fontSize: '1.125rem', fontWeight: '500', margin: 0 }}>
                  No hay datos de cobranza en este período
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
