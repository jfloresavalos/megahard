'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ExportButtons from '@/components/reportes/ExportButtons'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ProductoAlerta {
  id: string
  nombre: string
  codigo: string
  stockActual: number
  stockMinimo: number
  stockMaximo: number
  categoria: string
  proveedor: string
  diasPendiente: number
  alerta: 'CRITICO' | 'BAJO' | 'NORMAL'
}

export default function StockAlertasReport() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filtroAlerta, setFiltroAlerta] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('')
  const [categorias, setCategorias] = useState<any[]>([])
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
    async function cargarDatos() {
      setLoading(true)
      try {
        const sede = sedeSeleccionada || (session?.user?.sedeId || 'TODAS')
        const res = await fetch(`/api/reportes/stock-alertas?sede=${sede}`)
        const json = await res.json()
        if (json.error) {
          alert('Error: ' + json.error)
          return
        }
        setData(json)
        
        // Extraer categorías únicas
        const cats = [...new Set(json.productos.map((p: any) => p.categoria))]
        setCategorias(cats)
      } catch (error) {
        console.error('Error:', error)
        alert('Error al cargar el reporte')
      } finally {
        setLoading(false)
      }
    }
    cargarDatos()
  }, [sedeSeleccionada, puedeSeleccionarSede])

  useEffect(() => {
    async function cargarSedes() {
      try {
        const res = await fetch('/api/sedes')
        const json = await res.json()
        if (Array.isArray(json)) {
          setSedes(json)
        }
      } catch (error) {
        console.error('Error cargando sedes:', error)
      }
    }
    if (puedeSeleccionarSede) {
      cargarSedes()
    }
  }, [puedeSeleccionarSede])

  const productosFiltrados = data?.productos?.filter((p: any) => {
    const cumpleAlerta = filtroAlerta === 'todos' || p.alerta === filtroAlerta
    const cumpleCategoria = filtroCategoria === 'todas' || p.categoria === filtroCategoria
    return cumpleAlerta && cumpleCategoria
  }) || []

  function exportarPDF() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Reporte de Stock y Alertas', 14, 20)
    doc.setFontSize(11)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 14, 28)
    
    doc.setFontSize(14)
    doc.text(`Productos en Alerta Crítica: ${data.estadisticas.criticos}`, 14, 40)
    doc.text(`Productos con Stock Bajo: ${data.estadisticas.bajos}`, 14, 48)

    if (productosFiltrados.length > 0) {
      autoTable(doc, {
        startY: 58,
        head: [['Código', 'Producto', 'Stock Actual', 'Stock Mín.', 'Alerta']],
        body: productosFiltrados.slice(0, 50).map((p: any) => [
          p.codigo,
          p.nombre,
          p.stockActual,
          p.stockMinimo,
          p.alerta,
        ]),
      })
    }
    
    doc.save(`stock-alertas-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function exportarExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    
    const wsData = [
      ['REPORTE DE STOCK Y ALERTAS'],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`],
      [''],
      ['Código', 'Producto', 'Categoría', 'Stock Actual', 'Stock Mín.', 'Stock Máx.', 'Alerta', 'Días Pendiente'],
      ...(productosFiltrados.map((p: any) => [
        p.codigo,
        p.nombre,
        p.categoria,
        p.stockActual,
        p.stockMinimo,
        p.stockMaximo,
        p.alerta,
        p.diasPendiente
      ]) || []),
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Stock')
    XLSX.writeFile(wb, `stock-alertas-${new Date().toISOString().split('T')[0]}.xlsx`)
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
              background: 'linear-gradient(to right, #fef3c7, #fed7aa)',
              borderRadius: '9999px'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#92400e' }}>⚠️ Stock y Alertas</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Monitoreo de Inventario
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#4b5563', margin: 0 }}>
              Productos bajo stock mínimo y alertas automáticas
            </p>
          </div>
        </div>

        {/* Estadísticas Rápidas */}
        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(to bottom right, #dc2626, #ef4444)',
              borderRadius: '0.75rem',
              color: 'white',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(220, 38, 38, 0.2)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                🚨 Críticos
              </p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'black', margin: 0 }}>
                {data.estadisticas.criticos}
              </h3>
            </div>

            <div style={{
              background: 'linear-gradient(to bottom right, #f59e0b, #fbbf24)',
              borderRadius: '0.75rem',
              color: 'white',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                ⚠️ Bajos
              </p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'black', margin: 0 }}>
                {data.estadisticas.bajos}
              </h3>
            </div>

            <div style={{
              background: 'linear-gradient(to bottom right, #10b981, #34d399)',
              borderRadius: '0.75rem',
              color: 'white',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                ✓ Normales
              </p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'black', margin: 0 }}>
                {data.estadisticas.normales}
              </h3>
            </div>

            <div style={{
              background: 'linear-gradient(to bottom right, #3b82f6, #60a5fa)',
              borderRadius: '0.75rem',
              color: 'white',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 0.5rem 0' }}>
                📦 Total
              </p>
              <h3 style={{ fontSize: '2.5rem', fontWeight: 'black', margin: 0 }}>
                {data.estadisticas.total}
              </h3>
            </div>
          </div>
        )}

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
            {/* Filtro Alerta */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                🎯 Filtrar por Alerta
              </label>
              <select
                value={filtroAlerta}
                onChange={(e) => setFiltroAlerta(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="todos">📋 Todos los Productos</option>
                <option value="CRITICO">🚨 Críticos</option>
                <option value="BAJO">⚠️ Stock Bajo</option>
                <option value="NORMAL">✓ Normales</option>
              </select>
            </div>

            {/* Filtro Categoría */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.75rem' }}>
                🏷️ Categoría
              </label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#f59e0b'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <option value="todas">📂 Todas las Categorías</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>📂 {cat}</option>
                ))}
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
              <div style={{ width: '100%' }}>
                <ExportButtons onExportPDF={exportarPDF} onExportExcel={exportarExcel} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        {productosFiltrados.length > 0 ? (
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
                📦 Productos ({productosFiltrados.length})
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Alerta</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Código</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Producto</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Categoría</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Stock Actual</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Mínimo</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Máximo</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' }}>Días Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((prod: any, idx: number) => {
                    const colorAlerta = prod.alerta === 'CRITICO' ? '#dc2626' : prod.alerta === 'BAJO' ? '#f59e0b' : '#10b981'
                    const emojiAlerta = prod.alerta === 'CRITICO' ? '🚨' : prod.alerta === 'BAJO' ? '⚠️' : '✓'
                    
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
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            backgroundColor: colorAlerta,
                            color: 'white',
                            fontSize: '0.75rem'
                          }}>
                            {emojiAlerta} {prod.alerta}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563', fontWeight: 'bold' }}>
                          {prod.codigo}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                          {prod.nombre}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                          {prod.categoria}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
                          {prod.stockActual}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563', textAlign: 'center' }}>
                          {prod.stockMinimo}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563', textAlign: 'center' }}>
                          {prod.stockMaximo}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>
                          {prod.diasPendiente > 0 ? `${prod.diasPendiente}d` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '2px dashed #d1d5db'
          }}>
            <p style={{ fontSize: '3.5rem', margin: '0 0 1rem 0' }}>✓</p>
            <p style={{ color: '#4b5563', fontSize: '1.125rem', fontWeight: '500', margin: 0 }}>
              No hay productos que coincidan con los filtros
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
