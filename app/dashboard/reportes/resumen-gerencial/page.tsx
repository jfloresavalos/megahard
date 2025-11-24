'use client'

import { useState, useEffect } from 'react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function ResumenGerencialReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('este_mes')
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7))

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true)
      try {
        const res = await fetch(`/api/reportes/resumen-gerencial?periodo=${periodo}&mes=${mes}`)
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
  }, [periodo, mes])

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Resumen Gerencial', 14, 20)
    doc.setFontSize(11)
    doc.text(`Período: ${periodo}`, 14, 28)
    
    doc.setFontSize(14)
    doc.text(`Total de Ventas: S/ ${data.kpis.totalVentas.toFixed(2)}`, 14, 40)
    doc.text(`Ingresos Totales: S/ ${data.kpis.totalIngresos.toFixed(2)}`, 14, 48)
    doc.text(`Margen: ${(data.kpis.margen * 100).toFixed(2)}%`, 14, 56)
    
    if (data.topProductos && data.topProductos.length > 0) {
      autoTable(doc, {
        startY: 66,
        head: [['Producto', 'Cantidad', 'Ingresos']],
        body: data.topProductos.slice(0, 10).map((p: any) => [
          p.nombre,
          p.cantidad,
          `S/ ${Number(p.ingresos).toFixed(2)}`,
        ]),
      })
    }
    
    doc.save(`resumen-gerencial-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['RESUMEN GERENCIAL'],
      [`Período: ${periodo}`],
      [''],
      ['INDICADORES CLAVE DE DESEMPEÑO (KPIs)'],
      ['Total de Ventas:', data.kpis.totalVentas],
      ['Ingresos Totales:', data.kpis.totalIngresos],
      ['Margen de Ganancia:', data.kpis.margen],
      ['Cantidad de Transacciones:', data.kpis.cantidadTransacciones],
      ['Ticket Promedio:', data.kpis.ticketPromedio],
      [''],
      ['TOP 10 PRODUCTOS'],
      ['Producto', 'Cantidad', 'Ingresos'],
      ...(data.topProductos?.slice(0, 10).map((p: any) => [
        p.nombre,
        p.cantidad,
        p.ingresos
      ]) || []),
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
    XLSX.writeFile(wb, `resumen-gerencial-${new Date().toISOString().split('T')[0]}.xlsx`)
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
              background: 'linear-gradient(to right, #e0e7ff, #ddd6fe)',
              borderRadius: '9999px'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#4c1d95' }}>📋 Resumen Gerencial</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Dashboard Ejecutivo
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>
              KPIs y métricas clave del negocio
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
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="hoy">📅 Hoy</option>
                <option value="esta_semana">📆 Esta Semana</option>
                <option value="este_mes">📊 Este Mes</option>
                <option value="mes_anterior">📈 Mes Anterior</option>
                <option value="este_trimestre">🎯 Este Trimestre</option>
                <option value="este_año">📅 Este Año</option>
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
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

        {/* KPIs Principales */}
        {data && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Total Ventas */}
              <div style={{
                background: 'linear-gradient(to bottom right, #4f46e5, #7c3aed)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(79, 70, 229, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  💰 Total de Ventas
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: '0 0 0.5rem 0' }}>
                  S/ {data.kpis.totalVentas.toFixed(2)}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  {data.kpis.cantidadTransacciones} transacciones
                </p>
              </div>

              {/* Ingresos */}
              <div style={{
                background: 'linear-gradient(to bottom right, #059669, #10b981)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(5, 150, 105, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  📈 Ingresos Totales
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: '0 0 0.5rem 0' }}>
                  S/ {data.kpis.totalIngresos.toFixed(2)}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  Ventas + Servicios + Adelantos
                </p>
              </div>

              {/* Margen */}
              <div style={{
                background: 'linear-gradient(to bottom right, #0891b2, #06b6d4)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(8, 145, 178, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  📊 Margen de Ganancia
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: '0 0 0.5rem 0' }}>
                  {(data.kpis.margen * 100).toFixed(2)}%
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  (Ingresos - Costos) / Ingresos
                </p>
              </div>

              {/* Ticket Promedio */}
              <div style={{
                background: 'linear-gradient(to bottom right, #dc2626, #ef4444)',
                borderRadius: '0.75rem',
                color: 'white',
                padding: '1.75rem',
                boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)'
              }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                  🎯 Ticket Promedio
                </p>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 'black', margin: '0 0 0.5rem 0' }}>
                  S/ {data.kpis.ticketPromedio.toFixed(2)}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  Promedio por transacción
                </p>
              </div>
            </div>

            {/* Top Productos */}
            {data.topProductos && data.topProductos.length > 0 && (
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
                    🏆 Top 10 Productos Vendidos
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Producto</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Cantidad</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Ingresos</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>% Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProductos.map((prod: any, idx: number) => (
                        <tr
                          key={prod.id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'; }}
                        >
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827' }}>
                            {idx + 1}. {prod.nombre}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'right' }}>
                            {prod.cantidad}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>
                            S/ {Number(prod.ingresos).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'right' }}>
                            {((prod.ingresos / data.kpis.totalIngresos) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '2px solid #6366f1',
              padding: '1.75rem'
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.75rem' }}>💡</span>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
                    Análisis e Insights
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4b5563' }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Margen de Ganancia:</strong> {(data.kpis.margen * 100).toFixed(2)}% indica {data.kpis.margen > 0.3 ? 'buena' : data.kpis.margen > 0.1 ? 'aceptable' : 'baja'} rentabilidad
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                      <strong>Ticket Promedio:</strong> S/ {data.kpis.ticketPromedio.toFixed(2)} por transacción
                    </li>
                    <li>
                      <strong>Concentración:</strong> Los top 3 productos representan el {data.topProductos?.slice(0, 3).reduce((sum: number, p: any) => sum + ((p.ingresos / data.kpis.totalIngresos) * 100), 0).toFixed(1) || 0}% de los ingresos
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
