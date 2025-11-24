'use client'

import { useState, useEffect } from 'react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function CobranzaTotalReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tiempoRango, setTiempoRango] = useState('hoy')
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7))

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true)
      try {
        const res = await fetch(`/api/reportes/cobranza-total?rango=${tiempoRango}&mes=${mes}`)
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
  }, [tiempoRango, mes])

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Reporte de Cobranza Total', 14, 20)
    doc.setFontSize(11)
    doc.text(`Período: ${tiempoRango}`, 14, 28)
    
    doc.setFontSize(14)
    doc.text(`Total Cobrado: S/ ${data.totales.cobrado.toFixed(2)}`, 14, 40)
    doc.text(`Pendiente: S/ ${data.totales.pendiente.toFixed(2)}`, 14, 48)
    doc.text(`Efectividad: ${(data.totales.porcentaje * 100).toFixed(1)}%`, 14, 56)

    if (data.detalles && data.detalles.length > 0) {
      autoTable(doc, {
        startY: 66,
        head: [['Tipo', 'Cobrado', 'Pendiente', 'Total']],
        body: data.detalles.map((d: any) => [
          d.tipo,
          `S/ ${Number(d.cobrado).toFixed(2)}`,
          `S/ ${Number(d.pendiente).toFixed(2)}`,
          `S/ ${Number(d.cobrado + d.pendiente).toFixed(2)}`,
        ]),
      })
    }
    
    doc.save(`cobranza-total-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['REPORTE DE COBRANZA TOTAL'],
      [`Período: ${tiempoRango}`],
      [''],
      ['Total Cobrado:', data.totales.cobrado],
      ['Total Pendiente:', data.totales.pendiente],
      ['Total General:', data.totales.cobrado + data.totales.pendiente],
      ['Efectividad:', data.totales.porcentaje],
      [''],
      ['Tipo', 'Cobrado', 'Pendiente', 'Total'],
      ...(data.detalles?.map((d: any) => [
        d.tipo,
        d.cobrado,
        d.pendiente,
        d.cobrado + d.pendiente
      ]) || []),
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranza')
    XLSX.writeFile(wb, `cobranza-total-${new Date().toISOString().split('T')[0]}.xlsx`)
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
              background: 'linear-gradient(to right, #ccfbf1, #99f6e4)',
              borderRadius: '9999px'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#0d9488' }}>💳 Cobranza Total</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Estado General de Cobranza
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>
              Consolidado diario, semanal y mensual
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
            {/* Rango Tiempo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                📅 Período
              </label>
              <select
                value={tiempoRango}
                onChange={(e) => setTiempoRango(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#14b8a6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="hoy">📅 Hoy</option>
                <option value="esta_semana">📆 Esta Semana</option>
                <option value="esta_quincena">📅 Esta Quincena</option>
                <option value="este_mes">📊 Este Mes</option>
                <option value="mes_anterior">📈 Mes Anterior</option>
              </select>
            </div>

            {/* Mes */}
            {tiempoRango === 'este_mes' || tiempoRango === 'mes_anterior' ? (
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#14b8a6'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                />
              </div>
            ) : null}

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

        {/* Tarjetas de Totales */}
        {data && (
          <>
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
                background: 'linear-gradient(to bottom right, #14b8a6, #0d9488, #047857)'
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
                    Estado de Cobranza
                  </p>
                  <h2 style={{ fontSize: '3.75rem', fontWeight: 'black', margin: '0 0 1rem 0' }}>
                    S/ {data.totales.cobrado.toFixed(2)}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', backdropFilter: 'blur(4px)' }}>
                      Cobrado: {(data.totales.porcentaje * 100).toFixed(1)}%
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', backdropFilter: 'blur(4px)' }}>
                      Pendiente: S/ {data.totales.pendiente.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '5rem', opacity: 0.2, flexShrink: 0 }}>💳</div>
              </div>
            </div>

            {/* Tarjetas Detalles */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {data.detalles && data.detalles.map((detalle: any, idx: number) => (
                <div
                  key={detalle.tipo}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    padding: '1.5rem',
                    borderTop: `4px solid ${['#10b981', '#f59e0b', '#3b82f6', '#a855f7'][idx % 4]}`
                  }}
                >
                  <p style={{ color: '#4b5563', fontSize: '0.875rem', fontWeight: 'medium', margin: 0 }}>
                    {detalle.tipo}
                  </p>
                  <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.5rem 0' }}>
                    S/ {Number(detalle.cobrado).toFixed(2)}
                  </h3>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginTop: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    Pendiente: S/ {Number(detalle.pendiente).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Barra de Progreso */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 1.5rem 0' }}>
                📊 Efectividad de Cobranza
              </h3>
              <div style={{
                width: '100%',
                height: '32px',
                backgroundColor: '#e5e7eb',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: `${(data.totales.porcentaje) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(to right, #14b8a6, #0d9488)',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.875rem', color: '#4b5563', fontWeight: 'medium' }}>
                  {(data.totales.porcentaje * 100).toFixed(1)}% Cobrado
                </span>
                <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {((1 - data.totales.porcentaje) * 100).toFixed(1)}% Pendiente
                </span>
              </div>
            </div>

            {/* Tabla Detallada */}
            {data.detalles && data.detalles.length > 0 && (
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
                    📋 Detalles por Tipo
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Tipo</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Cobrado</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Pendiente</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Total</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>% Cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detalles.map((detalle: any, idx: number) => (
                        <tr
                          key={detalle.tipo}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'; }}
                        >
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827' }}>
                            {detalle.tipo}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>
                            S/ {Number(detalle.cobrado).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#f59e0b', textAlign: 'right' }}>
                            S/ {Number(detalle.pendiente).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#3b82f6', textAlign: 'right' }}>
                            S/ {Number(detalle.cobrado + detalle.pendiente).toFixed(2)}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#06b6d4', textAlign: 'right' }}>
                            {((detalle.cobrado / (detalle.cobrado + detalle.pendiente)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
