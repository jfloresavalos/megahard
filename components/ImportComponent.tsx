"use client"

import { useState, useEffect } from "react"
import Toast from "@/components/Toast"

interface ImportComponentProps {
  titulo: string
  plantillaUrl: string
  importUrl: string
  tipoArchivo: 'productos' | 'categorias' | 'subcategorias'
}

interface ImportResult {
  exitosos: number
  errores: Array<{ fila: number; [key: string]: any; error: string }>
  duplicados?: Array<{ fila: number; [key: string]: any }>
}

interface PreviewData {
  filas: Record<string, any>[]
  totalFilas: number
  columnas: string[]
  duplicados?: Array<{ producto: string; filas: number[] }>
  advertencias?: string[]
}

export default function ImportComponent({
  titulo,
  plantillaUrl,
  importUrl,
  tipoArchivo
}: ImportComponentProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mostrandoPreview, setMostrandoPreview] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [resultado, setResultado] = useState<ImportResult | null>(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [sedes, setSedes] = useState<Array<{id: string; nombre: string}>>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('')
  const [cargandoSedes, setCargandoSedes] = useState(true)
  const [toast, setToast] = useState<{
    mostrar: boolean
    mensaje: string
    tipo: 'success' | 'error' | 'warning' | 'info'
  }>({ mostrar: false, mensaje: '', tipo: 'info' })

  // Cargar sedes al montar el componente
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const response = await fetch('/api/sedes')
        const data = await response.json()
        if (data.success && Array.isArray(data.sedes)) {
          const sedesFormateadas = data.sedes.map((sede: any) => ({
            id: sede.id,
            nombre: sede.nombre
          }))
          setSedes(sedesFormateadas)
          if (sedesFormateadas.length > 0) {
            setSedeSeleccionada(sedesFormateadas[0].id)
          }
        }
      } catch (error) {
        console.error('Error cargando sedes:', error)
        mostrarToast('Error al cargar sedes', 'error')
      } finally {
        setCargandoSedes(false)
      }
    }
    cargarSedes()
  }, [])

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ mostrar: true, mensaje, tipo })
  }

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        mostrarToast('Solo se aceptan archivos Excel (.xlsx, .xls)', 'error')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        mostrarToast('El archivo no puede exceder 5MB', 'error')
        return
      }
      setArchivo(file)
      setMostrandoPreview(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f9ff'
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'white'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'white'
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const input = document.querySelector(`input[data-import="${tipoArchivo}"]`) as HTMLInputElement
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleArchivoChange({
          target: input
        } as any)
      }
    }
  }

  const descargarPlantilla = async () => {
    try {
      const response = await fetch(plantillaUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `plantilla-${tipoArchivo}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      mostrarToast('Plantilla descargada correctamente', 'success')
    } catch (error) {
      mostrarToast('Error al descargar plantilla', 'error')
    }
  }

  const mostrarPreview = async () => {
    if (!archivo) {
      mostrarToast('Selecciona un archivo primero', 'warning')
      return
    }

    setCargando(true)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setPreview(data)
        setMostrandoPreview(true)
        mostrarToast('Preview cargado', 'success')
      } else {
        mostrarToast(data.error || 'Error al cargar preview', 'error')
      }
    } catch (error) {
      mostrarToast('Error al procesar archivo', 'error')
    } finally {
      setCargando(false)
    }
  }

  const handleImportar = async () => {
    if (!archivo) {
      mostrarToast('Selecciona un archivo primero', 'warning')
      return
    }

    if (!sedeSeleccionada) {
      mostrarToast('Selecciona una sede primero', 'warning')
      return
    }

    setCargando(true)
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('sedeId', sedeSeleccionada)

      const response = await fetch(importUrl, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResultado(data.resultado)
        setMostrarResultado(true)
        mostrarToast(data.mensaje, 'success')
        setArchivo(null)
        setMostrandoPreview(false)
      } else {
        mostrarToast(data.error || 'Error en la importación', 'error')
      }
    } catch (error) {
      mostrarToast('Error al procesar archivo', 'error')
    } finally {
      setCargando(false)
    }
  }

  const exportarErroresCSV = () => {
    if (!resultado || resultado.errores.length === 0) {
      mostrarToast('No hay errores para exportar', 'warning')
      return
    }

    // Crear CSV
    const headers = ['Fila', 'Error']
    const rows = resultado.errores.map(e => [e.fila, e.error])
    
    let csv = headers.join(',') + '\n'
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n'
    })

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `errores-importacion-${tipoArchivo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    mostrarToast('Errores exportados a CSV', 'success')
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {toast.mostrar && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast({ ...toast, mostrar: false })}
        />
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          📊 {titulo}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Carga datos masivamente usando un archivo Excel
        </p>
      </div>

      {/* Botón descargar plantilla */}
      <button
        onClick={descargarPlantilla}
        style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#ecfdf5',
          color: '#059669',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Descargar Plantilla
      </button>

      {/* Drag and drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          transition: 'all 0.2s',
          marginBottom: '1.5rem',
          cursor: 'pointer'
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleArchivoChange}
          data-import={tipoArchivo}
          style={{ display: 'none' }}
          id={`file-input-${tipoArchivo}`}
        />
        <label htmlFor={`file-input-${tipoArchivo}`} style={{ cursor: 'pointer', display: 'block' }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            style={{ margin: '0 auto 1rem' }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0' }}>
            {archivo ? `✓ ${archivo.name}` : 'Arrastra tu archivo aquí'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            o haz clic para seleccionar
          </p>
        </label>
      </div>

      {/* Selector de Sede */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          color: '#111827',
          fontSize: '0.95rem'
        }}>
          Selecciona la sede para importar:
        </label>
        <select
          value={sedeSeleccionada}
          onChange={(e) => setSedeSeleccionada(e.target.value)}
          disabled={cargandoSedes || sedes.length === 0}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '1rem',
            backgroundColor: 'white',
            color: '#111827',
            cursor: cargandoSedes ? 'not-allowed' : 'pointer',
            opacity: cargandoSedes ? 0.6 : 1
          }}
        >
          {cargandoSedes ? (
            <option>Cargando sedes...</option>
          ) : sedes.length === 0 ? (
            <option>No hay sedes disponibles</option>
          ) : (
            <>
              <option value="">-- Selecciona una sede --</option>
              <option value="TODAS">📍 TODAS LAS SEDES (distribución automática)</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Botones Preview e Importar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={mostrarPreview}
          disabled={!archivo || cargando}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '0.75rem 1.5rem',
            backgroundColor: archivo && !cargando ? '#8b5cf6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: archivo && !cargando ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '1rem'
          }}
        >
          {cargando ? 'Cargando...' : '👁️ Vista Previa'}
        </button>

        <button
          onClick={handleImportar}
          disabled={!archivo || cargando}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '0.75rem 1.5rem',
            backgroundColor: archivo && !cargando ? '#3b82f6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: archivo && !cargando ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '1rem'
          }}
        >
          {cargando ? 'Importando...' : '⬆️ Importar Datos'}
        </button>
      </div>

      {/* Preview */}
      {mostrandoPreview && preview && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            👁️ Vista Previa (Primeras 5 de {preview.totalFilas} filas)
          </h3>

          {/* Mostrar advertencias de duplicados */}
          {preview.advertencias && preview.advertencias.length > 0 && (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '6px',
              color: '#92400e'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ⚠️ Advertencias - Productos Duplicados:
              </div>
              {preview.advertencias.map((adv, idx) => (
                <div key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {adv}
                </div>
              ))}
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
                Nota: Los productos duplicados dentro del archivo serán detectados. Si importas el mismo producto en archivos diferentes, se actualizará el stock del producto existente.
              </div>
            </div>
          )}

          <div style={{
            overflowX: 'auto',
            backgroundColor: 'white',
            borderRadius: '6px'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb', borderBottom: '1px solid #d1d5db' }}>
                  {preview.columnas.map((col, idx) => (
                    <th key={idx} style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#1f2937'
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.filas.map((fila, idx) => (
                  <tr key={idx} style={{
                    backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {preview.columnas.map((col, colIdx) => (
                      <td key={colIdx} style={{
                        padding: '0.75rem',
                        color: '#374151'
                      }}>
                        {String(fila[col] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setMostrandoPreview(false)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            Cerrar Preview
          </button>
        </div>
      )}

      {/* Resultado */}
      {mostrarResultado && resultado && (
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: resultado.errores.length === 0 ? '#ecfdf5' : '#fef2f2',
          borderRadius: '8px',
          border: `1px solid ${resultado.errores.length === 0 ? '#a7f3d0' : '#fecaca'}`
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: resultado.errores.length === 0 ? '#059669' : '#dc2626' }}>
            {resultado.errores.length === 0 ? '✅ Importación Exitosa' : '⚠️ Importación con Errores'}
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0.5rem 0', color: '#374151' }}>
              <strong>Exitosos:</strong> {resultado.exitosos}
            </p>
            <p style={{ margin: '0.5rem 0', color: '#374151' }}>
              <strong>Errores:</strong> {resultado.errores.length}
            </p>
          </div>

          {resultado.errores.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '6px',
              padding: '1rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#6b7280' }}>
                Detalles de Errores:
              </h4>
              {resultado.errores.map((error, idx) => (
                <div key={idx} style={{
                  padding: '0.75rem',
                  backgroundColor: '#fff5f5',
                  borderLeft: '3px solid #dc2626',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: '#991b1b' }}>
                    Fila {error.fila}
                  </p>
                  <p style={{ margin: '0', color: '#7f1d1d' }}>
                    {error.error}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem',
            flexWrap: 'wrap'
          }}>
            {resultado.errores.length > 0 && (
              <button
                onClick={exportarErroresCSV}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                📥 Exportar Errores CSV
              </button>
            )}
            <button
              onClick={() => setMostrarResultado(false)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.5rem 1rem',
                backgroundColor: '#e5e7eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
