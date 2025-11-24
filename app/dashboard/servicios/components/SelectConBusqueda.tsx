"use client"

import { useState, useRef, useEffect } from "react"

interface SelectConBusquedaProps {
  opciones: any[]
  placeholder: string
  onSeleccionar: (opcion: any) => void
  label: string
}

export default function SelectConBusqueda({
  opciones,
  placeholder,
  onSeleccionar,
  label
}: SelectConBusquedaProps) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setMostrar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const opcionesFiltradas = opciones.filter(op =>
    op.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  // ✅ LIMITAR A 10 RESULTADOS
  const MAX_RESULTADOS = 10
  const opcionesAMostrar = opcionesFiltradas.slice(0, MAX_RESULTADOS)
  const hayMasResultados = opcionesFiltradas.length > MAX_RESULTADOS

  const handleSeleccionar = (opcion: any) => {
    onSeleccionar(opcion)
    setBusqueda('')
    setMostrar(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.5rem', 
        fontWeight: '600', 
        fontSize: '0.95rem',
        color: '#374151'
      }}>
        {label}
      </label>
      
      <input
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value)
          setMostrar(true)
        }}
        onFocus={() => setMostrar(true)} // ✅ Se abre al hacer focus
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '0.75rem',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
          fontSize: '0.95rem',
          outline: 'none'
        }}
      />

      {/* ✅ MOSTRAR SIEMPRE QUE ESTÉ ABIERTO (aunque busqueda esté vacía) */}
      {mostrar && opcionesAMostrar.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
          marginTop: '0.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.2)',
          zIndex: 10000
        }}>
          {opcionesAMostrar.map(opcion => (
            <div
              key={opcion.id}
              onClick={() => handleSeleccionar(opcion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid #e5e7eb',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.95rem',
                color: '#111827',
                marginBottom: opcion.descripcion || opcion.precioSugerido ? '0.25rem' : 0
              }}>
                {opcion.nombre}
              </div>
              {opcion.descripcion && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: '#6b7280',
                  lineHeight: '1.3'
                }}>
                  {opcion.descripcion}
                </div>
              )}
              {opcion.precioSugerido !== undefined && (
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#10b981', 
                  fontWeight: '600', 
                  marginTop: '0.25rem'
                }}>
                  S/ {Number(opcion.precioSugerido).toFixed(2)}
                </div>
              )}
            </div>
          ))}
          
          {/* ✅ MENSAJE DE MÁS RESULTADOS */}
          {hayMasResultados && (
            <div style={{
              padding: '0.75rem 1rem',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              backgroundColor: '#f9fafb',
              borderTop: '2px solid #e5e7eb'
            }}>
              + {opcionesFiltradas.length - MAX_RESULTADOS} resultado(s) más...
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Escribe para refinar la búsqueda
              </div>
            </div>
          )}
        </div>
      )}

      {/* Solo mostrar "No se encontraron" si hay búsqueda Y no hay resultados */}
      {mostrar && busqueda && opcionesFiltradas.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
          marginTop: '0.5rem',
          padding: '1rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.875rem',
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.2)',
          zIndex: 10000
        }}>
          No se encontraron resultados para "{busqueda}"
        </div>
      )}
    </div>
  )
} 