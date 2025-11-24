'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
export default function ReporteCajaDiaria() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sedes, setSedes] = useState<any[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [sedeSeleccionada, setSedeSeleccionada] = useState('')
  const [sedeName, setSedeName] = useState('')

  const puedeSeleccionarSede = session?.user?.rol === 'admin' || session?.user?.rol === 'supervisor'

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/sedes')
        const json = await res.json()
        const sedesData = json.sedes || json
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
        console.error('Error:', error)
        setLoading(false)
      }
    }
    if (session) init()
  }, [session, puedeSeleccionarSede])

  useEffect(() => {
    async function cargarDatos() {
      if (!sedeSeleccionada) return
      setLoading(true)
      try {
        const res = await fetch(`/api/reportes/caja-diaria?fecha=${fecha}&sedeId=${sedeSeleccionada}`)
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
  }, [fecha, sedeSeleccionada])

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Reporte de Caja Diaria', 14, 20)
    doc.setFontSize(11)
    doc.text(`Fecha: ${new Date(fecha).toLocaleDateString('es-PE')}`, 14, 28)
    doc.text(`Sucursal: ${sedeName}`, 14, 34)
    doc.setFontSize(14)
    doc.text(`Total: S/ ${data.estadisticas.totalGeneral.toFixed(2)}`, 14, 46)
    if (data.ventas.length > 0) {
      autoTable(doc, {
        startY: 56,
        head: [['N° Venta', 'Hora', 'Total']],
        body: data.ventas.map((v: any) => [
          v.numeroVenta,
          new Date(v.fecha).toLocaleTimeString('es-PE'),
          `S/ ${Number(v.total).toFixed(2)}`,
        ]),
      })
    }
    doc.save(`caja-${sedeName}-${fecha}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const wsData = [
      ['REPORTE DE CAJA DIARIA'],
      ['Fecha:', fecha],
      ['Sucursal:', sedeName],
      [''],
      ['Total:', data.estadisticas.totalGeneral.toFixed(2)],
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
    XLSX.writeFile(wb, `caja-${sedeName}-${fecha}.xlsx`)
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
          <div style={{
            display: 'inline-block',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '9999px',
            marginBottom: '1rem'
          }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{
                display: 'inline-block',
                marginBottom: '1rem',
                padding: '0.5rem 1rem',
                background: 'linear-gradient(to right, #dbeafe, #e0e7ff)',
                borderRadius: '9999px'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e40af' }}>💰 Caja Diaria</span>
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
                Reporte de Caja
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>Resumen completo de ingresos diarios</p>
            </div>
            <div style={{ fontSize: '3.5rem', opacity: 0.15, display: 'none' }}>💵</div>
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
            {/* Input Fecha */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                📅 Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Select Sede */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                🏪 Sucursal
              </label>
              {puedeSeleccionarSede ? (
                <select
                  value={sedeSeleccionada}
                  onChange={(e) => {
                    setSedeSeleccionada(e.target.value)
                    if (e.target.value === 'TODAS') {
                      setSedeName('CONSOLIDADO')
                    } else {
                      const sede = sedes.find(s => s.id === e.target.value)
                      setSedeName(sede?.nombre || '')
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <option value="TODAS">📊 Todas las Sucursales</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      🏪 {sede.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #bbf7d0',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f0fdf4',
                  color: '#374151',
                  fontWeight: '500',
                  boxSizing: 'border-box'
                }}>
                  🏪 {sedeName}
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {data && (
                <div style={{ width: '100%' }}>
                  <ExportButtons onExportPDF={exportarPDF} onExportExcel={exportarExcel} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenido */}
        {data ? (
          <>
            {/* Total General */}
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '1rem',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              marginBottom: '2rem'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom right, #10b981, #0ea5e9, #a855f7)'
              }}></div>
              <div style={{
                position: 'relative',
                padding: '2rem 3rem',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <p style={{ color: '#a7f3d0', fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>
                    Total del Día
                  </p>
                  <h2 style={{ fontSize: '3.75rem', fontWeight: 'black', margin: '0 0 1rem 0' }}>
                    S/ {data.estadisticas.totalGeneral.toFixed(2)}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', backdropFilter: 'blur(4px)' }}>
                      {data.estadisticas.cantidadVentas} ventas
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', backdropFilter: 'blur(4px)' }}>
                      {data.estadisticas.cantidadServiciosEntregados} servicios
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', backdropFilter: 'blur(4px)' }}>
                      {data.estadisticas.cantidadAdelantos} adelantos
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '5rem', opacity: 0.2, flexShrink: 0 }}>💰</div>
              </div>
            </div>

            {/* Tarjetas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Card Ventas */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#3b82f6',
                padding: '1.5rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Ventas</p>
                    <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                      S/ {data.estadisticas.totalVentas.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem', fontSize: '1.25rem' }}>🛒</div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  {data.estadisticas.cantidadVentas} transacciones
                </div>
              </div>

              {/* Card Servicios */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#10b981',
                padding: '1.5rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Servicios Entregados</p>
                    <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                      S/ {data.estadisticas.totalServiciosEntregados.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', borderRadius: '0.5rem', fontSize: '1.25rem' }}>🔧</div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  {data.estadisticas.cantidadServiciosEntregados} entregados
                </div>
              </div>

              {/* Card Adelantos */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                borderLeftWidth: '4px',
                borderLeftColor: '#a855f7',
                padding: '1.5rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>Adelantos</p>
                    <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0 0 0' }}>
                      S/ {data.estadisticas.totalAdelantos.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f3e8ff', borderRadius: '0.5rem', fontSize: '1.25rem' }}>💵</div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  {data.estadisticas.cantidadAdelantos} adelantos
                </div>
              </div>
            </div>

            {/* Métodos de Pago */}
            {Object.keys(data.estadisticas.porMetodoPago).length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📊 Métodos de Pago
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {Object.entries(data.estadisticas.porMetodoPago).map(([metodo, monto]: any) => (
                    <div key={metodo} style={{
                      background: 'linear-gradient(to bottom right, #f9fafb, #f3f4f6)',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#4b5563', fontWeight: 'medium', margin: '0 0 0.5rem 0' }}>
                        {metodo}
                      </p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        S/ {monto.toFixed(2)}
                      </p>
                      <div style={{ marginTop: '0.75rem', width: '100%', backgroundColor: '#d1d5db', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
                        <div style={{
                          background: 'linear-gradient(to right, #4f46e5, #9333ea)',
                          height: '6px',
                          borderRadius: '9999px',
                          width: `${(monto / data.estadisticas.totalVentas) * 100}%`
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de Ventas */}
            {data.ventas.length > 0 && (
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
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📋 Ventas del Día
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          N° Venta
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Hora
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Cliente
                        </th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ventas.map((venta: any, idx: number) => (
                        <tr
                          key={venta.id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'; }}
                        >
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', whiteSpace: 'nowrap' }}>
                            {venta.numeroVenta}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            {new Date(venta.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
                            {venta.cliente?.nombre || 'Público'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            S/ {Number(venta.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sin Datos */}
            {data.ventas.length === 0 && data.serviciosEntregados.length === 0 && data.serviciosAdelanto.length === 0 && (
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
                  No hay movimientos en esta fecha
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem', margin: 0 }}>
                  Intenta seleccionar otra fecha o sucursal
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '2px dashed #d1d5db'
          }}>
            <p style={{ color: '#4b5563', fontSize: '1.125rem' }}>Selecciona una fecha para ver el reporte</p>
          </div>
        )}
      </div>
    </div>
  )
}
