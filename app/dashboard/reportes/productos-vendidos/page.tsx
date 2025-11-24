'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function ProductosVendidosReport() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('este_mes')
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7))
  const [topN, setTopN] = useState(10)
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
        const res = await fetch(`/api/reportes/productos-vendidos?periodo=${periodo}&mes=${mes}&top=${topN}&sede=${sedeSeleccionada}`)
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
  }, [periodo, mes, topN, sedeSeleccionada])

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Productos Más Vendidos', 14, 20)
    doc.setFontSize(11)
    doc.text(`Período: ${periodo}`, 14, 28)
    
    doc.setFontSize(14)
    doc.text(`Total de Ingresos: S/ ${data.totales.ingresos.toFixed(2)}`, 14, 40)
    doc.text(`Cantidad Total Vendida: ${data.totales.cantidad} unidades`, 14, 48)

    if (data.productos && data.productos.length > 0) {
      autoTable(doc, {
        startY: 58,
        head: [['Ranking', 'Producto', 'Cantidad', 'Ingresos', '% del Total']],
        body: data.productos.map((p: any, idx: number) => [
          idx + 1,
          p.nombre,
          p.cantidad,
          `S/ ${Number(p.ingresos).toFixed(2)}`,
          `${((p.ingresos / data.totales.ingresos) * 100).toFixed(1)}%`,
        ]),
      })
    }
    
    doc.save(`productos-vendidos-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['PRODUCTOS MÁS VENDIDOS'],
      [`Período: ${periodo}`],
      [''],
      ['Ranking', 'Producto', 'Cantidad', 'Ingresos', '% Participación'],
      ...(data.productos?.map((p: any, idx: number) => [
        idx + 1,
        p.nombre,
        p.cantidad,
        p.ingresos,
        (p.ingresos / data.totales.ingresos) * 100
      ]) || []),
      [''],
      ['TOTAL', '', data.totales.cantidad, data.totales.ingresos, '100%'],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, `productos-vendidos-${new Date().toISOString().split('T')[0]}.xlsx`)
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
              background: 'linear-gradient(to right, #dbeafe, #bfdbfe)',
              borderRadius: '9999px'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1e40af' }}>📈 Productos Más Vendidos</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Top de Ventas
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>
              Análisis de rotación y tendencias de venta
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
            {/* Período */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                📅 Período
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="hoy">📅 Hoy</option>
                <option value="esta_semana">📆 Esta Semana</option>
                <option value="este_mes">📊 Este Mes</option>
                <option value="mes_anterior">📈 Mes Anterior</option>
                <option value="ultimo_trimestre">🎯 Último Trimestre</option>
              </select>
            </div>

            {/* Mes */}
            {(periodo === 'este_mes' || periodo === 'mes_anterior') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                  🗓️ Selecciona Mes
                </label>
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
              </div>
            )}

            {/* Top N */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                🏆 Mostrar Top
              </label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
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
                background: 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  💰 Ingresos Totales
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: 0 }}>
                  S/ {data.totales.ingresos.toFixed(2)}
                </h3>
              </div>

              <div style={{
                background: 'linear-gradient(to bottom right, #10b981, #059669)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  📦 Unidades Vendidas
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: 0 }}>
                  {data.totales.cantidad}
                </h3>
              </div>

              <div style={{
                background: 'linear-gradient(to bottom right, #f59e0b, #d97706)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  🎯 Ticket Promedio
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: 0 }}>
                  S/ {(data.totales.ingresos / Math.max(1, data.productos.length)).toFixed(2)}
                </h3>
              </div>
            </div>

            {/* Tabla Top Productos */}
            {data.productos && data.productos.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem 2rem',
                  borderBottom: '1px solid #e5e7eb',
                  background: 'linear-gradient(to right, #f9fafb, #f3f4f6)'
                }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                    🏆 Top {Math.min(topN, data.productos.length)} Productos
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', width: '60px' }}>Ranking</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Producto</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Cantidad</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Ingresos</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>% Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.productos.map((prod: any, idx: number) => {
                        const porcentaje = (prod.ingresos / data.totales.ingresos) * 100
                        const medalColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#d1d5db' : idx === 2 ? '#f97316' : '#e5e7eb'
                        const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'
                        
                        return (
                          <tr
                            key={prod.id}
                            style={{
                              borderBottom: '1px solid #e5e7eb',
                              backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'; }}
                          >
                            <td style={{ padding: '1rem 1.5rem', fontSize: '1.25rem', fontWeight: 'black', textAlign: 'center', color: '#111827' }}>
                              {medalEmoji}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                              {prod.nombre}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'center' }}>
                              {prod.cantidad}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>
                              S/ {Number(prod.ingresos).toFixed(2)}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'right' }}>
                              {porcentaje.toFixed(1)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Barra de distribución */}
            {data.productos && data.productos.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '2rem',
                marginTop: '2rem'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 1.5rem 0' }}>
                  📊 Participación en Ingresos
                </h3>
                <div style={{ display: 'flex', height: '32px', borderRadius: '9999px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                  {data.productos.slice(0, Math.min(5, data.productos.length)).map((prod: any, idx: number) => {
                    const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                    const porcentaje = (prod.ingresos / data.totales.ingresos) * 100
                    return (
                      <div
                        key={prod.id}
                        style={{
                          width: `${porcentaje}%`,
                          backgroundColor: colores[idx],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                        }}
                        title={`${prod.nombre}: ${porcentaje.toFixed(1)}%`}
                      >
                        {porcentaje > 8 ? `${porcentaje.toFixed(0)}%` : ''}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    <strong>Concentración:</strong> Los top 3 productos representan {(data.productos.slice(0, 3).reduce((sum: number, p: any) => sum + (p.ingresos / data.totales.ingresos), 0) * 100).toFixed(1)}% de los ingresos
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
